/**
 * DEF-013 fix proof — realtime chat teacher→parent delivery
 *
 * Before fix: chatController.js:92 called emitToUser(parseInt(parentId,10), ...)
 *   parseInt(uuid, 10) → small int → emits to wrong room → parent never receives.
 * After fix: emitToUser(parentId, ...) — UUID passed directly → rooms match → delivered.
 *
 * Two-context test (teacher1 + parent1, both live, no reload):
 *   T1. teacher1 sends → parent1 receives live (primary fix proof)
 *   T2. parent1 sends → teacher1 receives live (regression — was already working)
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const PORTAL  = 'https://teacher-production-0647.up.railway.app';
const API     = 'https://uchqun-backend-production.up.railway.app';
const AUTH_DIR = path.join(__dirname, '..', '.auth');

function authFile(name) {
  for (const prefix of ['recon22-', 's22v3-', '']) {
    const f = path.join(AUTH_DIR, `${prefix}${name}.json`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

async function getPage(browser, name) {
  const file = authFile(name);
  const ctx  = file
    ? await browser.newContext({ storageState: file, ignoreHTTPSErrors: true })
    : await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  // Refresh session so cookies are live
  try {
    await page.goto(`${API}/api/v1/auth/refresh`, { waitUntil: 'commit', timeout: 15_000 });
  } catch { /* ignore */ }
  return page;
}

async function dismissConsent(page) {
  try {
    const btn = page.locator('[role="dialog"] button').filter({ hasText: /qabul|accept|agree/i }).first();
    if (await btn.isVisible({ timeout: 4_000 })) await btn.click();
  } catch { /* no modal */ }
}

// ─── shared browser (both contexts in same headful run) ──────────────────────
let browser;
test.beforeAll(async () => {
  browser = await chromium.launch({ headless: false });
});
test.afterAll(async () => {
  await browser.close();
});

// ═══════════════════════════════════════════════════════════════════════
// T1 — teacher → parent  (the broken direction, now fixed)
// ═══════════════════════════════════════════════════════════════════════
test('DEF-013-T1 | teacher1 sends → parent1 receives without reload', async () => {
  const MSG = `DEF013-FIX-T1-${Date.now()}`;

  const teacherPage = await getPage(browser, 'teacher1');
  const parentPage  = await getPage(browser, 'parent1');

  // ── Parent: open /chat first so socket is established ──
  await parentPage.goto(`${PORTAL}/chat`, { waitUntil: 'networkidle', timeout: 30_000 });
  await dismissConsent(parentPage);
  await parentPage.waitForLoadState('networkidle');

  // Verify parent is on chat page
  const parentHeading = await parentPage.locator('h1, h2').first().innerText({ timeout: 5_000 }).catch(() => '');
  console.log('[DEF013] parent heading:', parentHeading);

  // ── Teacher: open chat page ──
  await teacherPage.goto(`${PORTAL}/teacher/xabar?tab=chat`, { waitUntil: 'networkidle', timeout: 30_000 });
  await teacherPage.waitForLoadState('networkidle');

  // Get parent1's first name to locate conversation
  const meResp = await parentPage.request.get(`${API}/api/v1/auth/me`);
  const meBody = await meResp.json().catch(() => ({}));
  const parentFirstName = meBody.data?.firstName || meBody.firstName || 'Hulkar';
  console.log('[DEF013] parent1 first name:', parentFirstName);

  // Wait for conversation list buttons
  await teacherPage.waitForSelector('.overflow-y-auto button', { timeout: 12_000 }).catch(() => {});

  // Click parent1's conversation
  const conv = teacherPage.locator('.overflow-y-auto button').filter({ hasText: parentFirstName }).first();
  if (await conv.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await conv.scrollIntoViewIfNeeded();
    await conv.click();
    console.log('[DEF013] teacher opened conversation for:', parentFirstName);
  } else {
    console.log('[DEF013] WARNING: conversation not found by name, falling back to first');
    const first = teacherPage.locator('.overflow-y-auto button').first();
    if (await first.isVisible({ timeout: 5_000 }).catch(() => false)) await first.click();
  }
  await teacherPage.waitForLoadState('networkidle').catch(() => {});

  // Type and send message
  const textarea = teacherPage.locator('textarea').last();
  await textarea.waitFor({ state: 'visible', timeout: 10_000 });
  await textarea.fill(MSG);
  await textarea.press('Enter');
  console.log('[DEF013] teacher sent:', MSG);

  // Screenshot: teacher side immediately after send
  await teacherPage.screenshot({ path: path.join(__dirname, '..', 'audits', 'beta', 'screens', 'DEF-013-teacher-sent.png') });

  // ── Assert parent receives without reload ──
  // Allow up to 15 s for network round-trip + socket delivery + React update
  await expect(parentPage.getByText(MSG)).toBeVisible({ timeout: 15_000 });
  console.log('[DEF013-T1] PASS — message appeared in parent view live');

  // Screenshot: parent side showing the received message
  await parentPage.screenshot({ path: path.join(__dirname, '..', 'audits', 'beta', 'screens', 'DEF-013-parent-received.png') });
});

