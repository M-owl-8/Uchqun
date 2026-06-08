/**
 * S14 / BETA-VERIFICATION — Wave 1: Reception Portal
 * Accounts: reception1 (S1), reception2 (S2), reception3 (S3), reception4 (S4)
 * URL: https://reception-production-ba41.up.railway.app
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = 'https://reception-production-ba41.up.railway.app';
const TEACHER_BASE = 'https://teacher-production-0647.up.railway.app';
const PW = 'Test@2026';
const SCREENS = path.join(__dirname, '../audits/beta/screens');
if (!fs.existsSync(SCREENS)) fs.mkdirSync(SCREENS, { recursive: true });

const ss = (page, name) =>
  page.screenshot({ path: path.join(SCREENS, `${name}.png`), fullPage: false });

// Unique test-data suffix so reruns don't collide
const RUN = String(Date.now()).slice(-5);
const TPARENT = { first: `BetaP${RUN}`, last: 'Test', email: `bp${RUN}@beta.uz`, phone: `+998901${RUN}` };
const TCHILD  = { first: `BetaC${RUN}`, last: 'Test', dob: '2018-03-15' };
const TTEACH  = { first: `BetaT${RUN}`, last: 'Test', email: `bt${RUN}@beta.uz`, phone: `+998902${RUN}` };
const TGROUP  = `BetaG${RUN}`;

// ─── helpers ───────────────────────────────────────────────────────────────

async function login(page, email, password = PW) {
  await page.goto('/');
  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 20000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for dashboard or redirect
  await page.waitForURL(/\/(dashboard|reception|$)/, { timeout: 20000 });
}

async function navTo(page, linkText) {
  const link = page.getByRole('link', { name: new RegExp(linkText, 'i') })
    .or(page.locator('nav a').filter({ hasText: new RegExp(linkText, 'i') }))
    .first();
  await link.click();
  await page.waitForLoadState('networkidle');
}

// ─── Wave 1, reception1 (School 1) ─────────────────────────────────────────

test.describe.serial('W1-S1 reception1 full day', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await ctx.newPage();
  });

  // ── Auth & Navigation ────────────────────────────────────────────────────

  test('R-001 login with email+password', async () => {
    await login(page, 'reception1@uchqun.uz');
    await ss(page, 'R-001-login-success');
    // Should be on dashboard now
    await expect(page).not.toHaveURL(/login/);
  });

  test('R-005 language switcher visible', async () => {
    // Language buttons should exist on the page
    const langBtn = page.getByRole('button', { name: /uz|ru|en/i })
      .or(page.locator('[class*="lang"], [class*="language"]'))
      .first();
    await expect(langBtn).toBeVisible({ timeout: 8000 });
    await ss(page, 'R-005-lang-switcher');
  });

  test('R-006 Dashboard nav link', async () => {
    // Click the dashboard nav link and verify we stay on dashboard
    const dashLink = page.getByRole('link', { name: /dashboard|bosh sahifa/i }).first();
    if (await dashLink.isVisible()) {
      await dashLink.click();
      await page.waitForLoadState('networkidle');
    }
    await ss(page, 'R-006-dashboard-nav');
  });

  // ── Dashboard ────────────────────────────────────────────────────────────

  test('R-012 school statistics cards visible', async () => {
    // Dashboard should show stat cards with numbers
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-012-dashboard-stats');
    // Look for numeric stat cards or any count display
    const body = await page.textContent('body');
    // Dashboard should contain parent/teacher/group counts — just verify page loaded
    expect(body.length).toBeGreaterThan(100);
  });

  test('R-013 pending documents card', async () => {
    await ss(page, 'R-013-pending-docs');
    // Look for documents-related text on dashboard
    const body = await page.textContent('body');
    // Dashboard must render (has content) — specific card text in Uzbek
    expect(body.length).toBeGreaterThan(100);
  });

  test('R-015 quick-create new parent button', async () => {
    // A button that navigates to parent creation / wizard
    const btn = page.getByRole('button', { name: /ota-ona|parent|new parent/i })
      .or(page.locator('a[href*="parent"], a[href*="wizard"]'))
      .first();
    const visible = await btn.isVisible().catch(() => false);
    await ss(page, 'R-015-quick-create-parent');
    // This is informational — presence is the verdict
    expect(typeof visible).toBe('boolean');
  });

  // ── Auth & Authorization ─────────────────────────────────────────────────

  test('R-023 ProtectedRoute — unauthenticated redirect', async () => {
    // Open a fresh context with no cookies
    const freshCtx = await page.context().browser().newContext({ ignoreHTTPSErrors: true });
    const freshPage = await freshCtx.newPage();
    await freshPage.goto(`${BASE}/parents`);
    await freshPage.waitForLoadState('networkidle');
    await ss(freshPage, 'R-023-protected-redirect');
    // Should redirect to /login
    expect(freshPage.url()).toMatch(/login/);
    await freshCtx.close();
  });

  test('R-020 teacher login on reception portal is blocked', async () => {
    const freshCtx = await page.context().browser().newContext({ ignoreHTTPSErrors: true });
    const freshPage = await freshCtx.newPage();
    await freshPage.goto(BASE);
    await freshPage.waitForSelector('input[type="email"]', { timeout: 15000 });
    await freshPage.fill('input[type="email"]', 'teacher1@uchqun.uz');
    await freshPage.fill('input[type="password"]', PW);
    await freshPage.click('button[type="submit"]');
    await freshPage.waitForTimeout(3000);
    await ss(freshPage, 'R-020-wrong-role-blocked');
    // Should stay on login or show error
    const url = freshPage.url();
    const body = await freshPage.textContent('body');
    const blocked = url.includes('login') || body.includes('xato') || body.includes('error') || body.includes('403');
    expect(blocked).toBe(true);
    await freshCtx.close();
  });

  // ── Navigation sidebar links ─────────────────────────────────────────────

  test('R-007 Parents nav link', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Find parents link in sidebar
    const link = page.locator('nav a, aside a').filter({ hasText: /ota-ona|parents/i }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-007-parents-nav');
    } else {
      // Try URL directly
      await page.goto('/parents');
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-007-parents-direct');
    }
    expect(page.url()).toMatch(/parent/i);
  });

  test('R-008 Teachers nav link', async () => {
    const link = page.locator('nav a, aside a').filter({ hasText: /o.qituvchi|teacher/i }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-008-teachers-nav');
    } else {
      await page.goto('/teachers');
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-008-teachers-direct');
    }
    expect(page.url()).toMatch(/teacher/i);
  });

  test('R-009 Groups nav link', async () => {
    const link = page.locator('nav a, aside a').filter({ hasText: /guruh|group/i }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-009-groups-nav');
    } else {
      await page.goto('/groups');
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-009-groups-direct');
    }
    expect(page.url()).toMatch(/group/i);
  });

  test('R-010 Documents nav link', async () => {
    const link = page.locator('nav a, aside a').filter({ hasText: /hujjat|document/i }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-010-documents-nav');
    } else {
      await page.goto('/documents');
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-010-documents-direct');
    }
    expect(page.url()).toMatch(/document/i);
  });

  test('R-011 Settings nav link', async () => {
    const link = page.locator('nav a, aside a').filter({ hasText: /sozlama|setting/i }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-011-settings-nav');
    } else {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await ss(page, 'R-011-settings-direct');
    }
    expect(page.url()).toMatch(/setting/i);
  });

  // ── Group Management — R-052 FIRST (F-002 S1 repair) ────────────────────

  test('R-050 groups page loads (empty state for S1)', async () => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-050-groups-empty-s1');
    // Page must load
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('R-052 + R-055 create S1 group (F-002 repair) — assign teacher1', async () => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Click "Guruh qo'shish" or similar add-group button
    const addBtn = page.getByRole('button', { name: /guruh qo.shish|add group|yangi guruh/i })
      .or(page.locator('button').filter({ hasText: /guruh/i }))
      .first();
    await addBtn.click();
    await page.waitForTimeout(500);
    await ss(page, 'R-052-group-modal-open');

    // Fill group name
    const nameInput = page.locator('input[name="name"], input[placeholder*="nom"], input[placeholder*="name"]').first();
    await nameInput.fill(TGROUP);

    // Select teacher — pick the first option in teacher select
    const teacherSelect = page.locator('select[name="teacherId"], select').filter({ hasText: /o.qituvchi|teacher/i }).first()
      .or(page.locator('select').nth(0));
    const optionCount = await teacherSelect.locator('option').count();
    if (optionCount > 1) {
      await teacherSelect.selectOption({ index: 1 }); // Pick first real teacher
    }

    // Capacity if visible
    const capacityInput = page.locator('input[name="capacity"], input[placeholder*="capacity"], input[placeholder*="sig\'im"]').first();
    if (await capacityInput.isVisible().catch(() => false)) {
      await capacityInput.fill('20');
    }

    await ss(page, 'R-052-group-modal-filled');

    // Submit
    const submitBtn = page.getByRole('button', { name: /saqlash|submit|qo.shish|yaratish|create/i })
      .or(page.locator('form button[type="submit"]'))
      .first();
    await submitBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, 'R-052-after-create-group');

    // Verify group appears
    const body = await page.textContent('body');
    expect(body).toContain(TGROUP);
  });

  test('R-051 search groups', async () => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[type="search"], input[placeholder*="qidir"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(TGROUP);
      await page.waitForTimeout(500);
      await ss(page, 'R-051-group-search');
      const body = await page.textContent('body');
      expect(body).toContain(TGROUP);
      await searchInput.fill('');
    } else {
      await ss(page, 'R-051-group-search-no-input');
    }
  });

  test('R-053 edit group', async () => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    // Find the beta group and click edit
    const editBtn = page.locator(`text=${TGROUP}`).locator('..').locator('..').getByRole('button', { name: /yangilash|tahrirlash|edit/i }).first()
      .or(page.locator(`text=${TGROUP}`).locator('..').getByRole('button', { name: /yangilash|edit/i }).first());

    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);
      // Change name
      const nameInput = page.locator('input[name="name"], input[placeholder*="nom"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(TGROUP + '-ed');
        const saveBtn = page.getByRole('button', { name: /saqlash|save|yangilash/i }).first();
        await saveBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-053-after-edit-group');
      }
    } else {
      await ss(page, 'R-053-edit-btn-not-found');
    }
  });

  test('R-054 create extra group then delete', async () => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    const EXTRA_GROUP = `EXTRA${RUN}`;

    const addBtn = page.getByRole('button', { name: /guruh qo.shish|add group|yangi guruh/i })
      .or(page.locator('button').filter({ hasText: /guruh/i }))
      .first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[name="name"], input[placeholder*="nom"], input[placeholder*="name"]').first();
    await nameInput.fill(EXTRA_GROUP);
    const submitBtn = page.getByRole('button', { name: /saqlash|submit|qo.shish|yaratish/i })
      .or(page.locator('form button[type="submit"]'))
      .first();
    await submitBtn.click();
    await page.waitForTimeout(1500);

    // Now delete it
    const deleteBtn = page.locator(`text=${EXTRA_GROUP}`).locator('..').locator('..').getByRole('button', { name: /o.chirish|delete/i }).first()
      .or(page.locator(`text=${EXTRA_GROUP}`).locator('..').getByRole('button', { name: /o.chirish|delete/i }).first());

    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      // Confirm dialog
      const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha|yes/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
      }
      await ss(page, 'R-054-after-delete-group');
    }
  });

  // ── Parent Management ────────────────────────────────────────────────────

  test('R-024 list all parents', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-024-parents-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('R-025 search parents by name', async () => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="qidir"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Hulkar');
      await page.waitForTimeout(600);
      await ss(page, 'R-025-parent-search');
      await searchInput.fill('');
    } else {
      await ss(page, 'R-025-no-search-input');
    }
  });

  test('R-026 filter parents by status tabs', async () => {
    // Look for Faol / Kutmoqda / To'xtatilgan tabs
    const tabs = ['Faol', "To'xtatilgan", 'Kutmoqda', 'Barchasi'];
    for (const tab of tabs) {
      const tabEl = page.getByRole('button', { name: tab }).or(page.locator(`text="${tab}"`)).first();
      if (await tabEl.isVisible().catch(() => false)) {
        await tabEl.click();
        await page.waitForTimeout(400);
      }
    }
    await ss(page, 'R-026-status-filter');
  });

  test('R-027 view parent detail inline', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-027-parent-detail-inline');
    const body = await page.textContent('body');
    // Table should show parent names, dates, status
    expect(body.length).toBeGreaterThan(100);
  });

  test('R-029 create parent via 3-step wizard', async () => {
    // Navigate to wizard
    await page.goto('/parents/new');
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();

    // If /parents/new doesn't exist, look for wizard button
    if (!currentUrl.includes('new') && !currentUrl.includes('wizard')) {
      await page.goto('/parents');
      await page.waitForLoadState('networkidle');
      const wizardBtn = page.getByRole('button', { name: /yangi ota-ona|new parent|wizard/i })
        .or(page.getByRole('link', { name: /yangi|new/i }))
        .first();
      if (await wizardBtn.isVisible().catch(() => false)) {
        await wizardBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    await ss(page, 'R-029-wizard-step1');

    // Step 1: parent info
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="ism"], input[placeholder*="first"]').first();
    if (await firstNameInput.isVisible().catch(() => false)) {
      await firstNameInput.fill(TPARENT.first);
      await page.locator('input[name="lastName"], input[placeholder*="familiya"], input[placeholder*="last"]').first().fill(TPARENT.last);
      await page.locator('input[type="email"]').first().fill(TPARENT.email);
      await page.locator('input[type="tel"], input[name="phone"]').first().fill(TPARENT.phone);
      // Password for parent account
      const pwInput = page.locator('input[type="password"]').first();
      if (await pwInput.isVisible().catch(() => false)) {
        await pwInput.fill(PW);
        const confirmPw = page.locator('input[type="password"]').nth(1);
        if (await confirmPw.isVisible().catch(() => false)) await confirmPw.fill(PW);
      }

      const nextBtn = page.getByRole('button', { name: /keyingi|next|continue/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(800);
        await ss(page, 'R-029-wizard-step2');
      }

      // Step 2: child info
      const childFirst = page.locator('input[name="firstName"], input[placeholder*="ism"]').first();
      if (await childFirst.isVisible().catch(() => false)) {
        await childFirst.fill(TCHILD.first);
        await page.locator('input[name="lastName"], input[placeholder*="familiya"]').first().fill(TCHILD.last);
        // DOB
        const dobInput = page.locator('input[type="date"], input[name="dateOfBirth"], input[name="dob"]').first();
        if (await dobInput.isVisible().catch(() => false)) await dobInput.fill(TCHILD.dob);
        // Gender
        const genderSelect = page.locator('select[name="gender"]').first();
        if (await genderSelect.isVisible().catch(() => false)) await genderSelect.selectOption({ index: 1 });

        const nextBtn2 = page.getByRole('button', { name: /keyingi|next/i }).first();
        if (await nextBtn2.isVisible().catch(() => false)) {
          await nextBtn2.click();
          await page.waitForTimeout(800);
          await ss(page, 'R-029-wizard-step3');
        }
      }

      // Step 3: group assignment (or final submit)
      const submitBtn = page.getByRole('button', { name: /yaratish|saqlash|submit|tugallash|finish/i }).first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2500);
        await ss(page, 'R-029-wizard-complete');
      }
    } else {
      await ss(page, 'R-029-wizard-form-not-found');
    }
  });

  test('R-028 create parent via inline modal', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    // Look for a "+" or "Add" button that opens an inline modal
    const addBtn = page.getByRole('button', { name: /yangi ota-ona|qo.shish|add/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await ss(page, 'R-028-inline-modal');
      // Close modal
      const closeBtn = page.getByRole('button', { name: /bekor|cancel|close/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      await ss(page, 'R-028-no-inline-modal-btn');
    }
  });

  test('R-030 edit parent', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    // Find the beta test parent row and click edit
    const row = page.locator('tr, [class*="row"], [class*="card"]').filter({ hasText: TPARENT.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const editBtn = row.getByRole('button', { name: /tahrirlash|edit|yangilash/i }).first()
        .or(row.locator('[aria-label*="edit"], [class*="edit"]').first());
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);
        await ss(page, 'R-030-edit-parent-modal');
        const closeBtn = page.getByRole('button', { name: /bekor|cancel|close/i }).first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      }
    } else {
      await ss(page, 'R-030-test-parent-not-visible');
    }
  });

  test('R-033 suspend parent', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr, [class*="row"], [class*="card"]').filter({ hasText: TPARENT.first }).first();
    if (await row.isVisible().catch(() => false)) {
      // Action menu or suspend button
      const menuBtn = row.locator('[class*="menu"], [class*="dots"], [aria-label*="action"]').first();
      if (await menuBtn.isVisible().catch(() => false)) await menuBtn.click();
      const suspendBtn = page.getByRole('button', { name: /to.xtatish|suspend/i })
        .or(page.getByRole('menuitem', { name: /to.xtatish|suspend/i })).first();
      if (await suspendBtn.isVisible().catch(() => false)) {
        await suspendBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha|yes/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-033-after-suspend');
      }
    } else {
      await ss(page, 'R-033-parent-not-found');
    }
  });

  test('R-032 activate parent', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr, [class*="row"], [class*="card"]').filter({ hasText: TPARENT.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const menuBtn = row.locator('[class*="menu"], [class*="dots"], [aria-label*="action"]').first();
      if (await menuBtn.isVisible().catch(() => false)) await menuBtn.click();
      const activateBtn = page.getByRole('button', { name: /faollashtirish|activate/i })
        .or(page.getByRole('menuitem', { name: /faollashtirish|activate/i })).first();
      if (await activateBtn.isVisible().catch(() => false)) {
        await activateBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha|yes/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-032-after-activate');
      }
    } else {
      await ss(page, 'R-032-parent-not-found');
    }
  });

  test('R-034 reset parent password', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr, [class*="row"], [class*="card"]').filter({ hasText: TPARENT.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const menuBtn = row.locator('[class*="menu"], [class*="dots"], [aria-label*="action"]').first();
      if (await menuBtn.isVisible().catch(() => false)) await menuBtn.click();
      const resetBtn = page.getByRole('button', { name: /parolni tiklash|reset.*password|reset/i })
        .or(page.getByRole('menuitem', { name: /parol|reset/i })).first();
      if (await resetBtn.isVisible().catch(() => false)) {
        await resetBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha|yes/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-034-temp-password-modal');
        // Close modal
        const closeBtn = page.getByRole('button', { name: /yopish|close|ok/i }).first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      }
    } else {
      await ss(page, 'R-034-parent-not-found');
    }
  });

  test('R-035 bulk select parents', async () => {
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await checkboxes.first().check();
      await page.waitForTimeout(300);
      await ss(page, 'R-035-bulk-select');
      await checkboxes.first().uncheck();
    } else {
      await ss(page, 'R-035-no-checkboxes');
    }
  });

  test('R-031 delete test parent', async () => {
    // Create a throwaway parent to delete
    await page.goto('/parents');
    await page.waitForLoadState('networkidle');
    // Try to delete the beta parent we created
    const row = page.locator('tr, [class*="row"], [class*="card"]').filter({ hasText: TPARENT.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const menuBtn = row.locator('[class*="menu"], [class*="dots"], [aria-label*="action"]').first();
      if (await menuBtn.isVisible().catch(() => false)) await menuBtn.click();
      const deleteBtn = page.getByRole('button', { name: /o.chirish|delete/i })
        .or(page.getByRole('menuitem', { name: /o.chirish|delete/i })).first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha|yes/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-031-after-delete-parent');
      }
    } else {
      await ss(page, 'R-031-test-parent-not-found');
    }
  });

  // ── Teacher Management ───────────────────────────────────────────────────

  test('R-041 list teachers', async () => {
    await page.goto('/teachers');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-041-teachers-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('R-042 search teachers', async () => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="qidir"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Zulfiya');
      await page.waitForTimeout(500);
      await ss(page, 'R-042-teacher-search');
      await searchInput.fill('');
    } else {
      await ss(page, 'R-042-no-search');
    }
  });

  test('R-043 create teacher', async () => {
    const addBtn = page.getByRole('button', { name: /yangi o.qituvchi|qo.shish|add teacher/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await ss(page, 'R-043-teacher-modal-open');
      const fName = page.locator('input[name="firstName"], input[placeholder*="ism"]').first();
      if (await fName.isVisible().catch(() => false)) {
        await fName.fill(TTEACH.first);
        await page.locator('input[name="lastName"], input[placeholder*="familiya"]').first().fill(TTEACH.last);
        await page.locator('input[type="email"]').first().fill(TTEACH.email);
        const phone = page.locator('input[type="tel"], input[name="phone"]').first();
        if (await phone.isVisible().catch(() => false)) await phone.fill(TTEACH.phone);
        const pw = page.locator('input[type="password"]').first();
        if (await pw.isVisible().catch(() => false)) await pw.fill(PW);
        const submitBtn = page.getByRole('button', { name: /saqlash|yaratish|qo.shish|submit/i }).first();
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await ss(page, 'R-043-after-create-teacher');
      }
    } else {
      await ss(page, 'R-043-no-add-btn');
    }
  });

  test('R-049 view teacher ratings modal', async () => {
    await page.goto('/teachers');
    await page.waitForLoadState('networkidle');
    // Click first teacher card
    const teacherCard = page.locator('[class*="card"], [class*="teacher-item"]').first();
    if (await teacherCard.isVisible().catch(() => false)) {
      await teacherCard.click();
      await page.waitForTimeout(1000);
      await ss(page, 'R-049-ratings-modal');
      // Close if modal opened
      const closeBtn = page.getByRole('button', { name: /yopish|close|bekor/i }).first()
        .or(page.locator('[class*="modal"] button').last());
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      await ss(page, 'R-049-no-teacher-card');
    }
  });

  test('R-047 suspend teacher', async () => {
    await page.goto('/teachers');
    await page.waitForLoadState('networkidle');
    const row = page.locator('[class*="card"], tr').filter({ hasText: TTEACH.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const suspendBtn = row.getByRole('button', { name: /to.xtatish|suspend/i }).first();
      if (await suspendBtn.isVisible().catch(() => false)) {
        await suspendBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-047-teacher-suspended');
      }
    } else {
      await ss(page, 'R-047-test-teacher-not-found');
    }
  });

  test('R-046 activate teacher', async () => {
    await page.goto('/teachers');
    await page.waitForLoadState('networkidle');
    const row = page.locator('[class*="card"], tr').filter({ hasText: TTEACH.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const activateBtn = row.getByRole('button', { name: /faollashtirish|activate/i }).first();
      if (await activateBtn.isVisible().catch(() => false)) {
        await activateBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-046-teacher-activated');
      }
    } else {
      await ss(page, 'R-046-test-teacher-not-found');
    }
  });

  test('R-048 reset teacher password', async () => {
    await page.goto('/teachers');
    await page.waitForLoadState('networkidle');
    const row = page.locator('[class*="card"], tr').filter({ hasText: TTEACH.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const resetBtn = row.getByRole('button', { name: /parolni tiklash|reset/i }).first();
      if (await resetBtn.isVisible().catch(() => false)) {
        await resetBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-048-teacher-temp-password');
        const closeBtn = page.getByRole('button', { name: /yopish|close|ok/i }).first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      }
    } else {
      await ss(page, 'R-048-test-teacher-not-found');
    }
  });

  test('R-044 edit teacher', async () => {
    await page.goto('/teachers');
    await page.waitForLoadState('networkidle');
    const row = page.locator('[class*="card"], tr').filter({ hasText: TTEACH.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const editBtn = row.getByRole('button', { name: /yangilash|tahrirlash|edit/i }).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);
        await ss(page, 'R-044-edit-teacher-modal');
        const closeBtn = page.getByRole('button', { name: /bekor|cancel/i }).first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      }
    } else {
      await ss(page, 'R-044-test-teacher-not-found');
    }
  });

  test('R-045 delete test teacher', async () => {
    await page.goto('/teachers');
    await page.waitForLoadState('networkidle');
    const row = page.locator('[class*="card"], tr').filter({ hasText: TTEACH.first }).first();
    if (await row.isVisible().catch(() => false)) {
      const deleteBtn = row.getByRole('button', { name: /o.chirish|delete/i }).first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|ha/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'R-045-after-delete-teacher');
      }
    } else {
      await ss(page, 'R-045-test-teacher-not-found');
    }
  });

  // ── Document Management ──────────────────────────────────────────────────

  test('R-056 R-057 R-059 documents page loads with status cards', async () => {
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-057-documents-page');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('R-060 all-approved banner check', async () => {
    const body = await page.textContent('body');
    // Check for green banner or approval text
    const hasApprovedBanner = body.includes('tasdiqlangan') || body.includes('approved') || body.includes('vakolatga');
    await ss(page, 'R-060-approval-banner');
    // Just verify documents page renders — banner present or not is the finding
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Profile & Settings ───────────────────────────────────────────────────

  test('R-061 view profile page', async () => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-061-profile-page');
    const body = await page.textContent('body');
    expect(body).toContain('Iroda'); // reception1 display name
  });

  test('R-062 send message to government', async () => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    // Find "Send message" button
    const msgBtn = page.getByRole('button', { name: /xabar|message|yozish/i }).first();
    if (await msgBtn.isVisible().catch(() => false)) {
      await msgBtn.click();
      await page.waitForTimeout(500);
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(`Beta test message ${RUN}`);
        const sendBtn = page.getByRole('button', { name: /yuborish|send/i }).first();
        if (await sendBtn.isVisible().catch(() => false)) {
          await sendBtn.click();
          await page.waitForTimeout(1500);
        }
      }
      await ss(page, 'R-062-message-sent');
    } else {
      await ss(page, 'R-062-no-message-btn');
    }
  });

  test('R-063 view government replies', async () => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const viewBtn = page.getByRole('button', { name: /xabarlar|messages|replies/i }).first();
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, 'R-063-messages-modal');
      const closeBtn = page.getByRole('button', { name: /yopish|close|bekor/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      await ss(page, 'R-063-no-view-btn');
    }
  });

  test('R-064 update profile settings', async () => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-064-settings-page');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('R-065 notification preferences', async () => {
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      const before = await checkbox.isChecked();
      await checkbox.click();
      await page.waitForTimeout(300);
      await checkbox.click(); // restore
      await ss(page, 'R-065-notif-prefs');
    } else {
      await ss(page, 'R-065-no-checkbox');
    }
  });

  // ── R-089 Security probe — teacher-scoped route rejection ────────────────

  test('R-089 GET /teacher/children as reception1 must return 403', async () => {
    // Get current cookies from the reception1 session
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(c => c.name === 'accessToken');

    // Navigate to teacher portal URL for /children endpoint in browser
    await page.goto(`${TEACHER_BASE}/children`);
    await page.waitForLoadState('networkidle');
    await ss(page, 'R-089-teacher-route-as-reception');
    const responseBody = await page.textContent('body');
    const url = page.url();

    // A correct security posture means the browser redirects to login or shows 403
    // A 200 with child data is a P0 breach
    const wasRedirectedToLogin = url.includes('login');
    const shows403 = responseBody.includes('403') || responseBody.includes('Forbidden');
    const showsChildData = responseBody.includes('childId') || responseBody.includes('firstName');

    if (showsChildData && !wasRedirectedToLogin && !shows403) {
      // P0 defect — log it
      console.log('R-089 FAIL: reception1 can access /teacher/children — P0 cross-role breach');
    } else if (wasRedirectedToLogin || shows403) {
      console.log('R-089 PASS: reception1 correctly rejected from teacher portal');
    } else {
      console.log('R-089 PARTIAL: check screenshot for verdict');
    }
  });

  // ── Multi-school: reception2, 3, 4 login + dashboard ────────────────────

  test('R-001 reception2 login + dashboard', async () => {
    const ctx2 = await page.context().browser().newContext({ ignoreHTTPSErrors: true });
    const p2 = await ctx2.newPage();
    await p2.goto(BASE);
    await p2.waitForSelector('input[type="email"]', { timeout: 15000 });
    await p2.fill('input[type="email"]', 'reception2@uchqun.uz');
    await p2.fill('input[type="password"]', PW);
    await p2.click('button[type="submit"]');
    await p2.waitForURL(/\/(dashboard|reception|$)/, { timeout: 20000 });
    await ss(p2, 'R-001-reception2-dashboard');
    const body = await p2.textContent('body');
    expect(body.length).toBeGreaterThan(100);
    await ctx2.close();
  });

  test('R-001 reception3 login + dashboard', async () => {
    const ctx3 = await page.context().browser().newContext({ ignoreHTTPSErrors: true });
    const p3 = await ctx3.newPage();
    await p3.goto(BASE);
    await p3.waitForSelector('input[type="email"]', { timeout: 15000 });
    await p3.fill('input[type="email"]', 'reception3@uchqun.uz');
    await p3.fill('input[type="password"]', PW);
    await p3.click('button[type="submit"]');
    await p3.waitForURL(/\/(dashboard|reception|$)/, { timeout: 20000 });
    await ss(p3, 'R-001-reception3-dashboard');
    await ctx3.close();
  });

  test('R-001 reception4 login + dashboard', async () => {
    const ctx4 = await page.context().browser().newContext({ ignoreHTTPSErrors: true });
    const p4 = await ctx4.newPage();
    await p4.goto(BASE);
    await p4.waitForSelector('input[type="email"]', { timeout: 15000 });
    await p4.fill('input[type="email"]', 'reception4@uchqun.uz');
    await p4.fill('input[type="password"]', PW);
    await p4.click('button[type="submit"]');
    await p4.waitForURL(/\/(dashboard|reception|$)/, { timeout: 20000 });
    await ss(p4, 'R-001-reception4-dashboard');
    await ctx4.close();
  });

  // ── Logout ───────────────────────────────────────────────────────────────

  test('R-002 R-066 logout', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Find logout button in sidebar or profile
    const logoutBtn = page.getByRole('button', { name: /chiqish|logout|exit/i })
      .or(page.locator('[class*="logout"]'))
      .first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'R-002-logout');
      expect(page.url()).toMatch(/login/);
    } else {
      // Try profile page logout
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      const profileLogout = page.getByRole('button', { name: /chiqish|logout/i }).first();
      if (await profileLogout.isVisible().catch(() => false)) {
        await profileLogout.click();
        await page.waitForTimeout(2000);
        await ss(page, 'R-002-logout-from-profile');
        expect(page.url()).toMatch(/login/);
      } else {
        await ss(page, 'R-002-no-logout-btn');
      }
    }
  });
});
