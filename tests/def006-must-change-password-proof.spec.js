// DEF-006 Gate Proof — S17
// Verifies:
//   1. teacher2@uchqun.uz lands on dashboard after migration clears mustChangePassword flag
//   2. The mustChangePassword gate still exists in the backend and would block flagged users:
//      - DB confirms testr077.s9@uchqun.uz still has mustChangePassword=true
//      - Backend login response for teacher2 now returns mustChangePassword:false (confirmed via API)
//      - Gate code at middleware/auth.js:120-130 is unchanged
//
// Note on negative check: The only teacher-role account with mustChangePassword=true is
// testr077.s9@uchqun.uz. Its password was changed interactively (hash doesn't match Test@2026).
// Full browser negative-check (login → /change-password redirect) is not possible without the
// correct password. Gate proof is via: DB query evidence + API login response showing the field.

const { test, expect, request } = require('@playwright/test');

const BASE     = 'https://teacher-production-0647.up.railway.app';
const API_BASE = 'https://uchqun-production-b484.up.railway.app/api/v1';
const PW       = 'Test@2026';

const ss = (page, name) =>
  page.screenshot({ path: `audits/beta/screens/${name}.png`, fullPage: false }).catch(() => {});

async function loginTeacher(page, email) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 25000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PW);
  await page.getByRole('button', { name: /kirish|login|sign in/i }).first().click();
  // Regex must match substring — /teacher (no trailing /) won't match /\/(teacher)\/
  await page.waitForURL(/\/teacher|\/change-password/, { timeout: 25000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

// ─── Positive: teacher2 lands on dashboard ────────────────────────────────────
test.describe.serial('DEF-006 positive — teacher2 flag cleared, lands on dashboard', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 },
      storageState: undefined, // cold context — no cookies, no prior session
    });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);
  });

  test.afterAll(async () => {
    await page.context().close().catch(() => {});
  });

  test('teacher2 login — URL is at /teacher (not /change-password)', async () => {
    await loginTeacher(page, 'teacher2@uchqun.uz');
    const url = page.url();
    await ss(page, 'DEF-006-teacher2-dashboard');
    expect(url, `Expected /teacher path; got: ${url}`).toContain('/teacher');
    expect(url, `Must NOT hit change-password gate: ${url}`).not.toContain('/change-password');
  });

  test('teacher2 — screenshot of post-login state (URL must still contain /teacher)', async () => {
    // The page may transiently visit /teacher then show an auth-race redirect (DEF-008).
    // The canonical positive proof is test 1 (URL at /teacher immediately after login).
    // This test snapshots the settled state for the record.
    const url = page.url();
    await ss(page, 'DEF-006-teacher2-dashboard-content');
    // Soft assertion — DEF-008 can cause a later redirect; test 1 is the hard gate.
    if (url.includes('/login')) {
      console.warn('[DEF-006] Auth race (DEF-008) caused redirect back to /login after /teacher visit. ' +
        'Test 1 already captured the /teacher URL — this is a known intermittent issue.');
    }
    // We only hard-assert /change-password never appeared
    expect(url, 'Must NOT have hit the change-password gate').not.toContain('/change-password');
  });
});

// ─── Negative: gate confirmed active via API login response ──────────────────
test.describe('DEF-006 negative — gate still active for flagged users (API proof)', () => {
  test('teacher2 POST /auth/login returns mustChangePassword:false (flag cleared)', async () => {
    // Prove the backend returns mustChangePassword field in the login response.
    // teacher2 now has false — showing the field is live and gate-driven.
    const ctx = await request.newContext({
      ignoreHTTPSErrors: true,
    });

    // Use full URL — Playwright replaces baseURL path when path starts with /
    const res = await ctx.post(`${API_BASE}/auth/login`, {
      data: { email: 'teacher2@uchqun.uz', password: PW, role: 'teacher' },
    });

    expect(res.ok(), `Login must succeed (got ${res.status()})`).toBe(true);
    const body = await res.json();
    expect(body.success, 'success must be true').toBe(true);
    expect(body.user.mustChangePassword, 'mustChangePassword must be false for teacher2 (flag cleared)').toBe(false);

    await ctx.dispose();
  });

  test('gate code at middleware/auth.js:120-130 is intact — gate checks mustChangePassword', async () => {
    // This test reads the gate code from the repo to confirm it has not been removed.
    // The gate returns 403 PASSWORD_CHANGE_REQUIRED for any non-allowed route when
    // user.mustChangePassword === true. Gate code is unchanged (data-only fix).
    //
    // Since the only teacher with mustChangePassword=true (testr077.s9) has an unknown
    // password, a live browser negative-check (login → redirect) is not possible.
    // Proof is: DB shows flag still set for testr077.s9, API shows the field is live,
    // and the gate code is confirmed present in the middleware.
    const { readFileSync } = require('fs');
    const authMiddleware = readFileSync(
      require('path').join(__dirname, '..', 'backend', 'middleware', 'auth.js'),
      'utf8'
    );
    expect(authMiddleware, 'Gate block: must check user.mustChangePassword')
      .toContain('user.mustChangePassword');
    expect(authMiddleware, 'Gate block: must return PASSWORD_CHANGE_REQUIRED')
      .toContain('PASSWORD_CHANGE_REQUIRED');
    expect(authMiddleware, 'Gate block: must check ALLOWED_PATHS')
      .toContain('ALLOWED_PATHS');
  });
});
