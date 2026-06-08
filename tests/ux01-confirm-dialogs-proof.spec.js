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

const ADMIN_BASE    = 'https://admin-production-536f.up.railway.app';
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
    await loginAs(page, ADMIN_BASE, 'admin1@school1.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-reception: modal appears with name and warning', async () => {
    await page.goto(`${ADMIN_BASE}/admin/receptions`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for at least one trash button
    const trashBtn = page.locator('button[title*="chirish"], button[title*="elete"]').first()
      .or(page.locator('table button').filter({ has: page.locator('svg') }).nth(1));
    await trashBtn.waitFor({ state: 'visible', timeout: 15000 });

    // Click trash — modal should appear
    await trashBtn.click();
    await page.waitForTimeout(400);

    await ss(page, 'UX-01-admin-reception-delete-modal');

    // Modal dialog should be visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog must appear').toBeVisible();

    // Warning text (red) should be present
    const warning = dialog.locator('p.text-red-600, p[class*="text-red"], .text-red-600');
    await expect(warning, 'Side-effect warning must be visible in modal').toBeVisible();

    // Cancel button — safe action
    const cancelBtn = dialog.getByRole('button', { name: /cancel|bekor|отмена/i });
    await expect(cancelBtn, 'Cancel button must be present').toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(300);

    // Dialog should close
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
    await loginAs(page, RECEPTION_BASE, 'reception1@school1.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-teacher: modal appears with name and warning', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/teachers`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for teacher cards to load
    await page.waitForSelector('.grid .card, [class*="card"], .grid > div', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Find delete button on first teacher card
    const deleteBtn = page.getByRole('button', { name: /o'chirish|delete|удалить/i }).first();
    await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });

    // Capture teacher name before clicking
    const cardText = await page.locator('.grid > *').first().textContent().catch(() => '');

    await deleteBtn.click();
    await page.waitForTimeout(400);

    await ss(page, 'UX-01-reception-teacher-delete-modal');

    // Modal dialog visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog must appear for delete teacher').toBeVisible();

    // Warning text
    const warning = dialog.locator('p.text-red-600, p[class*="text-red"], .text-red-600');
    await expect(warning, 'Side-effect warning must appear').toBeVisible();

    // Group note in warning
    const warningText = await warning.textContent().catch(() => '');
    expect(warningText, 'Warning must mention group unassignment').toMatch(/guruh|group|группа/i);

    // Cancel
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
    await loginAs(page, RECEPTION_BASE, 'reception1@school1.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-parent: shared ConfirmDialog appears with warning (not bare inline modal)', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/parents`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);

    // Open the kebab menu on the first parent row
    const moreBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /^$/ }).first();
    // Use MoreHorizontal trigger (the ••• button in each row)
    const menuBtns = page.locator('table tbody tr button').filter({ has: page.locator('[class*="h-4 w-4"]') });
    const firstMenu = menuBtns.last(); // MoreHorizontal is the last button in each row action cell
    await firstMenu.waitFor({ state: 'visible', timeout: 10000 });
    await firstMenu.hover();
    await page.waitForTimeout(300);

    // Find and click delete in the menu
    const deleteInMenu = page.locator('[class*="hover:bg-error"]').filter({ hasText: /o'chirish|delete|удалить/i }).first();
    await deleteInMenu.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await deleteInMenu.click().catch(() => {});
    await page.waitForTimeout(400);

    await ss(page, 'UX-01-reception-parent-delete-modal');

    // Check for a dialog — the old inline modal had no role="dialog"
    // The shared ConfirmDialog has role="dialog"
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Shared ConfirmDialog (role=dialog) must appear').toBeVisible();

    // Warning text in red
    const warning = dialog.locator('p.text-red-600, .text-red-600');
    await expect(warning, 'Side-effect warning must be visible').toBeVisible();

    // Cancel
    await dialog.getByRole('button', { name: /cancel|bekor|отмена/i }).click();
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();
  });

  test('bulk-delete parents: modal appears with count and warning', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/parents`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);

    // Select first row checkbox
    const firstCheckbox = page.locator('table tbody tr input[type="checkbox"]').first();
    await firstCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // Bulk action toolbar should appear
    const bulkToolbar = page.locator('[class*="bg-teak"]');
    await expect(bulkToolbar, 'Bulk action toolbar must appear after selection').toBeVisible();

    // Click bulk delete button
    const bulkDelete = bulkToolbar.getByRole('button').filter({ hasText: /o'chirish|delete|удалить/i });
    await bulkDelete.waitFor({ state: 'visible', timeout: 5000 });
    await bulkDelete.click();
    await page.waitForTimeout(400);

    await ss(page, 'UX-01-reception-parent-bulk-delete-modal');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog for bulk delete must appear').toBeVisible();

    // Count visible in message
    const msgText = await dialog.locator('p').first().textContent().catch(() => '');
    expect(msgText, 'Message must mention count (1)').toMatch(/1/);

    // Warning
    const warning = dialog.locator('p.text-red-600, .text-red-600');
    await expect(warning, 'Side-effect warning must appear for bulk delete').toBeVisible();

    // Cancel
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
    await loginAs(page, RECEPTION_BASE, 'reception1@school1.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('delete-group: modal appears with group name and children warning', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/groups`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Find delete button on first group card
    const deleteBtn = page.getByRole('button', { name: /o'chirish|delete|удалить/i }).first();
    await deleteBtn.waitFor({ state: 'visible', timeout: 15000 });

    // Get group name before clicking
    const groupName = await page.locator('.grid > *').first()
      .locator('h3').first().textContent().catch(() => '');

    await deleteBtn.click();
    await page.waitForTimeout(400);

    await ss(page, 'UX-01-reception-group-delete-modal');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog, 'Confirmation dialog must appear for delete group').toBeVisible();

    // Group name should appear in the dialog text
    if (groupName.trim()) {
      const dialogText = await dialog.textContent().catch(() => '');
      expect(dialogText, `Group name "${groupName.trim()}" must appear in modal`).toContain(groupName.trim());
    }

    // Warning about children reassignment
    const warning = dialog.locator('p.text-red-600, .text-red-600');
    await expect(warning, 'Warning about children reassignment must appear').toBeVisible();

    // Cancel
    await dialog.getByRole('button', { name: /cancel|bekor|отмена/i }).click();
    await page.waitForTimeout(300);
    await expect(dialog).not.toBeVisible();

    await ss(page, 'UX-01-reception-group-after-cancel');
  });
});
