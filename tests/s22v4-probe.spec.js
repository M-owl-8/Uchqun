/**
 * S22-V4 close-out probe — the last two PARTIAL rows + the non-chat realtime gate
 *
 * P-001       all 12 parents login: API hard-assert (200 + /auth/me role=parent)
 *             + full UI form login for parent3 (previously DEF-009 intermittent) at 390px
 * P-002       silent JWT refresh: delete accessToken cookie mid-session, reload →
 *             app recovers via interceptor refresh, no redirect to /login, cookie restored
 * RT-NONCHAT  teacher Xabar "Suhbat" tab badge increments LIVE via socket while the
 *             teacher sits on the warnings tab (non-chat surface — closes DEF-015 caveat)
 */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const PORTAL = 'https://teacher-production-0647.up.railway.app';
const API    = 'https://uchqun-production-b484.up.railway.app';
const PW     = 'Test@2026';
const SHOTS  = path.join(__dirname, '..', 'audits', 'beta', 'screens');

let browser;
test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
test.afterAll(async () => { await browser.close(); });

async function apiLoginContext(email, opts = {}) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...opts });
  const resp = await ctx.request.post(`${API}/api/v1/auth/login`, {
    data: { email, password: PW },
    headers: { 'Content-Type': 'application/json' },
  });
  if (resp.status() !== 200) throw new Error(`Login ${email}: HTTP ${resp.status()}`);
  return ctx;
}

async function dismissConsent(pg) {
  try {
    const btn = pg.locator('[role="dialog"] button').filter({ hasText: /qabul|accept|roziman/i }).first();
    if (await btn.isVisible({ timeout: 3_000 })) { await btn.click(); await pg.waitForTimeout(400); }
  } catch { /* no consent modal */ }
}

