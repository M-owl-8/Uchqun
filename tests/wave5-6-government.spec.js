// Waves 5–6 — Government Portal
// S14 / BETA-VERIFICATION — DO NOT FIX, RECORD ONLY
// Wave 5: gov.toshkent, gov.samarqand (region accounts)
// Wave 6: gov.republic (republic account)
// URL: https://government-production.up.railway.app
// Routes: all prefixed /government/

const { test, expect } = require('@playwright/test');

const BASE = 'https://government-production.up.railway.app';
const PW   = 'Test@2026';
const RUN  = Date.now().toString().slice(-5);

const GOV_REGION = [
  { email: 'gov.toshkent@uchqun.uz',  label: 'toshkent',  region: 'Toshkent' },
  { email: 'gov.samarqand@uchqun.uz', label: 'samarqand', region: 'Samarqand' },
];
const GOV_REPUBLIC = 'gov.republic@uchqun.uz';

const ss = (page, name) =>
  page.screenshot({ path: `audits/beta/screens/${name}.png`, fullPage: false }).catch(() => {});

async function login(page, email, password = PW) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  const btn = page.getByRole('button', { name: /kirish|login|sign in/i }).first();
  await btn.click();
  await page.waitForURL(
    url => !url.href.includes('/login') && !url.href.includes('/change-password'),
    { timeout: 25000 }
  ).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────
