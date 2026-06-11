/**
 * S29 production gates — cold-load proofs after the content-gate execution.
 *
 * PL015-GOV     government SchoolDetail rate form shows the five real uz names
 * PL015-PARENT  parent school-rating form shows the real names (390px)
 * PL025-TEACHER teacher login forgot-password toggle reveals contact-admin help
 * PL025-RECEPT  reception login has the same toggle (previously none)
 * PL017-NOTE    MonitoringJournal shows the physical-journal coexistence note
 * PL024-CHILDLESS childless.test@uchqun.uz cold UI login → stable outcome, no loop
 */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const TP   = 'https://teacher-production-0647.up.railway.app';
const GOV  = 'https://government-production.up.railway.app';
const REC  = 'https://reception-production-ba41.up.railway.app';
const API  = 'https://uchqun-production-b484.up.railway.app';
const PW   = 'Test@2026';
const SHOTS = path.join(__dirname, '..', 'audits', 'beta', 'screens');

const INDICATOR_NAMES_UZ = [
  'Muassasa tozaligi', 'Xizmat sifati', 'Muassasa tarbiyachisi', "Bolaning o'sishi", 'Muassasaga ishonch',
];

let browser;
test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
test.afterAll(async () => { await browser.close(); });

async function apiLogin(ctx, email) {
  const r = await ctx.request.post(`${API}/api/v1/auth/login`, {
    data: { email, password: PW }, headers: { 'Content-Type': 'application/json' },
  });
  expect(r.status()).toBe(200);
}

test('PL015-GOV | rate form shows the five real indicator names (uz)', async () => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  await apiLogin(ctx, 'gov.republic@uchqun.uz');
  await pg.goto(`${GOV}/government/schools`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await pg.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  // Open the first school's detail — rows navigate via onClick, not anchors
  const firstSchool = pg.locator('tbody tr').first();
  await firstSchool.click();
  await pg.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await pg.waitForTimeout(1_000);
  const bodyText = await pg.locator('body').innerText();
  for (const name of INDICATOR_NAMES_UZ) expect(bodyText).toContain(name);
  expect(bodyText).not.toMatch(/Ko'rsatkich \d/);
  const anchor = pg.getByText('Muassasa tozaligi').first();
  await anchor.scrollIntoViewIfNeeded();
  await pg.screenshot({ path: path.join(SHOTS, 'S29-PL015-gov-rate-form-uz.png') });
  console.log('[PL015-GOV] PASS: five real names render; no filler');
  await ctx.close();
});

test('PL015-PARENT | school-rating form shows the real names (390px)', async () => {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true,
  });
  const pg = await ctx.newPage();
  await apiLogin(ctx, 'parent1@uchqun.uz');
  await pg.goto(`${TP}/rating`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await pg.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  try {
    const btn = pg.locator('[role="dialog"] button').filter({ hasText: /qabul|accept|roziman/i }).first();
    if (await btn.isVisible({ timeout: 2_000 })) { await btn.click(); await pg.waitForTimeout(300); }
  } catch { /* no consent modal */ }
  await pg.waitForTimeout(1_000);
  const bodyText = await pg.locator('body').innerText();
  for (const name of INDICATOR_NAMES_UZ) expect(bodyText).toContain(name);
  expect(bodyText).not.toMatch(/Ko'rsatkich \d/);
  const anchor = pg.getByText('Muassasa tozaligi').first();
  await anchor.scrollIntoViewIfNeeded();
  await pg.screenshot({ path: path.join(SHOTS, 'S29-PL015-parent-rating-form-uz.png') });
  console.log('[PL015-PARENT] PASS: five real names render at 390px; no filler');
  await ctx.close();
});

test('PL025-TEACHER | forgot-password toggle reveals contact-admin help', async () => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage();
  await pg.goto(`${TP}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await pg.locator('button').filter({ hasText: /parolni unutdingizmi|forgot password/i }).first().click();
  const help = pg.getByTestId('forgot-password-help');
  await expect(help).toBeVisible({ timeout: 5_000 });
  expect(await help.innerText()).toMatch(/administrator/i);
  await pg.screenshot({ path: path.join(SHOTS, 'S29-PL025-teacher-login-help.png') });
  console.log('[PL025-TEACHER] PASS: help toggle works');
  await ctx.close();
});

test('PL025-RECEPT | reception login now has the help toggle', async () => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage();
  await pg.goto(`${REC}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await pg.locator('button').filter({ hasText: /parolni unutdingizmi|forgot password/i }).first().click();
  const help = pg.getByTestId('forgot-password-help');
  await expect(help).toBeVisible({ timeout: 5_000 });
  await pg.screenshot({ path: path.join(SHOTS, 'S29-PL025-reception-login-help.png') });
  console.log('[PL025-RECEPT] PASS: reception toggle works');
  await ctx.close();
});

test('PL017-NOTE | physical-journal coexistence note at journal entry', async () => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage();
  await apiLogin(ctx, 'teacher1@uchqun.uz');
  await pg.goto(`${TP}/teacher/monitoring`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  await pg.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  const note = pg.getByText(/jismoniy jurnalda ham yuritiladi/i).first();
  await expect(note).toBeVisible({ timeout: 10_000 });
  await pg.screenshot({ path: path.join(SHOTS, 'S29-PL017-journal-note.png') });
  console.log('[PL017-NOTE] PASS: note visible');
  await ctx.close();
});

test('PL024-CHILDLESS | childless parent cold UI login → stable outcome, no loop', async () => {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true,
  });
  const pg = await ctx.newPage();
  const navLog = [];
  pg.on('framenavigated', (f) => { if (f === pg.mainFrame()) navLog.push(new URL(f.url()).pathname); });

  await pg.goto(`${TP}/login`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  const parentToggle = pg.locator('button').filter({ hasText: /ota-ona/i }).first();
  if (await parentToggle.isVisible({ timeout: 3_000 }).catch(() => false)) await parentToggle.click();
  await pg.fill('input[type="email"]', 'childless.test@uchqun.uz');
  await pg.fill('input[type="password"]', PW);
  await pg.click('button[type="submit"]');
  await pg.waitForTimeout(10_000); // settle window — loops/bounces show up here

  const finalPath = new URL(pg.url()).pathname;
  const loginBounces = navLog.filter((p) => p.endsWith('/login')).length;
  console.log('[PL024] nav log:', navLog.join(' → '));
  console.log('[PL024] final path:', finalPath, '| login appearances:', loginBounces);
  const bodyText = await pg.locator('body').innerText();
  const hasErrorText = /email yoki parol noto'g'ri|invalid/i.test(bodyText);
  console.log('[PL024] credential-error text visible:', hasErrorText);
  await pg.screenshot({ path: path.join(SHOTS, 'S29-PL024-childless-login-outcome.png'), fullPage: true });

  // Hard assertions: logged in (left /login), stayed (no bounce-back), no false credential error
  expect(finalPath).not.toMatch(/\/login/);
  expect(hasErrorText).toBe(false);
  console.log('[PL024] PASS: childless parent lands and stays; no loop, no false error');
  await ctx.close();
});
