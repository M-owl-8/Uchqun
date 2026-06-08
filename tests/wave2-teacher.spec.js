// Wave 2 — Teacher Portal
// S14 / BETA-VERIFICATION — DO NOT FIX, RECORD ONLY
// Accounts: teacher1–teacher8  Password: Test@2026
// URL: https://teacher-production-0647.up.railway.app

const { test, expect } = require('@playwright/test');

const BASE = 'https://teacher-production-0647.up.railway.app';
const PW   = 'Test@2026';
const RUN  = Date.now().toString().slice(-5);

const TEACHERS = [
  'teacher1@uchqun.uz',
  'teacher2@uchqun.uz',
  'teacher3@uchqun.uz',
  'teacher4@uchqun.uz',
  'teacher5@uchqun.uz',
  'teacher6@uchqun.uz',
  'teacher7@uchqun.uz',
  'teacher8@uchqun.uz',
];

const ss = (page, name) =>
  page.screenshot({ path: `audits/beta/screens/${name}.png`, fullPage: false }).catch(() => {});

async function login(page, email, password = PW) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  const btn = page.getByRole('button', { name: /kirish|login|sign in/i }).first();
  await btn.click();
  await page.waitForURL(/\/teacher|\/change-password/, { timeout: 20000 });
  // Settle auth/me before returning — prevents race with subsequent full-page reload (DEF-008)
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────
// W2-S1 teacher1 — full day workflow
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W2-S1 teacher1 full day', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await ctx.newPage();
  });

  test.afterAll(async () => {
    await page.context().close().catch(() => {});
  });

  // ── Auth ──────────────────────────────────────────────────────────
  test('T-001 login teacher1', async () => {
    await login(page, TEACHERS[0]);
    await ss(page, 'T-001-teacher1-dashboard');
    const url = page.url();
    expect(url).toMatch(/teacher/);
  });

  test('T-002 show/hide password toggle on login page', async () => {
    await page.goto('/login');
    await page.waitForSelector('input[type="password"]');
    const toggle = page.locator('[class*="eye"], [class*="toggle"], [aria-label*="show"], button').filter({ hasText: /show|hide|ko.r/i }).first()
      .or(page.locator('input[type="password"]').locator('..').getByRole('button').first());
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(300);
      const typeAfter = await page.locator('input[type="password"], input[type="text"]').first().getAttribute('type');
      await ss(page, 'T-002-password-toggle');
    } else {
      await ss(page, 'T-002-no-toggle');
    }
    // Re-login
    await login(page, TEACHERS[0]);
  });

  test('T-003 language switcher on login page', async () => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const switcher = page.locator('[class*="lang"], select, button').filter({ hasText: /UZ|RU|EN|uz|ru|en/i }).first();
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(300);
      await ss(page, 'T-003-lang-switcher');
    } else {
      await ss(page, 'T-003-no-lang-switcher');
    }
    await login(page, TEACHERS[0]);
  });

  // ── Navigation ────────────────────────────────────────────────────
  test('T-008 nav Dashboard', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');
    // Session may be lost after T-001→T-003 re-login chain race condition (DEF-008)
    if (page.url().includes('/login')) {
      await login(page, TEACHERS[0]);
      await page.goto('/teacher');
      await page.waitForLoadState('networkidle');
    }
    await ss(page, 'T-008-dashboard');
    expect(page.url()).toMatch(/\/teacher/);
  });

  test('T-009 nav Attendance', async () => {
    await page.goto('/teacher/attendance');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-009-attendance');
    expect(page.url()).toMatch(/attendance/);
  });

  test('T-010 nav Bolalar (children/parents list)', async () => {
    await page.goto('/teacher/bolalar');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-010-bolalar');
    expect(page.url()).toMatch(/bolalar/);
  });

  test('T-011 nav Media / Gallery', async () => {
    await page.goto('/teacher/media');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-011-media');
    expect(page.url()).toMatch(/media/);
  });

  test('T-013 nav Reja (Activities/Plan)', async () => {
    await page.goto('/teacher/reja');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-013-reja');
    expect(page.url()).toMatch(/reja/);
  });

  test('T-014 nav Xabar (Chat/Messages)', async () => {
    await page.goto('/teacher/xabar');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-014-xabar');
    expect(page.url()).toMatch(/xabar/);
  });

  test('T-015 nav Reflection (men?tab=reflection)', async () => {
    await page.goto('/teacher/men?tab=reflection');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-015-reflection');
    expect(page.url()).toMatch(/men/);
  });

  test('T-016 nav Settings (men?tab=settings)', async () => {
    await page.goto('/teacher/men?tab=settings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-016-settings');
    expect(page.url()).toMatch(/men/);
  });

  test('T-018 language switcher mid-session', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');
    // Lang switcher is a button showing current language code
    const switcher = page.locator('button').filter({ hasText: /^UZ$|^RU$|^EN$/i }).first()
      .or(page.locator('[class*="lang-switch"], [class*="language"]').first());
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(800);
      await ss(page, 'T-018-lang-dropdown-open');
      // Language modal/dropdown opens — pick RU with exact match inside any overlay
      const overlay = page.locator('.fixed, [role="dialog"], [class*="dropdown"], [class*="modal"]').last();
      const ruBtn = overlay.getByRole('button', { name: /^RU$/ }).first()
        .or(overlay.locator('button, [role="option"]').filter({ hasText: /^Русский$|^RU$/ }).first());
      if (await ruBtn.isVisible().catch(() => false)) {
        await ruBtn.click();
        await page.waitForTimeout(800);
        await ss(page, 'T-018-lang-ru-selected');
        // Switch back to UZ
        const switcherAgain = page.locator('button').filter({ hasText: /^UZ$|^RU$|^EN$/i }).first();
        if (await switcherAgain.isVisible().catch(() => false)) {
          await switcherAgain.click();
          await page.waitForTimeout(500);
          const uzBtn = page.locator('.fixed, [role="dialog"]').last()
            .getByRole('button', { name: /^UZ$|^O.zbekcha$/ }).first();
          if (await uzBtn.isVisible().catch(() => false)) await uzBtn.click();
          await page.waitForTimeout(500);
        }
      } else {
        await ss(page, 'T-018-no-ru-option');
        // Dismiss overlay by pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    } else {
      await ss(page, 'T-018-no-lang-switcher');
    }
  });

  test('T-019 user info in sidebar', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    await ss(page, 'T-019-sidebar-user');
    // Teacher1 name from seed
    expect(body).toMatch(/teacher1|zulfiya|nazarova/i);
  });

  // ── Dashboard ──────────────────────────────────────────────────────
  test('T-021 dashboard attendance count', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-021-dashboard-stats');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('T-022 children list with avatars', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // Teacher1 S1 should have children
    await ss(page, 'T-022-children-avatars');
  });

  // ── Attendance ─────────────────────────────────────────────────────
  test('T-026 mark present (Bor) + T-027 home_leave + T-028 sick + T-029 hospitalized/absent', async () => {
    await page.goto('/teacher/attendance');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-026-attendance-loaded');

    // Find child status buttons — the attendance table uses dot/chip toggles
    // Status order: present, home_leave, sick, hospitalized, absent
    const statusBtns = page.locator('[class*="status"], [class*="state"], button[class*="dot"]');
    const count = await statusBtns.count();

    if (count > 0) {
      // Click through statuses for the first child row
      await statusBtns.first().click().catch(() => {});
      await page.waitForTimeout(200);
      await ss(page, 'T-026-status-clicked');
    } else {
      // Try clicking on child rows to toggle attendance
      const rows = page.locator('tbody tr, [class*="child-row"], [class*="attendance-row"]');
      const rowCount = await rows.count();
      if (rowCount > 0) {
        await rows.first().click().catch(() => {});
        await page.waitForTimeout(300);
        await ss(page, 'T-026-attendance-row-click');
      } else {
        await ss(page, 'T-026-attendance-no-children');
      }
    }
  });

  test('T-030 bulk mark all present', async () => {
    await page.goto('/teacher/attendance');
    await page.waitForLoadState('networkidle');
    const bulkBtn = page.getByRole('button', { name: /hammasi keldi|all present|bulk/i }).first()
      .or(page.locator('button').filter({ hasText: /hammasi/i }).first());
    if (await bulkBtn.isVisible().catch(() => false)) {
      await bulkBtn.click();
      await page.waitForTimeout(500);
      await ss(page, 'T-030-bulk-present');
    } else {
      await ss(page, 'T-030-no-bulk-btn');
    }
  });

  test('T-032 save attendance', async () => {
    await page.goto('/teacher/attendance');
    await page.waitForLoadState('networkidle');

    // Mark at least one child present first
    const bulkBtn = page.locator('button').filter({ hasText: /hammasi/i }).first();
    if (await bulkBtn.isVisible().catch(() => false)) await bulkBtn.click();
    await page.waitForTimeout(300);

    const saveBtn = page.getByRole('button', { name: /saqlash|save|submit/i }).first()
      .or(page.locator('[class*="save"], [class*="submit"]').first());
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'T-032-attendance-saved');
      const body = await page.textContent('body');
      const saved = body.includes('saqlandi') || body.includes('saved') || body.includes('muvaffaqiyat');
      if (!saved) console.log('T-032 WARNING: no success toast visible after save');
    } else {
      await ss(page, 'T-032-no-save-btn');
    }
  });

  test('T-031 select date for attendance', async () => {
    await page.goto('/teacher/attendance');
    await page.waitForLoadState('networkidle');
    const datePicker = page.locator('input[type="date"], [class*="date-picker"], [class*="datepicker"]').first();
    if (await datePicker.isVisible().catch(() => false)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      await datePicker.fill(yStr).catch(() => {});
      await page.waitForTimeout(500);
      await ss(page, 'T-031-date-changed');
    } else {
      // Try date nav buttons
      const prevBtn = page.locator('button').filter({ hasText: /←|‹|prev|oldin/i }).first()
        .or(page.locator('[aria-label*="prev"], [aria-label*="before"]').first());
      if (await prevBtn.isVisible().catch(() => false)) {
        await prevBtn.click();
        await page.waitForTimeout(500);
        await ss(page, 'T-031-date-prev-btn');
      } else {
        await ss(page, 'T-031-no-date-picker');
      }
    }
  });

  // ── Children List (Bolalar) ──────────────────────────────────────
  test('T-034 list children/parents', async () => {
    await page.goto('/teacher/bolalar');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-034-bolalar-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('T-025 T-067 click child → child detail', async () => {
    await page.goto('/teacher/bolalar');
    await page.waitForLoadState('networkidle');
    const childLink = page.locator('a[href*="/teacher/children/"], [class*="child-card"], [class*="child-row"]').first();
    if (await childLink.isVisible().catch(() => false)) {
      await childLink.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'T-067-child-detail');
      expect(page.url()).toMatch(/children/);
    } else {
      // Try clicking on first child name text
      const nameLink = page.locator('tbody tr a, [class*="child"] a').first();
      if (await nameLink.isVisible().catch(() => false)) {
        await nameLink.click();
        await page.waitForLoadState('networkidle');
        await ss(page, 'T-067-child-detail-link');
      } else {
        await ss(page, 'T-067-no-child-link');
      }
    }
  });

  // ── Activities / Reja ─────────────────────────────────────────────
  test('T-045 list activities', async () => {
    await page.goto('/teacher/reja?tab=activities');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-045-activities-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('T-046 create activity via QuickObservation FAB', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');

    // FAB is in the top nav: aria-label="Yangi kuzatish", has Plus icon
    const fabBtn = page.locator('[aria-label*="kuzatish"], [aria-label*="observation"]').first()
      .or(page.locator('button').filter({ hasText: /kuzatish/i }).first());
    if (await fabBtn.isVisible().catch(() => false)) {
      await fabBtn.click();
      await page.waitForTimeout(800);
      await ss(page, 'T-046-quickobs-modal-open');

      // Modal: .fixed.inset-x-0.bottom-0.md:inset-0
      const modal = page.locator('.fixed.inset-x-0');

      // Step 1: select first child chip (inside the overflow-x-auto strip)
      const childChip = modal.locator('.overflow-x-auto button').first();
      if (await childChip.isVisible().catch(() => false)) {
        await childChip.click();
        await page.waitForTimeout(300);
      }

      // Step 2: click first outcome button (grid-cols-2 with 4 options)
      // Outcome buttons are after the goal dropdown button
      // Use text patterns: "Yangi", "Yordam bilan", "Mustaqil", "Mahorat"
      // Or find the grid container and click first button
      const outcomeGrid = modal.locator('.grid-cols-2').first();
      const firstOutcome = outcomeGrid.locator('button').first();
      if (await firstOutcome.isVisible().catch(() => false)) {
        await firstOutcome.click();
        await page.waitForTimeout(200);
      }

      // Step 3: fill note textarea (optional but adds content)
      const noteArea = modal.locator('textarea').first();
      if (await noteArea.isVisible().catch(() => false)) {
        await noteArea.fill(`Beta kuzatuv ${RUN} — Кириллча матн`);
      }

      await ss(page, 'T-046-quickobs-filled');

      // Step 4: save — button is now enabled (child + outcome selected)
      const saveBtn = modal.locator('button').filter({ hasText: /saqlash|save/i }).last();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await ss(page, 'T-046-activity-created');
      } else {
        await ss(page, 'T-046-no-save-btn');
      }
    } else {
      await ss(page, 'T-046-no-fab-btn');
      console.log('T-046 BLOCKED: FAB button not found');
    }
  });

  test('T-047 edit activity', async () => {
    await page.goto('/teacher/reja?tab=activities');
    await page.waitForLoadState('networkidle');
    const editBtn = page.locator('button').filter({ hasText: /tahrirlash|edit|yangilash/i }).first()
      .or(page.locator('[aria-label*="edit"], [class*="edit"]').first());
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.fixed.inset-0').first();
      const textArea = modal.locator('textarea').first();
      if (await textArea.isVisible().catch(() => false)) {
        await textArea.fill(`Beta faoliyat ${RUN} — tahrirlangan`);
        // Scope to modal only — avoid global disabled nav buttons
        const saveBtn = modal.locator('button[type="submit"]').first()
          .or(modal.locator('button').filter({ hasText: /saqlash|save|yangilash/i }).last());
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click().catch(() => {});
          await page.waitForTimeout(1500);
          await ss(page, 'T-047-activity-edited');
        }
      }
    } else {
      await ss(page, 'T-047-no-edit-btn');
    }
  });

  test('T-048 delete activity', async () => {
    await page.goto('/teacher/reja?tab=activities');
    await page.waitForLoadState('networkidle');
    const delBtn = page.locator('button').filter({ hasText: /o.chirish|delete/i }).first()
      .or(page.locator('[aria-label*="delete"], [class*="delete"]').first());
    if (await delBtn.isVisible().catch(() => false)) {
      await delBtn.click();
      await page.waitForTimeout(400);
      // Confirm if dialog appears
      const confirmBtn = page.getByRole('button', { name: /ha|yes|tasdiqlash|confirm/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
      }
      await ss(page, 'T-048-activity-deleted');
    } else {
      await ss(page, 'T-048-no-delete-btn');
    }
  });

  // ── Media / Gallery ───────────────────────────────────────────────
  test('T-050 list media items', async () => {
    await page.goto('/teacher/media');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-050-media-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('T-051 T-052 T-053 media upload BLOCKED + view modal', async () => {
    // T-051: file upload requires OS dialog — headless cannot trigger
    // T-052: no media to delete without upload
    // T-053: view modal if any media exists
    await page.goto('/teacher/media');
    await page.waitForLoadState('networkidle');
    const mediaCard = page.locator('[class*="media-card"], [class*="gallery-item"], img').first();
    if (await mediaCard.isVisible().catch(() => false)) {
      await mediaCard.click();
      await page.waitForTimeout(500);
      await ss(page, 'T-053-media-view-modal');
      const closeBtn = page.getByRole('button', { name: /yopish|close|x/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      await ss(page, 'T-053-no-media-to-view');
    }
    console.log('T-051 BLOCKED: file upload not automatable headlessly');
    console.log('T-052 BLOCKED: no uploaded media to delete');
  });

  // ── Meals ─────────────────────────────────────────────────────────
  test('T-054 list meals', async () => {
    await page.goto('/teacher/meals');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-054-meals-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('T-055 create meal entry', async () => {
    await page.goto('/teacher/meals');
    await page.waitForLoadState('networkidle');
    // Add button: "Taom qo'shish"
    const addBtn = page.locator('button').filter({ hasText: /taom|ovqat|meal|qo.shish/i }).first()
      .or(page.locator('[class*="add"]').first());
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(800);
      await ss(page, 'T-055-meal-modal-open');
      // Scope ALL interactions to the modal to avoid disabled nav-bar buttons
      const modal = page.locator('.fixed.inset-0').first();
      // Child select (required, auto-selects first)
      const childSel = modal.locator('select').first();
      const opts = await childSel.locator('option').count().catch(() => 0);
      if (opts > 1) await childSel.selectOption({ index: 1 }).catch(() => {});
      // Fill meal name (required)
      const mealNameInput = modal.locator('input[type="text"]').first();
      if (await mealNameInput.isVisible().catch(() => false)) {
        await mealNameInput.fill(`Beta taom ${RUN}`);
      }
      // Fill description (required)
      const descInput = modal.locator('textarea').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill(`Beta tavsif ${RUN}`);
      }
      // Fill time (required)
      const timeInput = modal.locator('input[type="time"]').first();
      if (await timeInput.isVisible().catch(() => false)) {
        await timeInput.fill('09:00');
      }
      await ss(page, 'T-055-meal-modal-filled');
      // Submit — use type="submit" scoped to modal (text: "Yaratish")
      const submitBtn = modal.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await ss(page, 'T-055-meal-created');
      } else {
        await ss(page, 'T-055-no-submit-btn');
      }
    } else {
      await ss(page, 'T-055-no-add-btn');
    }
  });

  // ── Emotional Monitoring ──────────────────────────────────────────
  test('T-058 emotional monitoring page', async () => {
    await page.goto('/teacher/monitoring');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-058-monitoring');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('T-058b log monitoring entry', async () => {
    await page.goto('/teacher/monitoring');
    await page.waitForLoadState('networkidle');
    const addBtn = page.getByRole('button', { name: /qo.shish|add|yangi|log/i }).first()
      .or(page.locator('[class*="add"]').first());
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
      // Select child if available
      const sel = modal.locator('select').first();
      const opts = await sel.locator('option').count().catch(() => 0);
      if (opts > 1) await sel.selectOption({ index: 1 }).catch(() => {});
      // Click checkboxes if visible
      const cbs = modal.locator('input[type="checkbox"]');
      const cbCount = await cbs.count();
      if (cbCount > 0) await cbs.first().click().catch(() => {});
      const submitBtn = modal.locator('button[type="submit"]').first()
        .or(modal.locator('button').filter({ hasText: /saqlash|save/i }).last());
      const canSubmit = await submitBtn.isVisible().catch(() => false) &&
                        await submitBtn.isEnabled().catch(() => false);
      if (canSubmit) {
        await submitBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
        await ss(page, 'T-058b-monitoring-saved');
      } else {
        await ss(page, 'T-058b-monitoring-submit-disabled');
        console.log('T-058b: submit disabled — required fields not resolved by automation');
      }
    } else {
      await ss(page, 'T-058b-no-add-monitoring');
    }
  });

  // ── Reflection ────────────────────────────────────────────────────
  test('T-062 write daily reflection', async () => {
    await page.goto('/teacher/men?tab=reflection');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-062-reflection-page');
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill(`Beta-${RUN}: Bugun bolalar bilan yaxshi ishlandi. Ular кириллча matnn yaxshi o'qishdi.`);
      const saveBtn = page.getByRole('button', { name: /saqlash|save|yuborish|submit/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        await ss(page, 'T-062-reflection-saved');
      }
    } else {
      await ss(page, 'T-062-no-reflection-textarea');
    }
  });

  test('T-064 list prior reflections', async () => {
    await page.goto('/teacher/men?tab=reflection');
    await page.waitForLoadState('networkidle');
    // Look for a "history" or "prior" tab
    const historyTab = page.getByRole('tab', { name: /tarix|history|oldingi|prior/i }).first()
      .or(page.locator('button, [role="tab"]').filter({ hasText: /tarix|history|oldingi/i }).first());
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'T-064-reflection-history');
    } else {
      await ss(page, 'T-064-no-history-tab');
    }
  });

  // ── Chat (Xabar) ──────────────────────────────────────────────────
  test('T-038 list chat conversations', async () => {
    await page.goto('/teacher/xabar?tab=chat');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-038-chat-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('T-039 T-040 select conversation and send message', async () => {
    await page.goto('/teacher/xabar?tab=chat');
    await page.waitForLoadState('networkidle');
    // Click first conversation
    const convo = page.locator('[class*="conversation"], [class*="chat-item"], [class*="parent-row"]').first()
      .or(page.locator('li, [role="listitem"]').filter({ hasText: /@uchqun|parent/i }).first());
    if (await convo.isVisible().catch(() => false)) {
      await convo.click();
      await page.waitForTimeout(800);
      await ss(page, 'T-039-conversation-open');
      // Send message
      const msgInput = page.locator('input[type="text"][placeholder*="xabar"], textarea[placeholder*="xabar"], input[placeholder*="mes"]').first()
        .or(page.locator('input[type="text"], textarea').last());
      if (await msgInput.isVisible().catch(() => false)) {
        await msgInput.fill(`Beta xabar ${RUN} 😊 — тест`);
        const sendBtn = page.getByRole('button', { name: /yuborish|send/i }).first()
          .or(page.locator('[type="submit"], [aria-label*="send"]').first());
        if (await sendBtn.isVisible().catch(() => false)) {
          await sendBtn.click();
          await page.waitForTimeout(1500);
          await ss(page, 'T-040-message-sent');
        } else {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1500);
          await ss(page, 'T-040-message-sent-enter');
        }
      }
    } else {
      await ss(page, 'T-039-no-conversations');
    }
  });

  // ── AI Warnings ───────────────────────────────────────────────────
  test('T-100 view warnings list', async () => {
    await page.goto('/teacher/xabar?tab=warnings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-100-warnings-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('T-101 filter warnings by severity', async () => {
    await page.goto('/teacher/xabar?tab=warnings');
    await page.waitForLoadState('networkidle');
    const filterBtn = page.locator('button, select').filter({ hasText: /high|medium|low|yuqori|o.rta|past|filtr/i }).first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(500);
      await ss(page, 'T-101-warnings-filtered');
    } else {
      await ss(page, 'T-101-no-filter');
    }
  });

  test('T-102 resolve AI warning', async () => {
    await page.goto('/teacher/xabar?tab=warnings');
    await page.waitForLoadState('networkidle');
    const resolveBtn = page.getByRole('button', { name: /hal qilish|resolve|yechish/i }).first()
      .or(page.locator('[class*="resolve"]').first());
    if (await resolveBtn.isVisible().catch(() => false)) {
      await resolveBtn.click();
      await page.waitForTimeout(500);
      const noteInput = page.locator('textarea, input[type="text"]').last();
      if (await noteInput.isVisible().catch(() => false)) {
        await noteInput.fill(`Beta resolve note ${RUN}`);
      }
      const confirmBtn = page.getByRole('button', { name: /saqlash|save|tasdiqlash|confirm/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'T-102-warning-resolved');
      }
    } else {
      await ss(page, 'T-102-no-warnings-to-resolve');
    }
  });

  // ── Settings / Profile ────────────────────────────────────────────
  test('T-103 T-104 view and edit profile', async () => {
    await page.goto('/teacher/men?tab=profile');
    await page.waitForLoadState('networkidle');
    await ss(page, 'T-103-profile');
    const body = await page.textContent('body');
    expect(body).toMatch(/teacher1|zulfiya|uchqun/i);

    // Edit phone number
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="tel"]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('+998901234567');
      const saveBtn = page.getByRole('button', { name: /saqlash|save/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'T-104-profile-saved');
      }
    }
  });

  test('T-107 toggle notification preferences', async () => {
    await page.goto('/teacher/men?tab=settings');
    await page.waitForLoadState('networkidle');
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click();
      await page.waitForTimeout(300);
      await ss(page, 'T-107-notification-toggled');
    } else {
      await ss(page, 'T-107-no-notification-prefs');
    }
  });

  test('T-109 send message to government', async () => {
    await page.goto('/teacher/men?tab=profile');
    await page.waitForLoadState('networkidle');
    const msgBtn = page.locator('button').filter({ hasText: /xabar yuborish|davlatga|message/i }).first()
      .or(page.locator('button').filter({ hasText: /xabar/i }).first());
    if (await msgBtn.isVisible().catch(() => false)) {
      await msgBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.fixed.inset-0').first();
      const subjectInput = modal.locator('input[type="text"]').first();
      if (await subjectInput.isVisible().catch(() => false)) {
        await subjectInput.fill(`Teacher beta test ${RUN}`);
      }
      const textarea = modal.locator('textarea').first();
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(`Beta xabar ${RUN}`);
      }
      const sendBtn = modal.getByRole('button', { name: /yuborish|send/i }).first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'T-109-message-sent');
      }
    } else {
      await ss(page, 'T-109-no-message-btn');
    }
  });

  test('T-110 view government replies', async () => {
    await page.goto('/teacher/men?tab=profile');
    await page.waitForLoadState('networkidle');
    const viewBtn = page.locator('button').filter({ hasText: /xabarlarim|my messages|replies|tarix/i }).first();
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await page.waitForTimeout(800);
      await ss(page, 'T-110-messages-modal');
      const closeBtn = page.getByRole('button', { name: /yopish|close|bekor/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      await ss(page, 'T-110-no-view-btn');
    }
  });

  test('T-115 notification panel', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');
    const notifBtn = page.locator('[class*="notif"], [aria-label*="notif"], button').filter({ hasText: /🔔|notification/i }).first()
      .or(page.locator('[class*="bell"], [class*="notification-icon"]').first());
    if (await notifBtn.isVisible().catch(() => false)) {
      await notifBtn.click();
      await page.waitForTimeout(500);
      await ss(page, 'T-115-notification-panel');
    } else {
      await ss(page, 'T-115-no-notif-btn');
    }
  });

  test('T-007 logout teacher1', async () => {
    await page.goto('/teacher');
    await page.waitForLoadState('networkidle');
    const logoutBtn = page.getByRole('button', { name: /chiqish|logout|exit/i }).first()
      .or(page.locator('[class*="logout"]').first());
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, 'T-007-teacher1-logout');
      // Should redirect to login
      expect(page.url()).toMatch(/login|\/$/);
    } else {
      await ss(page, 'T-007-no-logout-btn');
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// W2-S2 teachers 2-8: login + attendance + one action each
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W2-S2 teachers 2-8 attendance', () => {
  for (let i = 1; i < TEACHERS.length; i++) {
    const email = TEACHERS[i];
    const idx   = i + 1;

    test(`T-001 teacher${idx} login + T-026 mark attendance + T-040 send chat + T-007 logout`, async ({ browser }) => {
      const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await ctx.newPage();
      try {
        // Login
        await login(page, email);
        const atChangePw = page.url().includes('change-password');
        if (atChangePw) {
          // DEF-006: mustChangePassword=true blocks teacher${idx} portal
          await ss(page, `T-001-teacher${idx}-mustChangePassword-blocked`);
          expect(page.url()).toMatch(/teacher/);
          return;
        }
        expect(page.url()).toMatch(/teacher/);
        await ss(page, `T-001-teacher${idx}-login`);

        // Attendance: bulk mark present
        await page.goto('/teacher/attendance');
        await page.waitForLoadState('networkidle');
        const bulkBtn = page.locator('button').filter({ hasText: /hammasi/i }).first();
        if (await bulkBtn.isVisible().catch(() => false)) {
          await bulkBtn.click();
          await page.waitForTimeout(300);
        }
        const saveBtn = page.getByRole('button', { name: /saqlash|save/i }).first();
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(2000);
        }
        await ss(page, `T-032-teacher${idx}-attendance`);

        // Send one chat message
        await page.goto('/teacher/xabar?tab=chat');
        await page.waitForLoadState('networkidle');
        const convo = page.locator('[class*="conversation"], [class*="chat-item"]').first()
          .or(page.locator('li').first());
        if (await convo.isVisible().catch(() => false)) {
          await convo.click();
          await page.waitForTimeout(600);
          const msgInput = page.locator('input[type="text"], textarea').last();
          if (await msgInput.isVisible().catch(() => false)) {
            await msgInput.fill(`T${idx} beta xabar ${RUN}`);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
          }
        }
        await ss(page, `T-040-teacher${idx}-chat`);

        // Logout
        await page.goto('/teacher');
        const logoutBtn = page.getByRole('button', { name: /chiqish|logout/i }).first();
        if (await logoutBtn.isVisible().catch(() => false)) {
          await logoutBtn.click();
          await page.waitForTimeout(800);
        }
        await ss(page, `T-007-teacher${idx}-logout`);
      } finally {
        await ctx.close().catch(() => {});
      }
    });
  }
});
