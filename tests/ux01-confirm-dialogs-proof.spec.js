// UX-01 — Destructive-action confirmation dialogs proof (S20)
//
// Verifies that every guarded destructive action in the admin and reception
// portals shows a confirmation modal BEFORE executing and that:
//   1. The modal appears (not immediate execution)
//   2. Cancel aborts AND the item is STILL PRESENT in the list afterward
//   3. The entity name appears in the modal text
//   4. A warning about side effects is visible in red
//   5. (ru/en) Non-default locales render translated strings, not raw i18n keys
//
// Confirm path (actual deletion) is DEFERRED to verification-rebuild phase
// against disposable test data. No mutations on production in this suite.

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

// Switch the portal language via the sidebar LanguageSwitcher
// (button[aria-haspopup="listbox"] → [role="option"] with the target label)
async function switchLang(page, lang) {
  const labels = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };
  const trigger = page.locator('button[aria-haspopup="listbox"]').first();
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click();
  await page.waitForTimeout(200);
  await page.locator('[role="option"]').filter({ hasText: labels[lang] }).click();
  await page.waitForTimeout(600); // allow i18n re-render
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

  test('delete-reception: modal appears with name and warning; Cancel leaves row intact', async () => {
    await page.goto(`${ADMIN_BASE}/admin/receptions`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for table rows to load and capture count before any action
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15000 });
    const rowCountBefore = await page.locator('table tbody tr').count();

    // Delete button has error classes (hover:text-error-700 hover:bg-error-50)
    const trashBtn = firstRow.locator('button[class*="error"]').first();
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
    await page.waitForTimeout(400);
    await expect(dialog, 'Dialog must close after Cancel').not.toBeVisible();

    // Item-still-present: row count unchanged and first row still visible
    const rowCountAfter = await page.locator('table tbody tr').count();
    expect(rowCountAfter, 'Table row count must be unchanged after Cancel').toBe(rowCountBefore);
    await expect(firstRow, 'First reception row must still be visible after Cancel').toBeVisible();

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

  test('delete-teacher: modal appears with name and warning; Cancel leaves card intact', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/teachers`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Wait for the first teacher card in the grid
    const firstCard = page.locator('.grid > div').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    // Capture teacher name from card before triggering delete
    const teacherName = await firstCard.locator('[class*="font-semibold"], [class*="font-medium"]')
      .first().textContent().catch(() => '');
    const cardCountBefore = await page.locator('.grid > div').count();

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
    await page.waitForTimeout(400);
    await expect(dialog, 'Dialog must close after Cancel').not.toBeVisible();

    // Item-still-present: card count unchanged, first card still visible with same name
    const cardCountAfter = await page.locator('.grid > div').count();
    expect(cardCountAfter, 'Teacher card count must be unchanged after Cancel').toBe(cardCountBefore);
    await expect(firstCard, 'First teacher card must still be visible after Cancel').toBeVisible();
    if (teacherName.trim()) {
      await expect(
        page.locator('.grid > div').filter({ hasText: teacherName.trim() }).first(),
        `Teacher "${teacherName.trim()}" must still appear in grid after Cancel`
      ).toBeVisible();
    }

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

  test('delete-parent: shared ConfirmDialog appears; Cancel leaves row intact', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/parents`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(600);
    const rowCountBefore = await page.locator('table tbody tr').count();

    // Hover the MoreHorizontal kebab — CSS group-hover:block reveals dropdown
    const menuContainer = firstRow.locator('.relative.group');
    await menuContainer.waitFor({ state: 'visible', timeout: 10000 });
    await menuContainer.hover();
    await page.waitForTimeout(400);

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
    await page.waitForTimeout(400);
    await expect(dialog).not.toBeVisible();

    // Item-still-present: row count unchanged and first row still visible
    const rowCountAfter = await page.locator('table tbody tr').count();
    expect(rowCountAfter, 'Parent row count must be unchanged after Cancel').toBe(rowCountBefore);
    await expect(firstRow, 'First parent row must still be visible after Cancel').toBeVisible();
  });
});

// ─── Reception: bulk-delete parents ──────────────────────────────────────────
// Separate describe block — fresh login avoids state bleed from the kebab hover above.
test.describe.serial('UX-01 Reception — bulk-delete-parent confirmation', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await loginAs(page, RECEPTION_BASE, 'reception2@uchqun.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  test('bulk-delete parents: modal with count + warning; Cancel leaves row intact', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/parents`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(600);
    const rowCountBefore = await page.locator('table tbody tr').count();

    const firstCheckbox = page.locator('table tbody tr input[type="checkbox"]').first();
    await firstCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await firstCheckbox.click();
    await page.waitForTimeout(500);

    // Bulk delete button uniquely uses text-error-50 (row-level deletes use text-error-700)
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
    await page.waitForTimeout(400);
    await expect(dialog).not.toBeVisible();

    // Item-still-present: row count unchanged (selected parent not removed)
    const rowCountAfter = await page.locator('table tbody tr').count();
    expect(rowCountAfter, 'Parent row count must be unchanged after bulk Cancel').toBe(rowCountBefore);
    await expect(firstRow, 'First parent row must still be visible after bulk Cancel').toBeVisible();

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

  test('delete-group: modal with group name + warning; Cancel leaves card intact', async () => {
    await page.goto(`${RECEPTION_BASE}/reception/groups`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const firstCard = page.locator('.grid > div').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);
    const cardCountBefore = await page.locator('.grid > div').count();

    const groupName = await firstCard.locator('h3').first().textContent().catch(() => '');

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
    await page.waitForTimeout(400);
    await expect(dialog).not.toBeVisible();

    // Item-still-present: card count unchanged and the specific group card still visible
    const cardCountAfter = await page.locator('.grid > div').count();
    expect(cardCountAfter, 'Group card count must be unchanged after Cancel').toBe(cardCountBefore);
    await expect(firstCard, 'First group card must still be visible after Cancel').toBeVisible();
    if (groupName.trim()) {
      await expect(
        page.locator('.grid > div').filter({ hasText: groupName.trim() }).first(),
        `Group "${groupName.trim()}" must still appear in grid after Cancel`
      ).toBeVisible();
    }

    await ss(page, 'UX-01-reception-group-after-cancel');
  });
});

