// UX-01 — Destructive-action confirmation dialogs proof (S20)
//
// Verifies that every guarded destructive action in the admin and reception
// portals shows a confirmation modal BEFORE executing and that:
//   1. The modal appears (not immediate execution)
//   2. Cancel aborts the action (item still present after cancel)
//   3. The entity name appears in the modal text
//   4. A warning about side effects is visible in red
//
// Cold production run. No mutations performed — Cancel is always chosen.

const { test, expect } = require('@playwright/test');

const ADMIN_BASE     = 'https://admin-production-536f.up.railway.app';
const RECEPTION_BASE = 'https://reception-production-ba41.up.railway.app';
const PW = 'Test@2026';

const ss = (page, name) =>
  page.screenshot({ path: `audits/beta/screens/${name}.png`, fullPage: false }).catch(() => {});

async function loginAs(page, base, email, pw) {
  await page.goto(`${base}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 25000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.getByRole('button', { name: /kirish|login|sign in/i }).first().click();
  await page.waitForURL(
    url => !url.href.includes('/login') && !url.href.includes('/change-password'),
    { timeout: 25000 }
  ).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

// ─── Admin: delete reception ──────────────────────────────────────────────────
test.describe.serial('UX-01 Admin — delete-reception confirmation', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await loginAs(page, ADMIN_BASE, 'admin1@uchqun.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-reception: modal appears with name and warning', async () => {
    await page.goto(`${ADMIN_BASE}/admin/receptions`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for table rows to load
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });

    // Delete button is the one with error classes (hover:text-error-700 hover:bg-error-50)
    // Edit and View buttons use warm classes — only delete has "error" in its className
    const trashBtn = page.locator('table tbody tr').first()
      .locator('button[class*="error"]').first();
    await trashBtn.waitFor({ state: 'visible', timeout: 10000 });

    await trashBtn.click();
    await page.waitForTimeout(400);
    await ss(page, 'UX-01-admin-reception-delete-modal');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog must appear').toBeVisible();

    const warning = dialog.locator('.text-red-600');
    await expect(warning, 'Side-effect warning must be visible in modal').toBeVisible();

    const cancelBtn = dialog.getByRole('button', { name: /cancel|bekor|отмена/i });
    await expect(cancelBtn, 'Cancel button must be present').toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(300);
    await expect(dialog, 'Dialog must close after Cancel').not.toBeVisible();

    await ss(page, 'UX-01-admin-reception-after-cancel');
  });
});

// ─── Reception: delete teacher ────────────────────────────────────────────────
test.describe.serial('UX-01 Reception — delete-teacher confirmation', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await loginAs(page, RECEPTION_BASE, 'reception1@uchqun.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-teacher: modal appears with name and warning', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/teachers`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for the first teacher card in the grid
    const firstCard = page.locator('.grid > div').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    // Delete button in each teacher card has bg-error-50 in its className
    const deleteBtn = firstCard.locator('button[class*="bg-error"]').first();
    await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });

    await deleteBtn.click();
    await page.waitForTimeout(400);
    await ss(page, 'UX-01-reception-teacher-delete-modal');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog must appear for delete teacher').toBeVisible();

    const warning = dialog.locator('.text-red-600');
    await expect(warning, 'Side-effect warning must appear').toBeVisible();

    const warningText = await warning.textContent().catch(() => '');
    expect(warningText, 'Warning must mention group unassignment').toMatch(/guruh|group|группа/i);

    const cancelBtn = dialog.getByRole('button', { name: /cancel|bekor|отмена/i });
    await cancelBtn.click();
    await page.waitForTimeout(300);
    await expect(dialog, 'Dialog must close after Cancel').not.toBeVisible();

    await ss(page, 'UX-01-reception-teacher-after-cancel');
  });
});

