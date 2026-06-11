/**
 * S23 / DEF-009 fix proof
 *
 * STREAK      20 consecutive cold parent UI logins (fresh browser context each,
 *             390px) → every one lands on the dashboard and STAYS there through
 *             a 5s stability window (the pre-fix bounce hit within ~1-5s).
 *             Pre-fix failure rate was 2-of-3 — 20/20 is conclusive.
 * REGRESSION  genuinely invalid session (both auth cookies gone) still redirects
 *             to /login — the legitimate 401 → clearAuth path must survive.
 * PORTALS     teacher, admin, reception, government UI logins still clean
 *             (same shared api.js race existed in all portals).
 */
const { test, expect, chromium } = require('@playwright/test');

const PARENT_PORTAL = 'https://teacher-production-0647.up.railway.app';
const PORTALS = {
  admin:      { url: 'https://admin-production-536f.up.railway.app',      email: 'admin1@uchqun.uz' },
  reception:  { url: 'https://reception-production-ba41.up.railway.app',  email: 'reception1@uchqun.uz' },
  government: { url: 'https://government-production.up.railway.app',      email: 'gov.republic@uchqun.uz' },
};
const API = 'https://uchqun-production-b484.up.railway.app';
const PW  = 'Test@2026';

let browser;
test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
test.afterAll(async () => { await browser.close(); });

async function dismissConsent(pg) {
  try {
    const btn = pg.locator('[role="dialog"] button').filter({ hasText: /qabul|accept|roziman/i }).first();
    if (await btn.isVisible({ timeout: 2_000 })) { await btn.click(); await pg.waitForTimeout(300); }
  } catch { /* no consent modal */ }
}

// One cold parent UI login in a brand-new context; returns { ok, url }
async function coldParentLogin(email) {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true,
  });
  const pg = await ctx.newPage();
  try {
    await pg.goto(`${PARENT_PORTAL}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
    const parentToggle = pg.locator('button').filter({ hasText: /ota-ona/i }).first();
    if (await parentToggle.isVisible({ timeout: 3_000 }).catch(() => false)) await parentToggle.click();
    await pg.fill('input[type="email"]', email);
    await pg.fill('input[type="password"]', PW);
    await pg.click('button[type="submit"]');
    await pg.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 30_000 });
    await dismissConsent(pg);
    // Stability window — the pre-fix bounce arrived within ~1-5s of landing
    await pg.waitForTimeout(5_000);
    return { ok: !/\/login/.test(new URL(pg.url()).pathname), url: pg.url() };
  } catch (e) {
    return { ok: false, url: `ERROR: ${e.message.slice(0, 120)}` };
  } finally {
    await ctx.close();
  }
}

test('STREAK | 20/20 cold parent UI logins land and stay on dashboard', async () => {
  test.setTimeout(20 * 50_000);
  // Rotate across the accounts that originally exhibited DEF-009 (3/6/7/10/12) + parent1
  const accounts = [3, 6, 7, 10, 12, 1];
  const results = [];
  for (let i = 0; i < 20; i++) {
    const email = `parent${accounts[i % accounts.length]}@uchqun.uz`;
    const r = await coldParentLogin(email);
    results.push({ attempt: i + 1, email, ...r });
    console.log(`[STREAK] ${i + 1}/20 ${email} → ${r.ok ? 'OK' : 'BOUNCE/FAIL'} (${r.url})`);
  }
  const failures = results.filter(r => !r.ok);
  console.log(`[STREAK] ${results.length - failures.length}/20 clean`);
  expect(failures).toEqual([]);
});

test('REGRESSION | invalid session still redirects to /login', async () => {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true,
  });
  const pg = await ctx.newPage();

  // Authenticate properly first
  const resp = await ctx.request.post(`${API}/api/v1/auth/login`, {
    data: { email: 'parent1@uchqun.uz', password: PW },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(resp.status()).toBe(200);
  await pg.goto(`${PARENT_PORTAL}/`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await dismissConsent(pg);
  await pg.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  expect(new URL(pg.url()).pathname).not.toMatch(/\/login/);

  // Kill the session completely: BOTH cookies gone = expired/invalid session
  await ctx.clearCookies();
  await pg.reload({ waitUntil: 'domcontentloaded' });
  await pg.waitForURL(/\/login/, { timeout: 20_000 });
  expect(new URL(pg.url()).pathname).toMatch(/\/login$/);
  console.log('[REGRESSION] PASS: fully-invalid session redirected to /login');
  await ctx.close();
});

test('PORTALS | teacher + admin + reception + government UI logins still clean', async () => {
  test.setTimeout(5 * 60_000);

  // Teacher on the parent portal host (same app, teacher role path)
  const tctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const tpg = await tctx.newPage();
  await tpg.goto(`${PARENT_PORTAL}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await tpg.fill('input[type="email"]', 'teacher1@uchqun.uz');
  await tpg.fill('input[type="password"]', PW);
  await tpg.click('button[type="submit"]');
  await tpg.waitForURL(/teacher/, { timeout: 30_000 });
  await tpg.waitForTimeout(5_000);
  expect(new URL(tpg.url()).pathname).not.toMatch(/\/login/);
  console.log('[PORTALS] teacher OK →', tpg.url());
  await tctx.close();

  for (const [name, cfg] of Object.entries(PORTALS)) {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
    const pg = await ctx.newPage();
    await pg.goto(`${cfg.url}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
    await pg.fill('input[type="email"]', cfg.email);
    await pg.fill('input[type="password"]', PW);
    // dnp design-system portals use PrimaryButton (no type="submit") labeled Kirish/Войти/Sign in
    const submitBtn = pg.locator('button[type="submit"]')
      .or(pg.locator('button').filter({ hasText: /kirish|войти|sign in/i })).first();
    await submitBtn.click();
    await pg.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 30_000 });
    await pg.waitForTimeout(5_000);
    expect(new URL(pg.url()).pathname, `${name} bounced back to /login`).not.toMatch(/\/login/);
    console.log(`[PORTALS] ${name} OK →`, pg.url());
    await ctx.close();
  }
});