// ─────────────────────────────────────────────────────────────────────────
// P-001: all 12 parents login
// ─────────────────────────────────────────────────────────────────────────
test('P-001 | 12/12 parent API logins + parent3 UI login at 390px', async () => {
  const results = [];
  for (let i = 1; i <= 12; i++) {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const resp = await ctx.request.post(`${API}/api/v1/auth/login`, {
      data: { email: `parent${i}@uchqun.uz`, password: PW },
      headers: { 'Content-Type': 'application/json' },
    });
    let role = null;
    if (resp.status() === 200) {
      const me = await (await ctx.request.get(`${API}/api/v1/auth/me`)).json().catch(() => ({}));
      role = me.data?.role || me.role || null;
    }
    results.push({ parent: i, status: resp.status(), role });
    console.log(`[P-001] parent${i}: HTTP ${resp.status()} role=${role}`);
    await ctx.close();
  }
  const failures = results.filter(r => r.status !== 200 || r.role !== 'parent');
  expect(failures).toEqual([]);

  // UI form login for parent3 — one of the DEF-009 intermittent accounts — at 390px
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true,
  });
  const pg = await ctx.newPage();
  await pg.goto(`${PORTAL}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  const parentToggle = pg.locator('button').filter({ hasText: /ota-ona/i }).first();
  if (await parentToggle.isVisible({ timeout: 3_000 }).catch(() => false)) await parentToggle.click();
  await pg.fill('input[type="email"]', 'parent3@uchqun.uz');
  await pg.fill('input[type="password"]', PW);
  await pg.click('button[type="submit"]');
  await pg.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 30_000 });
  await dismissConsent(pg);
  await pg.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  // Stability window — DEF-009 race bounces back to /login AFTER the initial redirect
  await pg.waitForTimeout(5_000);
  expect(pg.url()).not.toMatch(/\/login/);
  await pg.screenshot({ path: path.join(SHOTS, 'S22V4-P-001-parent3-ui-login-390.png') });
  console.log('[P-001] PASS: 12/12 API logins OK; parent3 UI login stable on', pg.url());
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────
// P-002: silent JWT refresh after access-token loss
// ─────────────────────────────────────────────────────────────────────────
test('P-002 | silent refresh: delete accessToken cookie → app recovers, no logout', async () => {
  const ctx = await apiLoginContext('parent1@uchqun.uz', {
    viewport: { width: 390, height: 844 }, isMobile: true,
  });
  const pg = await ctx.newPage();
  await pg.goto(`${PORTAL}/`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await dismissConsent(pg);
  await pg.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  expect(pg.url()).not.toMatch(/\/login/);

  // Simulate access-token expiry: drop ONLY the accessToken cookie, keep refreshToken
  const before = await ctx.cookies(API);
  expect(before.some(c => c.name === 'accessToken')).toBe(true);
  expect(before.some(c => c.name === 'refreshToken')).toBe(true);
  await ctx.clearCookies({ name: 'accessToken' });
  const dropped = await ctx.cookies(API);
  expect(dropped.some(c => c.name === 'accessToken')).toBe(false);
  console.log('[P-002] accessToken cookie deleted; refreshToken kept');

  // Reload a protected page — /auth/me will 401 → interceptor silently refreshes → retry
  await pg.reload({ waitUntil: 'domcontentloaded' });
  await pg.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await dismissConsent(pg);
  await pg.waitForTimeout(1_000);

  expect(pg.url()).not.toMatch(/\/login/);
  const after = await ctx.cookies(API);
  expect(after.some(c => c.name === 'accessToken')).toBe(true);
  await pg.screenshot({ path: path.join(SHOTS, 'S22V4-P-002-silent-refresh-recovered.png') });
  console.log('[P-002] PASS: page stayed authenticated and accessToken cookie was re-issued');
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────
// G-002 RETEST: government password toggle — earlier FAIL was a test artifact
// (URL `${PORTAL}\login` backslash + `.last()` svg-button selector hit the
// language switcher; Field.jsx implements the toggle with aria-label)
// ─────────────────────────────────────────────────────────────────────────
test('G-002 | government password toggle → type=text (corrected selector)', async () => {
  const GOV = 'https://government-production.up.railway.app';
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const pg  = await ctx.newPage();
  await pg.goto(`${GOV}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  const pwInput = pg.locator('input[type="password"]').first();
  await expect(pwInput).toBeVisible({ timeout: 10_000 });

  const toggle = pg.locator('button[aria-label="Show password"]');
  await expect(toggle).toBeVisible({ timeout: 5_000 });
  await toggle.click();
  await pg.waitForTimeout(300);
  expect(await pg.locator('#password').getAttribute('type')).toBe('text');
  await pg.screenshot({ path: path.join(SHOTS, 'S22V4-G-002-toggle-type-text.png') });

  // Toggle back
  await pg.locator('button[aria-label="Hide password"]').click();
  await pg.waitForTimeout(300);
  expect(await pg.locator('#password').getAttribute('type')).toBe('password');
  console.log('[G-002] PASS: eye toggle switches type password↔text on government login');
  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────
// RT-NONCHAT: unread badge increments live while teacher is NOT on chat
// ─────────────────────────────────────────────────────────────────────────
test('RT-NONCHAT | Suhbat badge increments live via socket on warnings tab', async () => {
  const tctx = await apiLoginContext('teacher1@uchqun.uz', {
    viewport: { width: 1280, height: 800 },
  });
  const pctx = await apiLoginContext('parent1@uchqun.uz');
  const tpg = await tctx.newPage();

  const me = await (await pctx.request.get(`${API}/api/v1/auth/me`)).json().catch(() => ({}));
  const parentId = me.data?.id || me.id;
  console.log('[RT-NONCHAT] parent1 id:', parentId);

  // Mark parent1 conversation read first so the badge count is small and deterministic
  await tpg.goto(`${PORTAL}/teacher/xabar?tab=chat`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await tpg.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  const conv = tpg.locator('button').filter({ hasText: /hulkar/i }).first();
  if (await conv.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await conv.click();
    await tpg.waitForTimeout(1_500);
  }

  // Park the teacher on the NON-chat warnings tab; socket stays connected
  await tpg.goto(`${PORTAL}/teacher/xabar?tab=warnings`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await tpg.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await tpg.waitForTimeout(2_000);

  const chatTabBtn = tpg.locator('button').filter({ hasText: /suhbat|chat|чат/i }).first();
  await expect(chatTabBtn).toBeVisible({ timeout: 10_000 });
  const readBadge = async () => {
    const span = chatTabBtn.locator('span').filter({ hasText: /^\d+$|^9\+$/ }).first();
    const vis = await span.isVisible({ timeout: 500 }).catch(() => false);
    if (!vis) return 0;
    const txt = (await span.textContent()).trim();
    return txt === '9+' ? 10 : parseInt(txt, 10);
  };
  const beforeCount = await readBadge();
  console.log('[RT-NONCHAT] badge before send:', beforeCount);

  const MSG = `RT-BADGE-${Date.now()}`;
  const sendResp = await pctx.request.post(`${API}/api/v1/chat/messages`, {
    data: { conversationId: `parent:${parentId}`, content: MSG },
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('[RT-NONCHAT] parent send HTTP:', sendResp.status());
  expect(sendResp.status()).toBe(201);

  // Assert: badge increments WITHOUT any reload or navigation
  await expect.poll(readBadge, { timeout: 20_000, intervals: [1_000] }).toBeGreaterThan(beforeCount);
  const afterCount = await readBadge();
  await tpg.screenshot({ path: path.join(SHOTS, 'S22V4-RT-NONCHAT-badge-increment.png') });
  console.log(`[RT-NONCHAT] PASS: badge ${beforeCount} → ${afterCount} live, teacher never visited chat tab after send`);

  await tctx.close();
  await pctx.close();
});
