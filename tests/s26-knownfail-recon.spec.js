/**
 * S26 / KNOWN-FAIL reconciliation — G-050 cold-load proof
 *
 * For each locale (uz, ru, en): fresh context → API login gov.republic →
 * set dnp:lang via init script → cold-load /government/platform → open the
 * Government Users tab → set account type to "secondary" in the inline
 * create form → assert the capability checkboxes render translated labels
 * (canRateSchools et al.) with NO raw i18n key visible. Screenshot each
 * locale (live render — the DEF-007 lesson).
 */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const PORTAL = 'https://government-production.up.railway.app';
const API    = 'https://uchqun-production-b484.up.railway.app';
const PW     = 'Test@2026';
const SHOTS  = path.join(__dirname, '..', 'audits', 'beta', 'screens');

const LOCALES = [
  { lang: 'uz', tab: 'Davlat foydalanuvchilari', expected: 'Maktablarni Baholash' },
  { lang: 'ru', tab: 'Госпользователи',          expected: 'Оценивать Школы' },
  { lang: 'en', tab: 'Government Users',         expected: 'Rate Schools' },
];

let browser;
test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
test.afterAll(async () => { await browser.close(); });

for (const { lang, tab, expected } of LOCALES) {
  test(`G-050 | provisioning grants render translated in ${lang} (cold load)`, async () => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();

    const login = await ctx.request.post(`${API}/api/v1/auth/login`, {
      data: { email: 'gov.republic@uchqun.uz', password: PW },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(login.status()).toBe(200);

    // Set locale BEFORE app load so the cold render uses it
    await pg.addInitScript((l) => localStorage.setItem('dnp:lang', l), lang);

    await pg.goto(`${PORTAL}/government/platform`, { waitUntil: 'domcontentloaded', timeout: 40_000 });
    await pg.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Open the Government Users tab (exact per-locale label)
    const govTab = pg.locator('button').filter({ hasText: tab }).first();
    await expect(govTab).toBeVisible({ timeout: 10_000 });
    await govTab.click();
    await pg.waitForTimeout(800);

    // In the inline create form, switch account type to "secondary"
    const typeSelect = pg.locator('select:has(option[value="secondary"])').first();
    await expect(typeSelect).toBeVisible({ timeout: 10_000 });
    await typeSelect.selectOption('secondary');
    await pg.waitForTimeout(400);

    // The grants checkbox grid must now show translated labels
    const grantLabel = pg.getByText(expected, { exact: true }).first();
    await expect(grantLabel).toBeVisible({ timeout: 5_000 });

    // No raw i18n keys anywhere in the main content
    const bodyText = await pg.locator('main, [class*="max-w"]').first().innerText();
    expect(bodyText).not.toMatch(/provision\.grants\./);
    expect(bodyText).not.toMatch(/\bcanRateSchools\b/);
    expect(bodyText).not.toMatch(/\bcanViewAuditLog\b/);

    await grantLabel.scrollIntoViewIfNeeded();
    await pg.screenshot({ path: path.join(SHOTS, `S26-G-050-grants-${lang}.png`) });
    console.log(`[G-050/${lang}] PASS: "${expected}" rendered; no raw keys`);
    await ctx.close();
  });
}