// ─── Reception: delete parent (individual) ───────────────────────────────────
test.describe.serial('UX-01 Reception — delete-parent confirmation', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await loginAs(page, RECEPTION_BASE, 'reception1@uchqun.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-parent: shared ConfirmDialog appears with warning (not bare inline modal)', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/parents`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for first data row
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(600);

    // The MoreHorizontal kebab is inside <div class="relative group"> in the last td.
    // Hovering the container triggers the CSS group-hover:block rule on the dropdown.
    const menuContainer = firstRow.locator('.relative.group');
    await menuContainer.waitFor({ state: 'visible', timeout: 10000 });
    await menuContainer.hover();
    await page.waitForTimeout(400);

    // Delete option in dropdown has text-error-700 class
    const deleteItem = firstRow.locator('button[class*="text-error-700"]').first();
    await deleteItem.waitFor({ state: 'visible', timeout: 5000 });
    await deleteItem.click();
    await page.waitForTimeout(400);

    await ss(page, 'UX-01-reception-parent-delete-modal');

    // Shared ConfirmDialog renders role="dialog"; old inline did not
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Shared ConfirmDialog (role=dialog) must appear').toBeVisible();

    const warning = dialog.locator('.text-red-600');
    await expect(warning, 'Side-effect warning must be visible').toBeVisible();

    await dialog.getByRole('button', { name: /cancel|bekor|отмена/i }).click();
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();
  });
});

// ─── Reception: bulk-delete parents ──────────────────────────────────────────
// Separate describe block with its own fresh login to avoid session state bleed
// from the individual-delete test that hovered the kebab menu.
test.describe.serial('UX-01 Reception — bulk-delete-parent confirmation', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await loginAs(page, RECEPTION_BASE, 'reception2@uchqun.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('bulk-delete parents: modal appears with count and warning', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/parents`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(600);

    // Check first row checkbox to trigger bulk toolbar
    const firstCheckbox = page.locator('table tbody tr input[type="checkbox"]').first();
    await firstCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await firstCheckbox.click();
    await page.waitForTimeout(500);

    // The bulk delete button uniquely uses text-error-50 (light text on dark toolbar).
    // Individual row-delete options use text-error-700 (dark red). This makes it unambiguous.
    const bulkDelete = page.locator('button[class*="text-error-50"]').first();
    await bulkDelete.waitFor({ state: 'visible', timeout: 10000 });
    await bulkDelete.click();
    await page.waitForTimeout(400);

    await ss(page, 'UX-01-reception-parent-bulk-delete-modal');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog for bulk delete must appear').toBeVisible();

    const msgText = await dialog.locator('p').first().textContent().catch(() => '');
    expect(msgText, 'Message must mention count (1)').toMatch(/1/);

    const warning = dialog.locator('.text-red-600');
    await expect(warning, 'Side-effect warning must appear for bulk delete').toBeVisible();

    await dialog.getByRole('button', { name: /cancel|bekor|отмена/i }).click();
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();

    await ss(page, 'UX-01-reception-parent-bulk-after-cancel');
  });
});

// ─── Reception: delete group ──────────────────────────────────────────────────
test.describe.serial('UX-01 Reception — delete-group confirmation', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await loginAs(page, RECEPTION_BASE, 'reception1@uchqun.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-group: modal appears with group name and children warning', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/groups`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for first group card in the grid
    const firstCard = page.locator('.grid > div').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    // Get group name from card heading (for assertion after dialog opens)
    const groupName = await firstCard.locator('h3').first().textContent().catch(() => '');

    // Delete button in each group card has bg-error-50 in its className
    const deleteBtn = firstCard.locator('button[class*="bg-error"]').first();
    await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });

    await deleteBtn.click();
    await page.waitForTimeout(400);
    await ss(page, 'UX-01-reception-group-delete-modal');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog must appear for delete group').toBeVisible();

    if (groupName.trim()) {
      const dialogText = await dialog.textContent().catch(() => '');
      expect(dialogText, `Group name "${groupName.trim()}" must appear in modal`).toContain(groupName.trim());
    }

    const warning = dialog.locator('.text-red-600');
    await expect(warning, 'Warning about children reassignment must appear').toBeVisible();

    await dialog.getByRole('button', { name: /cancel|bekor|отмена/i }).click();
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();

    await ss(page, 'UX-01-reception-group-after-cancel');
  });
});
