// DEF-007 Cold-load proof — S15
// Verifies attendance status labels render as words, not raw keys
// real Uzbek words (not raw i18n keys) on a fresh incognito context
// with no prior browser cache or cookies.
//
// Run: npx playwright test tests/def007-cold-load-proof.spec.js --headed

const { test, expect } = require('@playwright/test');

const BASE = 'https://teacher-production-0647.up.railway.app';
const PW   = 'Test@2026';
const EMAIL = 'teacher1@uchqun.uz';

const ss = (page, name) =>
  page.screenshot({ path: `audits/beta/screens/${name}.png`, fullPage: false }).catch(() => {});

// Exact Uzbek words the attendance component must render
const EXPECTED_STATUS_LABELS = ['Bor', 'Uyda', 'Kasal', 'Shifoxonada', "Yo'q"];

test.describe('DEF-007 cold-load proof', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    // Fresh incognito context — no cookies, no cached JS/CSS
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      storageState: undefined, // no saved state
    });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
  });

  test.afterAll(async () => {
    await page.context().close().catch(() => {});
  });

  test('cold login on fresh context', async () => {
    await page.goto(`${BASE}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 25000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PW);
    await page.getByRole('button', { name: /kirish|login|sign in/i }).first().click();
    await page.waitForURL(/\/teacher|\/change-password/, { timeout: 25000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await ss(page, 'DEF-007-cold-login');
    expect(page.url()).toMatch(/\/teacher/);
  });

  test('attendance page — status labels are Uzbek words, not raw keys', async () => {
    await page.goto(`${BASE}/teacher/attendance`);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    // Wait for child cards to appear (attendance grid)
    await page.waitForSelector('[class*="attend"], [class*="child"], [class*="grid"], button', { timeout: 15000 }).catch(() => {});
    await ss(page, 'DEF-007-attendance-cold');

    const bodyText = await page.locator('body').innerText();

    // Confirm none of the raw key patterns appear in the page text
    const rawKeyPatterns = [
      'attendance.statusPresent',
      'attendance.statusHomeLeave',
      'attendance.statusSick',
      'attendance.statusHospitalized',
      'attendance.statusAbsent',
      'attendance.statusUnset',
    ];
    for (const rawKey of rawKeyPatterns) {
      expect(bodyText, `Raw key "${rawKey}" must NOT appear in attendance page`).not.toContain(rawKey);
    }

    // Confirm at least some of the expected Uzbek words appear
    const foundWords = EXPECTED_STATUS_LABELS.filter(w => bodyText.includes(w));
    expect(
      foundWords.length,
      `At least 2 Uzbek status words must appear on attendance page. Found: ${foundWords.join(', ')}`
    ).toBeGreaterThanOrEqual(2);
  });

});
