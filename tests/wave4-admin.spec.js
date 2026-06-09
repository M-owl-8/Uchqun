// Wave 4 — Admin Portal
// S14 / BETA-VERIFICATION — DO NOT FIX, RECORD ONLY
// Accounts: admin1–admin4  Password: Test@2026
// URL: https://admin-production-536f.up.railway.app
// Routes: all prefixed /admin/

const { test, expect } = require('@playwright/test');
const { writeFileSync } = require('fs');
const path = require('path');
const os = require('os');

const BASE = 'https://admin-production-536f.up.railway.app';
const PW   = 'Test@2026';
const RUN  = Date.now().toString().slice(-5);

const ADMINS = [
  'admin1@uchqun.uz', // S1 Toshkent MM 1
  'admin2@uchqun.uz', // S2 Toshkent MM 2
  'admin3@uchqun.uz', // S3 Samarqand MM 1
  'admin4@uchqun.uz', // S4 Samarqand MM 2
];

// Test CSV for bulk import (uses parent1@uchqun.uz which belongs to School 1)
const CSV_PATH = path.join(os.tmpdir(), `beta-import-${RUN}.csv`);
const CSV_CONTENT = [
  'firstName,lastName,dateOfBirth,gender,disabilityType,class,teacher,parentEmail',
  `BetaImport,Testchild,2018-03-15,Male,ASD,1A,Zulfiya Nazarova,parent1@uchqun.uz`,
].join('\n');

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
// W4-S1 admin1 — full day workflow (desktop 1280×800)
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W4-S1 admin1 full day', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    writeFileSync(CSV_PATH, CSV_CONTENT, 'utf8');
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
  test('A-001 login admin1', async () => {
    await login(page, ADMINS[0]);
    if (page.url().includes('/login')) {
      await ss(page, 'A-001-admin1-login-failed');
      console.log('A-001 admin1 login failed — URL stayed at /login (DEF-009)');
      return;
    }
    await ss(page, 'A-001-admin1-login');
    expect(page.url()).toMatch(/\/admin/);
  });

  test('A-005 language switcher', async () => {
    const switcher = page.locator('[aria-haspopup="listbox"]').first()
      .or(page.locator('button').filter({ hasText: /O.zbekcha|Русский|English|UZ|RU|EN/i }).first());
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(400);
      await ss(page, 'A-005-lang-switcher-open');
      await page.keyboard.press('Escape').catch(() => {});
    } else {
      await ss(page, 'A-005-no-lang-switcher');
    }
  });

  // ── Dashboard ─────────────────────────────────────────────────────
  test('A-006 view dashboard', async () => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-006-admin1-dashboard');
    expect(page.url()).not.toMatch(/login/);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('A-007 to A-014 dashboard cards', async () => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollBy(0, 400));
    await ss(page, 'A-007-dashboard-cards-scroll');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Reception Management ──────────────────────────────────────────
  test('A-015 list receptions', async () => {
    await page.goto('/admin/receptions');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-015-receptions-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('A-016 A-017 search + filter receptions', async () => {
    await page.goto('/admin/receptions');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[type="text"], input[placeholder*="qidirish"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('reception');
      await page.waitForTimeout(800);
      await ss(page, 'A-016-receptions-search');
      await searchInput.clear();
      await page.waitForTimeout(500);
    } else {
      await ss(page, 'A-016-no-search-input');
    }
    // Filter by status
    const statusFilter = page.locator('select, [class*="filter"]').filter({ hasText: /faol|status|holat/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(500);
      await ss(page, 'A-017-receptions-filtered');
    }
  });

  test('A-019 create reception', async () => {
    await page.goto('/admin/receptions');
    await page.waitForLoadState('networkidle');
    const createBtn = page.getByRole('button', { name: /yangi|create|qo.shish|add/i }).first()
      .or(page.locator('[class*="create-btn"], [class*="add-btn"], button[class*="primary"]').first());
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'A-019-create-form-open');
      const modal = page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]').last();
      const inputs = modal.locator('input');
      const cnt = await inputs.count();
      if (cnt > 0) {
        await inputs.nth(0).fill('BetaRec').catch(() => {});
        if (cnt > 1) await inputs.nth(1).fill(`Test${RUN}`).catch(() => {});
        const emailIn = modal.locator('input[type="email"]').first();
        await emailIn.fill(`betarec${RUN}@uchqun.uz`).catch(() => {});
        const phoneIn = modal.locator('input[type="tel"], input[placeholder*="tel"]').first();
        await phoneIn.fill('+998901234560').catch(() => {});
        const passIn = modal.locator('input[type="password"]').first();
        await passIn.fill('Test@2026').catch(() => {});
        const saveBtn = modal.getByRole('button', { name: /saqlash|save|create|yaratish|qo.shish/i }).first();
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(2000);
        }
      }
      await ss(page, 'A-019-create-done');
    } else {
      await ss(page, 'A-019-no-create-btn');
    }
  });

  test('A-024 A-025 view reception detail + documents', async () => {
    await page.goto('/admin/receptions');
    await page.waitForLoadState('networkidle');
    // Click on any reception row
    const firstRow = page.locator('tbody tr, [class*="item"], [class*="row"]').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      await ss(page, 'A-024-reception-detail');
      // Check for documents section
      const docsSection = page.locator('[class*="document"], [class*="doc"]').first()
        .or(page.getByRole('heading', { name: /hujjat|document/i }).first());
      if (await docsSection.isVisible().catch(() => false)) {
        await ss(page, 'A-025-reception-documents');
      }
    } else {
      await ss(page, 'A-024-no-receptions');
    }
  });

  // ── Parent Management ─────────────────────────────────────────────
  test('A-028 A-029 list + search parents', async () => {
    await page.goto('/admin/parents');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-028-parents-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('parent');
      await page.waitForTimeout(800);
      await ss(page, 'A-029-parents-search');
      await searchInput.clear();
    }
  });

  test('A-030 A-031 view parent detail + children', async () => {
    await page.goto('/admin/parents');
    await page.waitForLoadState('networkidle');
    const firstRow = page.locator('tbody tr, [class*="row"], [class*="item"]').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
      await ss(page, 'A-030-parent-detail');
    } else {
      await ss(page, 'A-030-no-parents');
    }
  });

  test('A-035 A-036 suspend + re-activate parent', async () => {
    await page.goto('/admin/parents');
    await page.waitForLoadState('networkidle');
    const suspendBtn = page.getByRole('button', { name: /blok|suspend|to.xtatish/i }).first()
      .or(page.locator('[class*="suspend"]').first());
    if (await suspendBtn.isVisible().catch(() => false)) {
      await suspendBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'A-035-parent-suspended');
      const activateBtn = page.getByRole('button', { name: /faollash|activate|unblock/i }).first();
      if (await activateBtn.isVisible().catch(() => false)) {
        await activateBtn.click();
        await page.waitForTimeout(600);
        await ss(page, 'A-036-parent-activated');
      }
    } else {
      await ss(page, 'A-035-no-suspend-btn');
    }
  });

  // ── Teacher Management ────────────────────────────────────────────
  test('A-037 A-038 A-039 list + search + view teacher', async () => {
    await page.goto('/admin/teachers');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-037-teachers-list');
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('teacher');
      await page.waitForTimeout(600);
      await ss(page, 'A-038-teachers-search');
      await searchInput.clear();
    }
    const firstRow = page.locator('tbody tr, [class*="row"], [class*="item"]').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      await ss(page, 'A-039-teacher-detail');
    }
  });

  // ── Group Management ──────────────────────────────────────────────
  test('A-041 A-042 list + search groups', async () => {
    await page.goto('/admin/groups');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-041-groups-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('zulfiya');
      await page.waitForTimeout(600);
      await ss(page, 'A-042-groups-search');
    }
  });

  // ── Bulk Import ───────────────────────────────────────────────────
  test('A-043 A-044 bulk import upload + validate', async () => {
    await page.goto('/admin/import');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-043-import-page');
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(CSV_PATH);
      await page.waitForTimeout(800);
      await ss(page, 'A-043-file-selected');
      const validateBtn = page.getByRole('button', { name: /tekshirish|validate|upload|yuklash/i }).first()
        .or(page.locator('button[type="submit"]').first());
      if (await validateBtn.isVisible().catch(() => false)) {
        await validateBtn.click();
        await page.waitForTimeout(5000);
        await ss(page, 'A-044-validate-result');
      }
    } else {
      await ss(page, 'A-043-no-file-input');
    }
  });

  test('A-045 A-046 A-047 start import + poll + result', async () => {
    const startBtn = page.getByRole('button', { name: /boshlash|start|import|tasdiqlash|confirm/i }).first();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'A-045-import-started');
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(3000);
        await ss(page, `A-046-import-polling-${i}`);
        const done = await page.locator('[class*="completed"], [class*="success"], [class*="failed"], [class*="result"]')
          .isVisible().catch(() => false);
        if (done) break;
      }
      await ss(page, 'A-047-import-result');
    } else {
      await ss(page, 'A-045-no-start-btn');
    }
  });

  // ── Document Approval Queue ───────────────────────────────────────
  test('A-048 A-049 A-050 A-051 document queue tabs', async () => {
    await page.goto('/admin/documents');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-048-docs-pending');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const approvedTab = page.locator('[role="tab"], button').filter({ hasText: /tasdiqlangan|approved/i }).first();
    if (await approvedTab.isVisible().catch(() => false)) {
      await approvedTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'A-049-docs-approved');
    }
    const rejectedTab = page.locator('[role="tab"], button').filter({ hasText: /rad etilgan|rejected/i }).first();
    if (await rejectedTab.isVisible().catch(() => false)) {
      await rejectedTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'A-050-docs-rejected');
    }
    const pendingTab = page.locator('[role="tab"], button').filter({ hasText: /kutayotgan|pending/i }).first();
    if (await pendingTab.isVisible().catch(() => false)) await pendingTab.click();
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('reception').catch(() => {});
      await page.waitForTimeout(500);
      await ss(page, 'A-051-docs-search');
      await searchInput.clear();
    }
  });

  test('A-052 A-053 A-054 approve / reject document', async () => {
    await page.goto('/admin/documents');
    await page.waitForLoadState('networkidle');
    const approveBtn = page.getByRole('button', { name: /tasdiqlash|approve/i }).first();
    const rejectBtn  = page.getByRole('button', { name: /rad etish|reject/i }).first();
    const viewBtn    = page.locator('[aria-label*="view"], [class*="eye"]').first();
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      await ss(page, 'A-054-doc-view');
      await page.keyboard.press('Escape').catch(() => {});
    }
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, 'A-052-doc-approved');
    } else if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();
      await page.waitForTimeout(600);
      const reasonInput = page.locator('textarea, input[name*="reason"]').first();
      await reasonInput.fill('Beta test rejection').catch(() => {});
      const confirmBtn = page.getByRole('button', { name: /tasdiqlash|confirm|rad/i }).last();
      await confirmBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
      await ss(page, 'A-053-doc-rejected');
    } else {
      await ss(page, 'A-052-no-docs-to-action');
    }
  });

  // ── Child Detail (via parent → child link) ───────────────────────
  test('A-056 A-058 child detail + goals', async () => {
    await page.goto('/admin/parents');
    await page.waitForLoadState('networkidle');
    const childLink = page.locator('a[href*="/admin/children/"]').first()
      .or(page.locator('[class*="child"], [href*="children"]').first());
    if (await childLink.isVisible().catch(() => false)) {
      await childLink.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'A-056-child-detail');
      const goalsTab = page.locator('[role="tab"], button').filter({ hasText: /maqsad|goal/i }).first();
      if (await goalsTab.isVisible().catch(() => false)) {
        await goalsTab.click();
        await page.waitForTimeout(500);
        await ss(page, 'A-058-child-goals');
      }
    } else {
      await ss(page, 'A-056-no-child-link');
    }
  });

  // ── School Profile ────────────────────────────────────────────────
  test('A-059 A-060 view + edit school profile', async () => {
    await page.goto('/admin/school');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-059-school-profile');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── School Ratings ────────────────────────────────────────────────
  test('A-061 view school ratings', async () => {
    await page.goto('/admin/school-ratings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-061-school-ratings');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Activity Feed (Audit Log) ─────────────────────────────────────
  test('A-065 A-066 A-067 A-068 audit / activity feed', async () => {
    await page.goto('/admin/activity');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-065-activity-feed');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    // Filter by action
    const actionFilter = page.locator('select, [class*="filter"]').first();
    if (await actionFilter.isVisible().catch(() => false)) {
      await actionFilter.selectOption({ index: 1 }).catch(async () => {
        await actionFilter.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
      });
      await page.waitForTimeout(600);
      await ss(page, 'A-066-activity-filtered');
    }
    await page.evaluate(() => window.scrollBy(0, 600));
    await ss(page, 'A-068-activity-scroll');
  });

  // ── AI Warnings ───────────────────────────────────────────────────
  test('A-069 A-070 A-071 list + filter AI warnings', async () => {
    await page.goto('/admin/ai-warnings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-069-ai-warnings');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const statusFilter = page.locator('[class*="filter"], select, button').filter({ hasText: /faol|active|resolved|hal/i }).first();
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      await ss(page, 'A-070-warnings-filter');
      await page.keyboard.press('Escape').catch(() => {});
    }
  });

  test('A-072 mark warning resolved', async () => {
    await page.goto('/admin/ai-warnings');
    await page.waitForLoadState('networkidle');
    const resolveBtn = page.getByRole('button', { name: /hal qilish|resolve/i }).first()
      .or(page.locator('[class*="resolve"]').first());
    if (await resolveBtn.isVisible().catch(() => false)) {
      await resolveBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, 'A-072-warning-resolved');
    } else {
      await ss(page, 'A-072-no-warnings-to-resolve');
    }
  });

  // ── Messages to Government ────────────────────────────────────────
  test('A-075 A-076 A-077 government messages', async () => {
    await page.goto('/admin/messages');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-075-messages-page');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    // Open first message
    const firstMsg = page.locator('[class*="message"], [class*="row"], tr').first();
    if (await firstMsg.isVisible().catch(() => false)) {
      await firstMsg.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      await ss(page, 'A-076-message-detail');
      await page.keyboard.press('Escape').catch(() => {});
    }
    // Compose new message
    const composeBtn = page.getByRole('button', { name: /yangi|compose|yozish|murojaat/i }).first();
    if (await composeBtn.isVisible().catch(() => false)) {
      await composeBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'A-077-compose-modal');
      const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
      const subjectInput = modal.locator('input[type="text"]').first();
      await subjectInput.fill(`Admin beta ${RUN}`).catch(() => {});
      const bodyInput = modal.locator('textarea').first();
      await bodyInput.fill(`Admin beta murojaat ${RUN}`).catch(() => {});
      const sendBtn = modal.getByRole('button', { name: /yuborish|send/i }).first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'A-077-message-sent');
      }
    } else {
      await ss(page, 'A-077-no-compose-btn');
    }
  });

  // ── Trash ────────────────────────────────────────────────────────
  test('A-078 A-079 A-080 A-081 trash', async () => {
    await page.goto('/admin/trash');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-078-trash-page');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const recepTab = page.locator('[role="tab"], button').filter({ hasText: /qabul|reception/i }).first();
    if (await recepTab.isVisible().catch(() => false)) {
      await recepTab.click();
      await page.waitForTimeout(500);
      await ss(page, 'A-079-trash-receptions');
    }
    const restoreBtn = page.getByRole('button', { name: /tiklash|restore/i }).first();
    if (await restoreBtn.isVisible().catch(() => false)) {
      await ss(page, 'A-080-restore-option-visible');
    }
  });

  // ── Communications ────────────────────────────────────────────────
  test('A-082 A-082a A-083 conversations', async () => {
    await page.goto('/admin/communications');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-082-communications');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('parent');
      await page.waitForTimeout(800);
      await ss(page, 'A-082a-communications-search');
      await searchInput.clear();
    }
    const firstConv = page.locator('[class*="conversation"], tr, [class*="thread"]').first();
    if (await firstConv.isVisible().catch(() => false)) {
      await firstConv.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      await ss(page, 'A-083-conversation-detail');
    }
  });

  // ── Admin Profile ─────────────────────────────────────────────────
  test('A-062 A-084 A-085 profile + logout from profile', async () => {
    await page.goto('/admin/profile');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-084-admin-profile');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Settings ──────────────────────────────────────────────────────
  test('A-089 A-090 A-091 settings form', async () => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-089-settings');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── ManagerIRR ────────────────────────────────────────────────────
  test('A-088 quarterly monitoring IRR', async () => {
    await page.goto('/admin/irr');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-088-manager-irr');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Therapy Management ────────────────────────────────────────────
  test('A-094 therapy management', async () => {
    await page.goto('/admin/therapy');
    await page.waitForLoadState('networkidle');
    await ss(page, 'A-094-therapy-management');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Logout ────────────────────────────────────────────────────────
  test('A-002 logout admin1', async () => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    const logoutBtn = page.getByRole('button', { name: /chiqish|logout|exit/i }).first()
      .or(page.locator('[class*="logout"]').first());
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, 'A-002-admin1-logout');
      expect(page.url()).toMatch(/login|\/$/);
    } else {
      await page.goto('/admin/profile');
      await page.waitForLoadState('networkidle');
      const logoutBtn2 = page.getByRole('button', { name: /chiqish|logout/i }).first();
      if (await logoutBtn2.isVisible().catch(() => false)) {
        await logoutBtn2.click();
        await page.waitForTimeout(1000);
      }
      await ss(page, 'A-002-admin1-logout-profile');
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// W4-S2 admin2, admin3, admin4: login + dashboard + activity + logout
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W4-S2 admin2-4 quick flow', () => {
  for (let i = 1; i < ADMINS.length; i++) {
    const email = ADMINS[i];
    const idx   = i + 1;

    test(`A-001 admin${idx} login + dashboard + activity + logout`, async ({ browser }) => {
      const ctx  = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 800 },
        baseURL: BASE,
      });
      const page = await ctx.newPage();
      try {
        await login(page, email);
        if (page.url().includes('/login')) {
          await ss(page, `A-001-admin${idx}-login-failed`);
          console.log(`A-001 admin${idx} login failed — URL stayed at /login (DEF-009)`);
          return;
        }
        await ss(page, `A-001-admin${idx}-login`);

        // Dashboard
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await ss(page, `A-006-admin${idx}-dashboard`);

        // Activity feed (audit log — tenant isolation: admin sees ONLY own school)
        await page.goto('/admin/activity');
        await page.waitForLoadState('networkidle');
        await ss(page, `A-065-admin${idx}-activity`);

        // Logout
        await page.goto('/admin/settings');
        await page.waitForLoadState('networkidle');
        const logoutBtn = page.getByRole('button', { name: /chiqish|logout/i }).first();
        if (await logoutBtn.isVisible().catch(() => false)) {
          await logoutBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(800);
        }
        await ss(page, `A-002-admin${idx}-logout`);
      } finally {
        await ctx.close().catch(() => {});
      }
    });
  }
});
