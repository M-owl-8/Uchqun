# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: s22v4-government.spec.js >> G-002 | password toggle → type=text
- Location: tests\s22v4-government.spec.js:91:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "text"
Received: "password"
```

# Test source

```ts
  7   |  * G-017  export CSV button present
  8   |  * G-018–G-021  school detail: page loads; basic info; stats sidebar; rating display
  9   |  * G-022/G-023  archive/reactivate → cancel path (confirm dialog exists)
  10  |  * G-024/G-025  ratings page parent direction visible; expand school card
  11  |  * G-027/G-028  rate school 5 indicators + gov direction toggle
  12  |  * G-029/G-030  students list region-scoped + search
  13  |  * G-032/G-033  teachers list + search
  14  |  * G-035  parents list
  15  |  * G-037–G-040  messages: list; search; mark read; reply
  16  |  * G-043/G-044  admins list; create admin
  17  |  * G-047/G-048  gov users list; provision modal
  18  |  * G-053/G-054  registrations list; approve (if pending)
  19  |  * G-057/G-058/G-061  audit log; filter; paginate
  20  |  * G-062–G-065  warnings: list; filter severity; resolve; resolved display
  21  |  * G-067–G-071  nav: scope indicator; active link; user card; logout; lang switcher
  22  |  * G-073  toast on action
  23  |  * G-074/G-075/G-076  profile view; edit name; password settings page
  24  |  */
  25  | const { test, expect, chromium } = require('@playwright/test');
  26  | const path = require('path');
  27  | const fs   = require('fs');
  28  | 
  29  | const PORTAL   = 'https://government-production.up.railway.app';
  30  | const API      = 'https://uchqun-production-b484.up.railway.app';
  31  | const AUTH_DIR = path.join(__dirname, '..', '.auth');
  32  | const PW       = 'Test@2026';
  33  | 
  34  | const ACCOUNTS = {
  35  |   govR: { name: 'govR', email: 'gov.republic@uchqun.uz' },
  36  |   govT: { name: 'govT', email: 'gov.toshkent@uchqun.uz' },
  37  |   govS: { name: 'govS', email: 'gov.samarqand@uchqun.uz' },
  38  | };
  39  | 
  40  | function authFile(name) {
  41  |   for (const prefix of ['recon22-', 's22v3-', 's22v4-', '']) {
  42  |     const f = path.join(AUTH_DIR, `${prefix}${name}.json`);
  43  |     if (fs.existsSync(f)) return f;
  44  |   }
  45  |   return path.join(AUTH_DIR, `s22v4-${name}.json`);
  46  | }
  47  | 
  48  | async function getAuthPage(browser, name, email) {
  49  |   const saved = authFile(name);
  50  |   if (fs.existsSync(saved)) {
  51  |     try {
  52  |       const ctx  = await browser.newContext({ ignoreHTTPSErrors: true, storageState: saved });
  53  |       const page = await ctx.newPage();
  54  |       await page.goto('about:blank');
  55  |       const rr = await page.request.post(`${API}/api/v1/auth/refresh`);
  56  |       if (rr.status() === 200) { await ctx.storageState({ path: saved }); return page; }
  57  |       await ctx.close();
  58  |     } catch {}
  59  |   }
  60  |   const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
  61  |   const page = await ctx.newPage();
  62  |   const resp = await page.request.post(`${API}/api/v1/auth/login`, {
  63  |     data: { email, password: PW }, headers: { 'Content-Type': 'application/json' },
  64  |   });
  65  |   if (resp.status() !== 200) throw new Error(`Login ${email}: HTTP ${resp.status()}`);
  66  |   fs.mkdirSync(AUTH_DIR, { recursive: true });
  67  |   await ctx.storageState({ path: path.join(AUTH_DIR, `s22v4-${name}.json`) });
  68  |   return page;
  69  | }
  70  | 
  71  | async function go(pg, url) {
  72  |   await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  73  |   await pg.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  74  | }
  75  | 
  76  | let browser;
  77  | const p = {};
  78  | 
  79  | test.beforeAll(async () => {
  80  |   browser = await chromium.launch({ headless: true });
  81  |   p.R = await getAuthPage(browser, ACCOUNTS.govR.name, ACCOUNTS.govR.email);
  82  |   p.T = await getAuthPage(browser, ACCOUNTS.govT.name, ACCOUNTS.govT.email);
  83  |   p.S = await getAuthPage(browser, ACCOUNTS.govS.name, ACCOUNTS.govS.email);
  84  | });
  85  | 
  86  | test.afterAll(async () => { await browser.close(); });
  87  | 
  88  | // ─────────────────────────────────────────────────────────────────────────
  89  | // G-002: password toggle → input type=text
  90  | // ─────────────────────────────────────────────────────────────────────────
  91  | test('G-002 | password toggle → type=text', async () => {
  92  |   const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  93  |   const pg  = await ctx.newPage();
  94  |   try {
  95  |     await pg.goto(`${PORTAL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  96  |     const pwInput = pg.locator('input[type="password"]').first();
  97  |     await expect(pwInput).toBeVisible({ timeout: 8_000 });
  98  |     expect(await pwInput.getAttribute('type')).toBe('password');
  99  | 
  100 |     const toggle = pg.locator('button').filter({ has: pg.locator('svg') }).last();
  101 |     if (!(await toggle.isVisible({ timeout: 3_000 }).catch(() => false))) {
  102 |       test.skip(true, 'Password toggle not found on government login page');
  103 |       return;
  104 |     }
  105 |     await toggle.click();
  106 |     await pg.waitForTimeout(300);
> 107 |     expect(await pwInput.getAttribute('type')).toBe('text');
      |                                                ^ Error: expect(received).toBe(expected) // Object.is equality
  108 |     console.log('[G-002] PASS');
  109 |   } finally {
  110 |     await ctx.close();
  111 |   }
  112 | });
  113 | 
  114 | // ─────────────────────────────────────────────────────────────────────────
  115 | // G-004/G-070: logout → redirect to login
  116 | // ─────────────────────────────────────────────────────────────────────────
  117 | test('G-004/G-070 | logout → redirect to login', async () => {
  118 |   // Use a fresh context so main accounts aren't logged out
  119 |   const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: authFile('govS') });
  120 |   const pg  = await ctx.newPage();
  121 |   try {
  122 |     await go(pg, `${PORTAL}/government`);
  123 | 
  124 |     const logoutBtn = pg.getByRole('button', { name: /chiqish|logout|exit/i }).first()
  125 |       .or(pg.locator('[class*="logout"],[class*="chiqish"]').first());
  126 |     if (!(await logoutBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
  127 |       test.skip(true, 'Logout button not found (Chiqish)');
  128 |       return;
  129 |     }
  130 |     await logoutBtn.click();
  131 |     await pg.waitForTimeout(1_500);
  132 | 
  133 |     // Should redirect to login
  134 |     const url = pg.url();
  135 |     const onLogin = url.includes('/login') || url.includes('login');
  136 |     if (!onLogin) await pg.waitForURL(/login/, { timeout: 5_000 }).catch(() => {});
  137 |     expect(pg.url().toLowerCase()).toMatch(/login|\/$/);
  138 |     console.log('[G-004/G-070] PASS: redirected to', pg.url());
  139 |   } finally {
  140 |     await ctx.close();
  141 |   }
  142 | });
  143 | 
  144 | // ─────────────────────────────────────────────────────────────────────────
  145 | // G-006–G-011: dashboard stats, scope label, pending regs, ratings, regional table, refresh
  146 | // ─────────────────────────────────────────────────────────────────────────
  147 | test('G-006-G-011 | dashboard: 4 stat cards + scope label + regional table + refresh', async () => {
  148 |   const pg = p.R;
  149 |   await go(pg, `${PORTAL}/government`);
  150 | 
  151 |   // G-006: 4 stat cards with numbers
  152 |   const statCards = pg.locator('[class*="card"],[class*="stat"],[class*="widget"]')
  153 |     .filter({ hasText: /\d+/ });
  154 |   const cnt = await statCards.count();
  155 |   console.log('[G-006] stat cards with numbers:', cnt);
  156 |   expect(cnt).toBeGreaterThanOrEqual(2);
  157 |   console.log('[G-006] PASS: stat cards visible');
  158 | 
  159 |   // G-007: scope label — republic should show "Barcha viloyatlar" or "Respublika"
  160 |   const scopeLabel = pg.locator('[class*="scope"],[class*="region"],[class*="viloyat"]').first()
  161 |     .or(pg.getByText(/Barcha viloyatlar|Respublika|Republic/i).first());
  162 |   const scopeVis = await scopeLabel.isVisible({ timeout: 3_000 }).catch(() => false);
  163 |   console.log('[G-007] scope label visible:', scopeVis);
  164 |   if (scopeVis) console.log('[G-007] PASS, text:', (await scopeLabel.textContent()).slice(0, 40));
  165 | 
  166 |   // G-008: pending registrations section
  167 |   const pendingReg = pg.locator('[class*="reg"],[class*="registration"],[class*="kutilmoqda"]').first()
  168 |     .or(pg.getByText(/Ro'yxatga olish|Registration|kutilmoqda/i).first());
  169 |   const prVis = await pendingReg.isVisible({ timeout: 3_000 }).catch(() => false);
  170 |   console.log('[G-008] pending registrations section visible:', prVis);
  171 | 
  172 |   // G-009: school ratings mini-list
  173 |   const ratingsSection = pg.locator('[class*="rating"],[class*="reyting"]').first()
  174 |     .or(pg.getByText(/Maktab reytingi|School rating/i).first());
  175 |   const rrVis = await ratingsSection.isVisible({ timeout: 3_000 }).catch(() => false);
  176 |   console.log('[G-009] school ratings section visible:', rrVis);
  177 | 
  178 |   // G-010: regional breakdown table — republic scope should see it; region scope should NOT
  179 |   const breakdownTable = pg.locator('[class*="breakdown"],[class*="region"],[class*="viloyat"]')
  180 |     .locator('table,thead,tr').first();
  181 |   const tableVis = await breakdownTable.isVisible({ timeout: 3_000 }).catch(() => false);
  182 |   console.log('[G-010] regional breakdown table visible (republic):', tableVis);
  183 |   // For toshkent — verify it's NOT shown
  184 |   await go(p.T, `${PORTAL}/government`);
  185 |   const toshTableVis = await p.T.locator('[class*="breakdown"]').locator('table').first()
  186 |     .isVisible({ timeout: 2_000 }).catch(() => false);
  187 |   console.log('[G-010] regional breakdown visible for Toshkent (should be false):', toshTableVis);
  188 | 
  189 |   // G-011: refresh button
  190 |   const refreshBtn = pg.locator('button').filter({ has: pg.locator('[class*="refresh"],[data-testid*="refresh"]') })
  191 |     .first()
  192 |     .or(pg.getByRole('button', { name: /yangilash|refresh/i }).first());
  193 |   if (await refreshBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
  194 |     await refreshBtn.click();
  195 |     await pg.waitForTimeout(1_000);
  196 |     console.log('[G-011] PASS: refresh clicked');
  197 |   } else {
  198 |     console.log('[G-011] refresh button not found in dashboard');
  199 |   }
  200 | });
  201 | 
  202 | // ─────────────────────────────────────────────────────────────────────────
  203 | // G-013–G-015: schools list scoped, search, filter
  204 | // ─────────────────────────────────────────────────────────────────────────
  205 | test('G-013-G-015 | schools list region-scoped + search + type filter', async () => {
  206 |   const pg = p.T;
  207 |   await go(pg, `${PORTAL}/government/schools`);
```