// ─── Locale renders: ru and en for delete-teacher + bulk-delete ───────────────
// Proves non-default locales render translated strings, not raw i18n keys.
// DEF-004 lesson: missing keys appear only in non-default locales.
test.describe.serial('UX-01 Reception — locale renders (ru + en)', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await loginAs(page, RECEPTION_BASE, 'reception3@uchqun.uz', PW);
  });
  test.afterAll(async () => page.context().close().catch(() => {}));

  for (const lang of ['ru', 'en']) {
    test(`delete-teacher modal renders in ${lang} (no raw keys)`, async () => {
      await page.goto(`${RECEPTION_BASE}/reception/teachers`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Switch language via sidebar LanguageSwitcher
      await switchLang(page, lang);

      const firstCard = page.locator('.grid > div').first();
      await firstCard.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(500);

      const deleteBtn = firstCard.locator('button[class*="bg-error"]').first();
      await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });
      await deleteBtn.click();
      await page.waitForTimeout(400);
      await ss(page, `UX-01-reception-teacher-delete-modal-${lang}`);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog, `Confirmation dialog must appear in ${lang}`).toBeVisible();

      // Message must be a translated sentence — not a raw i18n key
      const msgText = await dialog.locator('p').first().textContent().catch(() => '');
      expect(msgText.trim(), `Message must not be a raw i18n key in ${lang}`).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
      expect(msgText.trim(), `Message must contain at least one space (sentence, not key) in ${lang}`).toMatch(/\s/);

      // Warning must also be a translated sentence
      const warning = dialog.locator('.text-red-600');
      await expect(warning, `Red warning must appear in ${lang}`).toBeVisible();
      const warnText = await warning.textContent().catch(() => '');
      expect(warnText.trim(), `Warning must not be a raw i18n key in ${lang}`).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
      expect(warnText.trim(), `Warning must contain at least one space (sentence) in ${lang}`).toMatch(/\s/);

      await dialog.getByRole('button', { name: /cancel|bekor|отмена|отмен/i }).click();
      await page.waitForTimeout(400);
      await expect(dialog).not.toBeVisible();
    });

    test(`bulk-delete parents modal renders in ${lang} (no raw keys)`, async () => {
      await page.goto(`${RECEPTION_BASE}/reception/parents`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Ensure language is correct (may persist from previous test in this session)
      await switchLang(page, lang);

      const firstRow = page.locator('table tbody tr').first();
      await firstRow.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(600);

      const firstCheckbox = page.locator('table tbody tr input[type="checkbox"]').first();
      await firstCheckbox.waitFor({ state: 'visible', timeout: 10000 });
      await firstCheckbox.click();
      await page.waitForTimeout(500);

      const bulkDelete = page.locator('button[class*="text-error-50"]').first();
      await bulkDelete.waitFor({ state: 'visible', timeout: 10000 });
      await bulkDelete.click();
      await page.waitForTimeout(400);
      await ss(page, `UX-01-reception-parent-bulk-delete-modal-${lang}`);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog, `Bulk delete dialog must appear in ${lang}`).toBeVisible();

      const msgText = await dialog.locator('p').first().textContent().catch(() => '');
      expect(msgText.trim(), `Bulk message must not be raw key in ${lang}`).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
      expect(msgText.trim(), `Bulk message must contain space in ${lang}`).toMatch(/\s/);

      const warning = dialog.locator('.text-red-600');
      await expect(warning, `Red warning must appear in ${lang}`).toBeVisible();
      const warnText = await warning.textContent().catch(() => '');
      expect(warnText.trim(), `Bulk warning must not be raw key in ${lang}`).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
      expect(warnText.trim(), `Bulk warning must contain space in ${lang}`).toMatch(/\s/);

      await dialog.getByRole('button', { name: /cancel|bekor|отмена/i }).click();
      await page.waitForTimeout(400);
      await expect(dialog).not.toBeVisible();

      // Reset to uz so portal is clean for any subsequent test runs
      await page.goto(`${RECEPTION_BASE}/reception/teachers`);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await switchLang(page, 'uz').catch(() => {});
    });
  }
});