// WAVE 5 — Region accounts (gov.toshkent + gov.samarqand)
// Each sees ONLY their own region's data (tenant isolation)
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W5 region accounts', () => {
  for (const govUser of GOV_REGION) {
    const { email, label, region } = govUser;

    test(`G-001 gov.${label} login + G-006 dashboard + G-013 schools + G-057 audit + G-004 logout`, async ({ browser }) => {
      const ctx = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 800 },
        baseURL: BASE,
      });
      const page = await ctx.newPage();
      try {
        await login(page, email);
        if (page.url().includes('/login')) {
          await ss(page, `G-001-${label}-login-failed`);
          console.log(`G-001 gov.${label} login failed — URL stayed at /login (DEF-009)`);
          return;
        }
        await ss(page, `G-001-${label}-login`);
        expect(page.url()).toMatch(/\/government/);

        // G-006 G-007: Dashboard with region scope label
        await page.goto('/government');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-006-${label}-dashboard`);
        const body = await page.textContent('body');
        expect(body.length).toBeGreaterThan(50);

        // G-013: Schools list (region-scoped — should see 2 schools only)
        await page.goto('/government/schools');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-013-${label}-schools`);

        // G-029: Students list (region-scoped)
        await page.goto('/government/students');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-029-${label}-students`);

        // G-032: Teachers list (region-scoped)
        await page.goto('/government/teachers');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-032-${label}-teachers`);

        // G-057: Audit log (region-scoped)
        await page.goto('/government/audit-log');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-057-${label}-audit-log`);

        // G-062: AI warnings
        await page.goto('/government/warnings');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-062-${label}-warnings`);

        // Ratings page
        await page.goto('/government/ratings');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-024-${label}-ratings`);

        // Platform page (messages, admins, gov users, registrations)
        await page.goto('/government/platform');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-037-${label}-platform`);

        // Profile
        await page.goto('/government/profile');
        await page.waitForLoadState('networkidle');
        await ss(page, `G-074-${label}-profile`);

        // G-004: Logout
        const logoutBtn = page.getByRole('button', { name: /chiqish|logout/i }).first()
          .or(page.locator('[class*="logout"]').first());
        if (await logoutBtn.isVisible().catch(() => false)) {
          await logoutBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(800);
          await ss(page, `G-004-${label}-logout`);
        } else {
          await ss(page, `G-004-${label}-no-logout-btn`);
        }
      } finally {
        await ctx.close().catch(() => {});
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// WAVE 6 — Republic account (gov.republic)
// Full aggregate view across all 4 schools + all regions
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W6 republic account full day', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
      baseURL: BASE,
    });
    page = await ctx.newPage();
  });

  test.afterAll(async () => {
    await page.context().close().catch(() => {});
  });

  // ── Auth ──────────────────────────────────────────────────────────
  test('G-001 login gov.republic', async () => {
    await login(page, GOV_REPUBLIC);
    if (page.url().includes('/login')) {
      await ss(page, 'G-001-republic-login-failed');
      console.log('G-001 gov.republic login failed — URL stayed at /login (DEF-009)');
      return;
    }
    await ss(page, 'G-001-republic-login');
    expect(page.url()).toMatch(/\/government/);
  });

  test('G-002 password visibility toggle on login', async () => {
    // Clear auth cookies so we can reach the login page while still logged in
    await page.context().clearCookies();
    await page.goto('/login');
    // Wait with a short timeout — may redirect to /government if cookie was HttpOnly and not cleared
    await page.waitForSelector('input[type="password"]', { timeout: 8000 }).catch(() => {});
    const pwInput = page.locator('input[type="password"]');
    if (await pwInput.isVisible().catch(() => false)) {
      const toggle = pwInput.locator('..').getByRole('button').first()
        .or(page.locator('[class*="eye"], [aria-label*="show"]').first());
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(300);
        await ss(page, 'G-002-password-toggle');
      } else {
        await ss(page, 'G-002-no-toggle');
      }
    } else {
      // Authenticated redirect — login page not reachable; test skipped
      await ss(page, 'G-002-login-not-reachable');
    }
    await login(page, GOV_REPUBLIC);
  });

  test('G-071 language switcher', async () => {
    const switcher = page.locator('[aria-haspopup="listbox"]').first()
      .or(page.locator('button').filter({ hasText: /O.zbekcha|Русский|English|UZ|RU|EN/i }).first());
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(400);
      await ss(page, 'G-071-lang-switcher-open');
      const ruOption = page.locator('[role="listbox"] button, [role="option"]').filter({ hasText: /Русский|RU/ }).first();
      if (await ruOption.isVisible().catch(() => false)) {
        await ruOption.click();
        await page.waitForTimeout(300);
        await ss(page, 'G-071-lang-ru-selected');
        // Switch back
        const switcher2 = page.locator('[aria-haspopup="listbox"]').first();
        if (await switcher2.isVisible().catch(() => false)) {
          await switcher2.click();
          await page.waitForTimeout(300);
          const uzOption = page.locator('[role="listbox"] button, [role="option"]').filter({ hasText: /O.zbekcha|UZ/ }).first();
          if (await uzOption.isVisible().catch(() => false)) await uzOption.click();
        }
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
    } else {
      await ss(page, 'G-071-no-lang-switcher');
    }
  });

  // ── Dashboard ─────────────────────────────────────────────────────
  test('G-006 G-007 G-008 G-009 G-010 G-011 dashboard', async () => {
    await page.goto('/government');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-006-republic-dashboard');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
    // Scroll down to see regional breakdown (G-010)
    await page.evaluate(() => window.scrollBy(0, 400));
    await ss(page, 'G-010-regional-breakdown');
    // Refresh button (G-011)
    const refreshBtn = page.getByRole('button', { name: /yangilash|refresh/i }).first()
      .or(page.locator('[class*="refresh"], [aria-label*="refresh"]').first());
    if (await refreshBtn.isVisible().catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, 'G-011-dashboard-refreshed');
    }
  });

  // ── Schools Management ────────────────────────────────────────────
  test('G-013 G-014 G-015 G-016 schools list + search + filter', async () => {
    await page.goto('/government/schools');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-013-republic-schools');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    // Search (G-014)
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Toshkent');
      await page.waitForTimeout(800);
      await ss(page, 'G-014-schools-search');
      await searchInput.clear();
      await page.waitForTimeout(400);
    }
    // Filter by type (G-015)
    const typeFilter = page.locator('select, [class*="filter"]').first();
    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(500);
      await ss(page, 'G-015-schools-filtered');
    }
  });

  test('G-017 export schools CSV', async () => {
    await page.goto('/government/schools');
    await page.waitForLoadState('networkidle');
    const exportBtn = page.getByRole('button', { name: /export|csv|yuklab/i }).first()
      .or(page.locator('[class*="export"]').first());
    if (await exportBtn.isVisible().catch(() => false)) {
      // Don't wait for download — just click and screenshot
      await exportBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
      await ss(page, 'G-017-export-clicked');
    } else {
      await ss(page, 'G-017-no-export-btn');
    }
  });

  test('G-018 G-019 G-020 G-021 school detail', async () => {
    await page.goto('/government/schools');
    await page.waitForLoadState('networkidle');
    const firstSchool = page.locator('tbody tr, [class*="row"], [class*="card"]').first();
    if (await firstSchool.isVisible().catch(() => false)) {
      await firstSchool.click({ force: true }).catch(() => {});
      await page.waitForLoadState('networkidle');
      await ss(page, 'G-018-school-detail');
      const body = await page.textContent('body');
      expect(body.length).toBeGreaterThan(50);
      await page.evaluate(() => window.scrollBy(0, 400));
      await ss(page, 'G-020-school-detail-scroll');
    } else {
      await ss(page, 'G-018-no-schools');
    }
  });

  test('G-022 G-023 archive + reactivate school', async () => {
    await page.goto('/government/schools');
    await page.waitForLoadState('networkidle');
    const archiveBtn = page.getByRole('button', { name: /arxivlash|archive/i }).first()
      .or(page.locator('[class*="archive"]').first());
    if (await archiveBtn.isVisible().catch(() => false)) {
      await archiveBtn.click();
      await page.waitForTimeout(800);
      await ss(page, 'G-022-school-archived');
      // Try to reactivate
      const reactivateBtn = page.getByRole('button', { name: /qayta faollashtirish|reactivate|restore/i }).first();
      if (await reactivateBtn.isVisible().catch(() => false)) {
        await reactivateBtn.click();
        await page.waitForTimeout(800);
        await ss(page, 'G-023-school-reactivated');
      }
    } else {
      await ss(page, 'G-022-no-archive-btn');
    }
  });

  // ── Ratings ───────────────────────────────────────────────────────
  test('G-024 G-025 G-027 G-028 ratings page', async () => {
    await page.goto('/government/ratings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-024-republic-ratings');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    // Toggle direction (parent ↔ gov) G-028
    const directionToggle = page.locator('[class*="toggle"], [role="tab"], button').filter({ hasText: /hukumat|government|ota.ona|parent/i }).first();
    if (await directionToggle.isVisible().catch(() => false)) {
      await directionToggle.click();
      await page.waitForTimeout(600);
      await ss(page, 'G-028-ratings-gov-direction');
    }
    // Rate school (G-027) — look for a rating form
    const rateBtn = page.getByRole('button', { name: /baholash|rate|give rating/i }).first()
      .or(page.locator('[class*="rate-btn"], [class*="star"]').first());
    if (await rateBtn.isVisible().catch(() => false)) {
      await rateBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'G-027-gov-rate-school');
      await page.keyboard.press('Escape').catch(() => {});
    }
    // Expand school card (G-025)
    const expandBtn = page.locator('[class*="expand"], [aria-label*="expand"]').first()
      .or(page.locator('button').filter({ hasText: /ko.proq|more|expand/i }).first());
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'G-025-ratings-expanded');
    }
  });

  // ── User Directories ──────────────────────────────────────────────
  test('G-029 G-030 G-031 students', async () => {
    await page.goto('/government/students');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-029-republic-students');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Beta');
      await page.waitForTimeout(800);
      await ss(page, 'G-030-students-search');
      await searchInput.clear();
    }
  });

  test('G-032 G-033 teachers', async () => {
    await page.goto('/government/teachers');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-032-republic-teachers');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Zulfiya');
      await page.waitForTimeout(800);
      await ss(page, 'G-033-teachers-search');
      await searchInput.clear();
    }
  });

  test('G-035 parents', async () => {
    await page.goto('/government/parents');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-035-republic-parents');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Platform (Messages, Admin Provisioning, Gov Users, Registrations) ──
  test('G-037 G-038 G-039 G-040 messages', async () => {
    await page.goto('/government/platform');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-037-platform-page');
    // Navigate to messages tab if visible
    const messagesTab = page.locator('[role="tab"], button').filter({ hasText: /xabar|message/i }).first();
    if (await messagesTab.isVisible().catch(() => false)) {
      await messagesTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'G-037-messages-tab');
    }
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('parent');
      await page.waitForTimeout(800);
      await ss(page, 'G-038-messages-search');
      await searchInput.clear();
    }
    // Mark read / reply
    const firstMsg = page.locator('[class*="message"], tr, [class*="row"]').first();
    if (await firstMsg.isVisible().catch(() => false)) {
      await firstMsg.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      await ss(page, 'G-039-message-opened');
      // Reply
      const replyInput = page.locator('textarea, input[type="text"]').last();
      if (await replyInput.isVisible().catch(() => false)) {
        await replyInput.fill(`Gov beta reply ${RUN}`);
        const sendBtn = page.getByRole('button', { name: /yuborish|send/i }).first();
        if (await sendBtn.isVisible().catch(() => false)) {
          await sendBtn.click();
          await page.waitForTimeout(1000);
          await ss(page, 'G-040-message-reply-sent');
        }
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
  });

  test('G-043 G-044 G-045 G-046 admin provisioning', async () => {
    await page.goto('/government/platform');
    await page.waitForLoadState('networkidle');
    // Admins tab
    const adminsTab = page.locator('[role="tab"], button').filter({ hasText: /admin|maktab rahbar/i }).first();
    if (await adminsTab.isVisible().catch(() => false)) {
      await adminsTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'G-043-admins-tab');
    } else {
      await ss(page, 'G-043-no-admins-tab');
    }
    // Create admin
    const createBtn = page.getByRole('button', { name: /yangi|create|qo.shish/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'G-044-create-admin-modal');
      await page.keyboard.press('Escape').catch(() => {});
    }
  });

  test('G-047 G-048 G-050 G-051 government user provisioning', async () => {
    await page.goto('/government/platform');
    await page.waitForLoadState('networkidle');
    const govUsersTab = page.locator('[role="tab"], button').filter({ hasText: /hukumat|government user|gov/i }).first();
    if (await govUsersTab.isVisible().catch(() => false)) {
      await govUsersTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'G-047-gov-users-tab');
    } else {
      await ss(page, 'G-047-no-gov-users-tab');
    }
    // Provision secondary user
    const createBtn = page.getByRole('button', { name: /yangi|create|qo.shish/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'G-048-provision-modal');
      // Check for canRateSchools checkbox label — DEF-004 (raw i18n key)
      const rateSchoolsLabel = page.locator('[class*="grant"], [class*="capability"]').filter({ hasText: /canRateSchools|baholash|rate/i }).first();
      if (await rateSchoolsLabel.isVisible().catch(() => false)) {
        await ss(page, 'G-050-canRateSchools-label');
      }
      await page.keyboard.press('Escape').catch(() => {});
    }
  });

  test('G-053 G-054 G-055 registration requests', async () => {
    await page.goto('/government/platform');
    await page.waitForLoadState('networkidle');
    const regsTab = page.locator('[role="tab"], button').filter({ hasText: /ariza|registr|so.rov/i }).first();
    if (await regsTab.isVisible().catch(() => false)) {
      await regsTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'G-053-registrations-tab');
      // Approve first pending request
      const approveBtn = page.getByRole('button', { name: /tasdiqlash|approve/i }).first();
      if (await approveBtn.isVisible().catch(() => false)) {
        await approveBtn.click();
        await page.waitForTimeout(1000);
        await ss(page, 'G-054-registration-approved');
      } else {
        await ss(page, 'G-054-no-pending-registrations');
      }
    } else {
      await ss(page, 'G-053-no-registrations-tab');
    }
  });

  // ── Audit Log ─────────────────────────────────────────────────────
  test('G-057 G-058 G-059 G-060 G-061 audit log', async () => {
    await page.goto('/government/audit-log');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-057-audit-log');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    // Filter by action (G-058)
    const actionFilter = page.locator('select, [class*="filter"]').first();
    if (await actionFilter.isVisible().catch(() => false)) {
      await actionFilter.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(600);
      await ss(page, 'G-058-audit-filter-action');
    }
    // Paginate (G-061)
    await page.evaluate(() => window.scrollBy(0, 600));
    await ss(page, 'G-061-audit-scroll');
  });

  // ── AI Warnings ───────────────────────────────────────────────────
  test('G-062 G-063 G-064 G-065 AI warnings', async () => {
    await page.goto('/government/warnings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-062-warnings');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    // Filter by severity (G-063)
    const severityBtn = page.locator('[class*="severity"], button').filter({ hasText: /yuqori|high|medium|past|low/i }).first();
    if (await severityBtn.isVisible().catch(() => false)) {
      await severityBtn.click();
      await page.waitForTimeout(500);
      await ss(page, 'G-063-warnings-filtered');
    }
    // Resolve a warning (G-064)
    const resolveBtn = page.getByRole('button', { name: /hal qilish|resolve/i }).first();
    if (await resolveBtn.isVisible().catch(() => false)) {
      await resolveBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'G-064-warning-resolve-modal');
      const notesInput = page.locator('textarea').first();
      if (await notesInput.isVisible().catch(() => false)) {
        await notesInput.fill(`Beta resolve ${RUN}`);
        const confirmBtn = page.getByRole('button', { name: /saqlash|confirm|hal/i }).first();
        await confirmBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
        await ss(page, 'G-064-warning-resolved');
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
    } else {
      await ss(page, 'G-062-no-warnings-to-resolve');
    }
  });

  // ── Sidebar & Navigation ──────────────────────────────────────────
  test('G-067 G-068 G-069 sidebar navigation', async () => {
    await page.goto('/government');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-067-sidebar-scope-indicator');
    // Navigate through sidebar links
    const auditLink = page.locator('a[href*="audit-log"], [class*="nav"]').filter({ hasText: /audit|jurnal/i }).first();
    if (await auditLink.isVisible().catch(() => false)) {
      await auditLink.click();
      await page.waitForTimeout(400);
      await ss(page, 'G-068-sidebar-active-link');
    }
    // Check user card in sidebar footer
    const userCard = page.locator('[class*="user-card"], [class*="sidebar-footer"], [class*="avatar"]').first();
    await ss(page, 'G-069-user-card');
  });

  // ── Profile ───────────────────────────────────────────────────────
  test('G-074 G-075 view + edit profile', async () => {
    await page.goto('/government/profile');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-074-gov-profile');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    // Edit phone
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('+998901234570');
      const saveBtn = page.getByRole('button', { name: /saqlash|save/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
        await ss(page, 'G-075-profile-saved');
      }
    }
  });

  // ── Settings ─────────────────────────────────────────────────────
  test('G-076 settings', async () => {
    await page.goto('/government/settings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'G-076-settings');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Logout ────────────────────────────────────────────────────────
  test('G-004 G-070 logout gov.republic', async () => {
    const logoutBtn = page.getByRole('button', { name: /chiqish|logout/i }).first()
      .or(page.locator('[class*="logout"]').first());
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, 'G-004-republic-logout');
      // Soft check — logout may not redirect immediately in all configurations
      const loggedOut = page.url().includes('/login') || page.url() === BASE + '/';
      if (!loggedOut) {
        console.log('G-004: logout click did not redirect to /login — URL: ' + page.url());
      }
    } else {
      await page.goto('/government/settings');
      await page.waitForLoadState('networkidle');
      const logoutBtn2 = page.getByRole('button', { name: /chiqish|logout/i }).first();
      if (await logoutBtn2.isVisible().catch(() => false)) {
        await logoutBtn2.click();
        await page.waitForTimeout(1000);
      }
      await ss(page, 'G-004-republic-logout-settings');
    }
  });
});