// ═══════════════════════════════════════════════════════════════════════
// T2 — parent → teacher  (regression — was already working, must still work)
// ═══════════════════════════════════════════════════════════════════════
test('DEF-013-T2 | parent1 sends → teacher1 receives without reload (regression)', async () => {
  const MSG = `DEF013-FIX-T2-${Date.now()}`;

  const teacherPage = await getPage(browser, 'teacher1');
  const parentPage  = await getPage(browser, 'parent1');

  // ── Teacher: open chat and find parent1's conversation ──
  await teacherPage.goto(`${PORTAL}/teacher/xabar?tab=chat`, { waitUntil: 'networkidle', timeout: 30_000 });
  await teacherPage.waitForLoadState('networkidle');

  const meResp = await parentPage.request.get(`${API}/api/v1/auth/me`);
  const meBody = await meResp.json().catch(() => ({}));
  const parentFirstName = meBody.data?.firstName || meBody.firstName || 'Hulkar';

  await teacherPage.waitForSelector('.overflow-y-auto button', { timeout: 12_000 }).catch(() => {});
  const conv = teacherPage.locator('.overflow-y-auto button').filter({ hasText: parentFirstName }).first();
  if (await conv.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await conv.scrollIntoViewIfNeeded();
    await conv.click();
  } else {
    const first = teacherPage.locator('.overflow-y-auto button').first();
    if (await first.isVisible({ timeout: 5_000 }).catch(() => false)) await first.click();
  }
  await teacherPage.waitForLoadState('networkidle').catch(() => {});

  // ── Parent: open /chat (socket established) ──
  await parentPage.goto(`${PORTAL}/chat`, { waitUntil: 'networkidle', timeout: 30_000 });
  await dismissConsent(parentPage);
  await parentPage.waitForLoadState('networkidle');

  // Parent sends a message
  const parentTextarea = parentPage.locator('textarea').last();
  await parentTextarea.waitFor({ state: 'visible', timeout: 10_000 });
  await parentTextarea.fill(MSG);
  await parentTextarea.press('Enter');
  console.log('[DEF013] parent sent:', MSG);

  // Wait a moment for socket delivery
  // Teacher chat: conversation list updates — look for the message text in the page
  // After parent sends, teacher's open conversation panel should update
  await expect(teacherPage.getByText(MSG)).toBeVisible({ timeout: 15_000 });
  console.log('[DEF013-T2] PASS — parent message appeared in teacher view live');

  await teacherPage.screenshot({ path: path.join(__dirname, '..', 'audits', 'beta', 'screens', 'DEF-013-teacher-received-parent-msg.png') });
});
