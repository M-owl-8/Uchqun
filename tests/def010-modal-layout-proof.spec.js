// DEF-010 Layout Proof — S16
// Verifies PrivacyConsentModal accept button is always on-screen at:
//   - 390×844 (standard mobile)
//   - 360×640 (short phone)
// Uses route interception to force the modal to show regardless of whether
// the parent account has already accepted — the fix is layout-only, so
// forced re-show is explicitly acceptable (noted per S16 spec).

const { test, expect } = require('@playwright/test');

const BASE  = 'https://teacher-production-0647.up.railway.app';
const PW    = 'Test@2026';
const EMAIL = 'parent1@uchqun.uz';

const ss = (page, name) =>
  page.screenshot({ path: `audits/beta/screens/${name}.png`, fullPage: false }).catch(() => {});

// Force-show the modal on every navigation: intercept both GET (required:true)
// and POST (success) for the privacy-consent endpoint, regardless of backend.
async function setupConsentIntercepts(page) {
  await page.route('**/parent/privacy-consent', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { required: true } }),
      });
    } else if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.continue();
    }
  });
}

async function login(page, email, password = PW) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 25000 });

  // Click parent tab FIRST so the form doesn't reset after fill
  const parentTab = page.locator('button, [role="tab"]').filter({ hasText: /ota.ona|parent/i }).first();
  if (await parentTab.isVisible().catch(() => false)) await parentTab.click().catch(() => {});
  await page.waitForTimeout(300); // let tab switch settle

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /kirish|login|sign in/i }).first().click();

  // Wait for URL to leave /login — predicate receives a URL object; use .href
  await page.waitForURL(
    url => !url.href.includes('/login') && !url.href.includes('/change-password'),
    { timeout: 30000 }
  ).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

// ─── 390×844 — standard mobile ───────────────────────────────────────────────
test.describe.serial('DEF-010 @ 390×844 — standard mobile', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      storageState: undefined,
    });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    // Set up intercepts before login so they catch the POST-login GET
    await setupConsentIntercepts(page);
  });

  test.afterAll(async () => {
    await page.context().close().catch(() => {});
  });

  test('login parent1 on fresh context', async () => {
    await login(page, EMAIL);
    await ss(page, 'DEF-010-390-after-login');
    expect(page.url(), 'Should have left /login after auth').not.toMatch(/\/login$/);
  });

  test('modal appears — accept button is within 390×844 viewport', async () => {
    const modal = page.locator('[role="dialog"][aria-labelledby="privacy-consent-title"]');
    await modal.waitFor({ state: 'visible', timeout: 12000 });
    await ss(page, 'DEF-010-390-modal-open');

    const acceptBtn = modal.getByRole('button', { name: /qabul|roziman|accept|davom/i }).first();
    await acceptBtn.waitFor({ state: 'visible', timeout: 8000 });

    const btnBox = await acceptBtn.boundingBox();
    expect(btnBox, 'Accept button must be rendered (has bounding box)').toBeTruthy();
    expect(
      btnBox.y + btnBox.height,
      `Accept button bottom edge (${Math.round(btnBox.y + btnBox.height)}px) must be within 844px viewport`
    ).toBeLessThanOrEqual(844);

    await ss(page, 'DEF-010-390-button-visible');
  });

  test('policy text body is scrollable (overflow-y-auto present inside modal)', async () => {
    const scrollBody = page.locator('[role="dialog"] .overflow-y-auto').first();
    await expect(scrollBody, 'Scrollable body div must exist inside modal').toBeAttached();
    await ss(page, 'DEF-010-390-scroll-body');
  });

  test('check both boxes → accept enabled → click accept → modal closes → dashboard visible', async () => {
    const modal = page.locator('[role="dialog"][aria-labelledby="privacy-consent-title"]');
    const checkboxes = modal.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    const acceptBtn = modal.getByRole('button', { name: /qabul|roziman|accept|davom/i }).first();
    await expect(acceptBtn).toBeEnabled({ timeout: 3000 });
    await ss(page, 'DEF-010-390-before-accept');
    await acceptBtn.click();

    await modal.waitFor({ state: 'hidden', timeout: 12000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await ss(page, 'DEF-010-390-dashboard-after-accept');
    expect(page.url()).not.toMatch(/\/login$/);
  });
});

// ─── 360×640 — short phone ────────────────────────────────────────────────────
test.describe.serial('DEF-010 @ 360×640 — short phone', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 360, height: 640 },
      isMobile: true,
      storageState: undefined,
    });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await setupConsentIntercepts(page);
  });

  test.afterAll(async () => {
    await page.context().close().catch(() => {});
  });

  test('login parent1 on fresh context (360×640)', async () => {
    await login(page, EMAIL);
    await ss(page, 'DEF-010-640-after-login');
    expect(page.url(), 'Should have left /login after auth').not.toMatch(/\/login$/);
  });

  test('modal appears — accept button is within 360×640 viewport', async () => {
    const modal = page.locator('[role="dialog"][aria-labelledby="privacy-consent-title"]');
    await modal.waitFor({ state: 'visible', timeout: 12000 });
    await ss(page, 'DEF-010-640-modal-open');

    const acceptBtn = modal.getByRole('button', { name: /qabul|roziman|accept|davom/i }).first();
    await acceptBtn.waitFor({ state: 'visible', timeout: 8000 });

    const btnBox = await acceptBtn.boundingBox();
    expect(btnBox, 'Accept button must be rendered').toBeTruthy();
    expect(
      btnBox.y + btnBox.height,
      `Accept button bottom edge (${Math.round(btnBox.y + btnBox.height)}px) must be within 640px viewport`
    ).toBeLessThanOrEqual(640);

    await ss(page, 'DEF-010-640-button-visible');
  });

  test('check both boxes → accept closes modal — 360×640', async () => {
    const modal = page.locator('[role="dialog"][aria-labelledby="privacy-consent-title"]');
    const checkboxes = modal.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    const acceptBtn = modal.getByRole('button', { name: /qabul|roziman|accept|davom/i }).first();
    await expect(acceptBtn).toBeEnabled({ timeout: 3000 });
    await ss(page, 'DEF-010-640-before-accept');
    await acceptBtn.click();

    await modal.waitFor({ state: 'hidden', timeout: 12000 });
    await ss(page, 'DEF-010-640-dashboard-after-accept');
  });
});
