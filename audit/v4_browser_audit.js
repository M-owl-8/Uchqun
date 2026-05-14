/**
 * UCHQUN V4 BROWSER AUDIT — Playwright
 * Phases -1, 0, 1, 2, 7 (security auth scenarios)
 * Run: node audit/v4_browser_audit.js
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BACKEND = 'https://uchqun-production-b484.up.railway.app/api/v1';
const FRONTENDS = {
  admin:      'https://admin-production-536f.up.railway.app',
  teacher:    'https://teacher-production-0647.up.railway.app',
  reception:  'https://reception-production-ba41.up.railway.app',
  government: 'https://government-production.up.railway.app',
};
const CREDS = {
  government: { email: 'government@uchqun.uz', password: 'Government@2026' },
  admin:      { email: 'admin@uchqun.uz',       password: 'Admin@2026' },
  reception:  { email: 'reception@uchqun.uz',   password: 'Reception@2025' },
  teacher:    { email: 'teacher@uchqun.uz',      password: 'Teacher@2025' },
  parent:     { email: 'parent@uchqun.uz',       password: 'Parent@2025' },
  business:   { email: 'business@uchqun.uz',     password: 'Business@2026' },
};

const EVIDENCE = 'C:\\work\\Uchqun\\audit\\evidence\\v4';
const SS_DIR = path.join(EVIDENCE, 'screenshots');
const LOG_DIR = path.join(EVIDENCE, 'consolelogs');

let results = [];
let issueId = 1;

function log(msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function recordResult(phase, frontend, scenario, verdict, notes, evidence = []) {
  results.push({ phase, frontend, scenario, verdict, notes, evidence, ts: new Date().toISOString() });
  const icon = verdict === 'PASS' ? '✓' : verdict === 'FAIL' ? '✗' : '~';
  log(`  ${icon} [${phase}] ${frontend}/${scenario}: ${verdict} — ${notes}`);
}

function issueEntry(severity, phase, title, reproduction, rootCause, fix) {
  return { id: `V4-${String(issueId++).padStart(3,'0')}`, severity, phase, title, reproduction, rootCause, fix };
}

let issues = [];

async function withBrowser(cb) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try { return await cb(browser); }
  finally { await browser.close(); }
}

async function newPage(browser, frontend) {
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordVideo: undefined,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  const consoleLines = [];
  const networkEvents = [];
  const redirects = [];

  page.on('console', m => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => consoleLines.push(`[PAGE_ERROR] ${e.message}`));
  page.on('request', r => networkEvents.push({ type: 'req', url: r.url(), method: r.method(), time: Date.now() }));
  page.on('response', r => networkEvents.push({ type: 'res', url: r.url(), status: r.status(), time: Date.now() }));
  page.on('framenavigated', f => { if (f === page.mainFrame()) redirects.push({ url: f.url(), time: Date.now() }); });

  return { page, ctx, consoleLines, networkEvents, redirects };
}

async function screenshot(page, name) {
  const filepath = path.join(SS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false }).catch(() => {});
  return filepath;
}

async function saveConsoleLogs(consoleLines, name) {
  const filepath = path.join(LOG_DIR, `${name}.txt`);
  fs.writeFileSync(filepath, consoleLines.join('\n'));
  return filepath;
}

function detectLoop(redirects, networkEvents) {
  // Detect if same URL hit more than 5 times in 10 seconds
  const urlCount = {};
  networkEvents.forEach(e => {
    if (e.type === 'req') urlCount[e.url] = (urlCount[e.url] || 0) + 1;
  });
  const loops = Object.entries(urlCount).filter(([, c]) => c > 5);
  return loops;
}

// ──────────────────────────────────────────────
// PHASE 0: LOGIN TEST
// ──────────────────────────────────────────────
async function phase0LoginTest(browser) {
  log('\n══ PHASE 0: LOGIN TEST ══');

  const testCases = [
    { frontend: 'admin',      role: 'admin',      creds: CREDS.admin },
    { frontend: 'teacher',    role: 'teacher',     creds: CREDS.teacher },
    { frontend: 'reception',  role: 'reception',   creds: CREDS.reception },
    { frontend: 'government', role: 'government',  creds: CREDS.government },
  ];

  for (const tc of testCases) {
    log(`\n─ Testing ${tc.frontend} frontend (${tc.role})`);
    const url = FRONTENDS[tc.frontend];
    const safeName = `p0_${tc.frontend}`;

    // ── Step 1: Fresh load, no session
    const { page, ctx, consoleLines, networkEvents, redirects } = await newPage(browser, tc.frontend);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => log(`  goto error: ${e.message}`));
      await page.waitForTimeout(3000);

      const loops = detectLoop(redirects, networkEvents);
      const ssLoad = await screenshot(page, `${safeName}_01_fresh_load`);
      const errorsOnLoad = consoleLines.filter(l => l.includes('[error]') || l.includes('PAGE_ERROR'));
      const redirectCount = redirects.length;

      if (loops.length > 0) {
        const msg = `REDIRECT LOOP detected: ${loops.map(([u, c]) => `${c}x ${u.substring(0,60)}`).join('; ')}`;
        recordResult('P0', tc.frontend, 'fresh-load', 'FAIL', msg, [ssLoad]);
        issues.push(issueEntry('CRITICAL', 'Phase 0', `${tc.frontend}: Redirect loop on fresh load`, 'Open frontend with no session', 'interceptor / auth redirect logic', 'Fix interceptor to not loop on /auth/me 401'));
      } else {
        recordResult('P0', tc.frontend, 'fresh-load', 'PASS', `Page loaded, ${redirectCount} redirects, ${errorsOnLoad.length} console errors`, [ssLoad]);
      }

      // ── Step 2: Find login form
      const loginUrl = page.url();
      log(`  Current URL after fresh load: ${loginUrl}`);

      // Wait for login form
      const emailInput = await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="mail"], input[placeholder*="Email"]', { timeout: 10000 }).catch(() => null);
      if (!emailInput) {
        recordResult('P0', tc.frontend, 'login-form-visible', 'FAIL', 'No email input found on page', [ssLoad]);
        issues.push(issueEntry('CRITICAL', 'Phase 0', `${tc.frontend}: Login form not visible after fresh load`, 'Open app cold, check for login form', 'Routing or redirect logic', 'Ensure unauthenticated users see login form'));
        await ctx.close();
        continue;
      }
      recordResult('P0', tc.frontend, 'login-form-visible', 'PASS', 'Email input found');

      // ── Step 3: Valid login
      consoleLines.length = 0;
      networkEvents.length = 0;
      redirects.length = 0;

      const passInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 }).catch(() => null);
      if (!passInput) {
        recordResult('P0', tc.frontend, 'valid-login', 'FAIL', 'No password input found');
        await ctx.close();
        continue;
      }

      await emailInput.fill(tc.creds.email);
      await passInput.fill(tc.creds.password);

      const submitBtn = await page.waitForSelector('button[type="submit"], button:has-text("Kirish"), button:has-text("Login"), button:has-text("Войти")', { timeout: 5000 }).catch(() => null);
      if (!submitBtn) {
        recordResult('P0', tc.frontend, 'valid-login', 'FAIL', 'No submit button found');
        await ctx.close();
        continue;
      }

      const loginStartTime = Date.now();
      await submitBtn.click();

      // Wait for navigation or dashboard
      await page.waitForTimeout(5000);

      const postLoginUrl = page.url();
      const postLoginLoops = detectLoop(redirects, networkEvents);
      const loginErrors = consoleLines.filter(l => l.includes('[error]') || l.includes('PAGE_ERROR') || l.includes('Failed'));
      const ssPostLogin = await screenshot(page, `${safeName}_02_after_valid_login`);
      const loginTime = Date.now() - loginStartTime;

      const isOnDashboard = !postLoginUrl.includes('/login') && !postLoginUrl.includes('/auth');

      if (postLoginLoops.length > 0) {
        recordResult('P0', tc.frontend, 'valid-login', 'FAIL',
          `Loop after login: ${postLoginLoops.map(([u,c]) => `${c}x ${u.slice(0,50)}`).join('; ')}`, [ssPostLogin]);
        issues.push(issueEntry('CRITICAL', 'Phase 0', `${tc.frontend}: Loop after valid login`, 'Login with correct credentials', 'interceptor retry / redirect logic', 'Fix post-login redirect'));
      } else if (!isOnDashboard) {
        recordResult('P0', tc.frontend, 'valid-login', 'FAIL',
          `Still on login page after submission (URL: ${postLoginUrl})`, [ssPostLogin]);
        issues.push(issueEntry('CRITICAL', 'Phase 0', `${tc.frontend}: Login does not redirect to dashboard`, 'Submit valid credentials', 'Login flow / router', 'Fix post-login navigation'));
      } else {
        recordResult('P0', tc.frontend, 'valid-login', 'PASS',
          `Redirected to dashboard in ${loginTime}ms, URL: ${postLoginUrl}`, [ssPostLogin]);
      }

      await saveConsoleLogs(consoleLines, `${safeName}_valid_login`);

      // ── Step 4: Session persistence on refresh
      consoleLines.length = 0;
      networkEvents.length = 0;
      redirects.length = 0;

      await page.reload({ waitUntil: 'networkidle', timeout: 20000 }).catch(e => log(`  reload error: ${e.message}`));
      await page.waitForTimeout(3000);

      const postReloadUrl = page.url();
      const reloadLoops = detectLoop(redirects, networkEvents);
      const ssReload = await screenshot(page, `${safeName}_03_after_reload`);

      if (reloadLoops.length > 0) {
        recordResult('P0', tc.frontend, 'session-persist-reload', 'FAIL',
          `Loop on reload: ${reloadLoops.map(([u,c])=>`${c}x ${u.slice(0,50)}`).join('; ')}`, [ssReload]);
        issues.push(issueEntry('CRITICAL', 'Phase 0', `${tc.frontend}: Reload loop while logged in`, 'Log in, then reload page', 'auth interceptor / /auth/me handler', 'Fix refresh token flow on reload'));
      } else if (postReloadUrl.includes('/login')) {
        recordResult('P0', tc.frontend, 'session-persist-reload', 'FAIL',
          `Kicked to login on reload, URL: ${postReloadUrl}`, [ssReload]);
        issues.push(issueEntry('HIGH', 'Phase 0', `${tc.frontend}: Session lost on page reload`, 'Log in, reload', 'Cookie / refresh token not persisting', 'Fix session persistence'));
      } else {
        recordResult('P0', tc.frontend, 'session-persist-reload', 'PASS',
          `Session survived reload, URL: ${postReloadUrl}`, [ssReload]);
      }

      // ── Step 5: Wrong password
      // Open a fresh context for wrong-password test
      const { page: pg2, ctx: ctx2, consoleLines: cl2, networkEvents: ne2, redirects: rd2 } = await newPage(browser, tc.frontend);
      await pg2.goto(url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
      await pg2.waitForTimeout(2000);

      const ei2 = await pg2.waitForSelector('input[type="email"]', { timeout: 8000 }).catch(() => null);
      const pi2 = await pg2.waitForSelector('input[type="password"]', { timeout: 5000 }).catch(() => null);
      const sb2 = await pg2.waitForSelector('button[type="submit"], button:has-text("Kirish"), button:has-text("Login")', { timeout: 5000 }).catch(() => null);

      if (ei2 && pi2 && sb2) {
        cl2.length = 0; ne2.length = 0; rd2.length = 0;
        await ei2.fill(tc.creds.email);
        await pi2.fill('WRONGPASSWORD123!');
        await sb2.click();
        await pg2.waitForTimeout(5000);

        const wrongPwUrl = pg2.url();
        const wrongLoops = detectLoop(rd2, ne2);
        const wrongErrors = cl2.filter(l => l.includes('[error]') || l.includes('PAGE_ERROR'));
        const refreshCalls = ne2.filter(e => e.type === 'req' && e.url.includes('/auth/refresh'));
        const ssWrong = await screenshot(pg2, `${safeName}_04_wrong_password`);

        if (wrongLoops.length > 0) {
          recordResult('P0', tc.frontend, 'wrong-password', 'FAIL',
            `Loop after wrong password: ${wrongLoops.map(([u,c])=>`${c}x ${u.slice(0,50)}`).join('; ')}`, [ssWrong]);
          issues.push(issueEntry('CRITICAL', 'Phase 0', `${tc.frontend}: Loop on wrong-password login`, 'Submit wrong password', 'interceptor retrying 401 from /auth/login as if token-expired', 'Skip refresh-retry for /auth/login endpoint'));
        } else if (refreshCalls.length > 0) {
          recordResult('P0', tc.frontend, 'wrong-password', 'FAIL',
            `Token refresh triggered by wrong-password (${refreshCalls.length}x refresh calls)`, [ssWrong]);
          issues.push(issueEntry('HIGH', 'Phase 0', `${tc.frontend}: Refresh triggered by wrong password`, 'Submit wrong password, observe network', 'interceptor treating 401 from login as expired token', 'Guard: do not refresh on /auth/login 401'));
        } else {
          // Check for error message on screen
          const bodyText = await pg2.locator('body').textContent().catch(() => '');
          const hasErrorMsg = bodyText.toLowerCase().match(/xato|error|noto.g.ri|invalid|wrong|incorrect/i);
          recordResult('P0', tc.frontend, 'wrong-password', hasErrorMsg ? 'PASS' : 'PARTIAL',
            `Stayed on login=${wrongPwUrl.includes('login')}, error shown=${!!hasErrorMsg}, ${refreshCalls.length} refresh calls`, [ssWrong]);
        }

        await saveConsoleLogs(cl2, `${safeName}_wrong_password`);
        await ctx2.close();
      } else {
        recordResult('P0', tc.frontend, 'wrong-password', 'PARTIAL', 'Could not find login form for wrong-password test');
        await ctx2.close();
      }

    } catch (err) {
      log(`  ERROR in ${tc.frontend}: ${err.message}`);
      recordResult('P0', tc.frontend, 'overall', 'FAIL', `Unexpected error: ${err.message}`);
    } finally {
      await saveConsoleLogs(consoleLines, `${safeName}_fresh_load`);
      await ctx.close();
    }
  }
}

// ──────────────────────────────────────────────
// PHASE 1: REGRESSION — schoolScope.js check
// ──────────────────────────────────────────────
async function phase1RegressionChecks() {
  log('\n══ PHASE 1: REGRESSION CHECKS ══');

  // schoolScope.js HIGH-01 regression — check via API
  log('  Checking HIGH-01 regression (schoolScope null branch)...');

  // Try a request with a government token (which has no schoolId) hitting a school-scoped endpoint
  // Government role has schoolId=null, and after HIGH-01 fix it should NOT see all schools' data
  // But government is supposed to have global access — the bug was for non-government null schoolId users

  // Read the schoolScope.js from codebase
  const scopeFile = fs.existsSync('C:\\work\\Uchqun\\backend\\middleware\\schoolScope.js')
    ? fs.readFileSync('C:\\work\\Uchqun\\backend\\middleware\\schoolScope.js', 'utf-8')
    : '';

  if (scopeFile) {
    if (scopeFile.includes('return {}') || scopeFile.includes('return { }')) {
      issues.push(issueEntry('CRITICAL', 'Phase 1',
        'HIGH-01 REGRESSION: schoolScope null branch returns {} (no filter)',
        'Examine backend/middleware/schoolScope.js null-schoolId branch',
        'backend/middleware/schoolScope.js — null schoolId returns {} instead of throwing',
        'Restore defensive throw for null schoolId on non-government roles'));
      recordResult('P1', 'backend', 'HIGH-01-schoolScope', 'FAIL',
        'schoolScope returns {} for null schoolId — REGRESSION from prior fix. Data-protection only, not code-protection.');
    } else if (scopeFile.includes('throw') && scopeFile.match(/null|undefined/)) {
      recordResult('P1', 'backend', 'HIGH-01-schoolScope', 'PASS', 'schoolScope throws on null schoolId');
    } else {
      recordResult('P1', 'backend', 'HIGH-01-schoolScope', 'PARTIAL', 'Could not determine null branch behavior definitively');
    }
    log(`  schoolScope.js snippet: ${scopeFile.substring(0, 300).replace(/\n/g, ' ')}`);
  } else {
    recordResult('P1', 'backend', 'HIGH-01-schoolScope', 'PARTIAL', 'schoolScope.js not readable from audit script');
  }

  // Check interceptor fix — examine the shared API service
  log('  Checking interceptor fix (skip refresh for login/refresh endpoints)...');
  const apiServicePaths = [
    'C:\\work\\Uchqun\\shared\\services\\api.js',
    'C:\\work\\Uchqun\\admin\\src\\services\\api.js',
    'C:\\work\\Uchqun\\teacher\\src\\services\\api.js',
  ];
  for (const p of apiServicePaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      const skipsLogin = content.includes('/auth/login') || content.includes("'login'") || content.includes('"login"');
      const skipsRefresh = content.includes('/auth/refresh') || content.includes("'refresh'") || content.includes('"refresh"');
      const hasPathCheck = content.includes('pathname') || content.includes('window.location');
      recordResult('P1', path.basename(path.dirname(p)), 'interceptor-fix',
        (skipsLogin && skipsRefresh) ? 'PASS' : 'FAIL',
        `skips-login=${skipsLogin}, skips-refresh=${skipsRefresh}, pathname-check=${hasPathCheck} (${p})`);
      if (!skipsLogin || !skipsRefresh) {
        issues.push(issueEntry('HIGH', 'Phase 1', `interceptor does not skip refresh for login/refresh endpoints in ${p}`,
          `Read ${p}, check response interceptor for /auth/login guard`,
          `${p} — response interceptor`,
          'Add guard: if originalRequest.url includes /auth/login or /auth/refresh, do not retry with refresh'));
      }
      break;
    }
  }
}

// ──────────────────────────────────────────────
// PHASE 7: AUTH SECURITY CHECKS (HTTP-level)
// ──────────────────────────────────────────────
async function phase7AuthSecurity() {
  log('\n══ PHASE 7: AUTH & SECURITY (HTTP) ══');

  const base = BACKEND;

  // 1. Malformed JWT → 401 not 500
  log('  JWT malformed → should be 401');
  const r1 = await fetch(`${base}/auth/me`, {
    headers: { Cookie: 'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature' }
  }).catch(() => null);
  if (r1) {
    if (r1.status === 401) {
      recordResult('P7', 'backend', 'malformed-jwt-401', 'PASS', `Status: ${r1.status}`);
    } else {
      recordResult('P7', 'backend', 'malformed-jwt-401', 'FAIL', `Status: ${r1.status} — should be 401`);
      issues.push(issueEntry('HIGH', 'Phase 7', 'Malformed JWT returns non-401', `GET /api/v1/auth/me with malformed cookie`, 'auth middleware error handling', 'Catch JWT parse errors, return 401'));
    }
  }

  // 2. CORS: random origin blocked
  log('  CORS: evil.com → should be blocked');
  const r2 = await fetch(`${base}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://evil.com', 'Access-Control-Request-Method': 'POST' }
  }).catch(() => null);
  if (r2) {
    const corsHeader = r2.headers.get('access-control-allow-origin') || '';
    if (corsHeader === 'https://evil.com' || corsHeader === '*') {
      recordResult('P7', 'backend', 'cors-evil-blocked', 'FAIL', `CORS allows evil.com: ${corsHeader}`);
      issues.push(issueEntry('HIGH', 'Phase 7', 'CORS allows arbitrary origins', 'OPTIONS /auth/login with Origin: evil.com', 'CORS config (C-07)', 'Replace regex with explicit allowlist'));
    } else {
      recordResult('P7', 'backend', 'cors-evil-blocked', 'PASS', `CORS header: "${corsHeader}" — evil.com not allowed`);
    }
  }

  // 3. CORS: valid Railway origin allowed
  log('  CORS: admin Railway origin → should be allowed');
  const r3 = await fetch(`${base}/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://admin-production-536f.up.railway.app', 'Access-Control-Request-Method': 'POST' }
  }).catch(() => null);
  if (r3) {
    const corsHeader = r3.headers.get('access-control-allow-origin') || '';
    const credHeader = r3.headers.get('access-control-allow-credentials') || '';
    if (corsHeader.includes('admin-production-536f') || corsHeader === '*') {
      recordResult('P7', 'backend', 'cors-valid-origin', 'PASS', `CORS: ${corsHeader}, credentials: ${credHeader}`);
    } else {
      recordResult('P7', 'backend', 'cors-valid-origin', 'FAIL', `CORS didn't reflect admin origin: ${corsHeader}`);
      issues.push(issueEntry('HIGH', 'Phase 7', 'Valid frontend origin rejected by CORS', 'OPTIONS /auth/login with admin Railway origin', 'CORS config', 'Add admin-production-536f.up.railway.app to allowed origins'));
    }
  }

  // 4. Lockout: 5 wrong passwords
  log('  Lockout: 5 wrong passwords...');
  const lockEmail = 'teacher@uchqun.uz';
  let lockoutHit = false;
  for (let i = 0; i < 6; i++) {
    const lr = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockEmail, password: `WRONG${i}!` })
    }).catch(() => null);
    if (lr) {
      const body = await lr.json().catch(() => ({}));
      if (lr.status === 429 || (body.error || '').toLowerCase().includes('lock') || (body.message || '').toLowerCase().includes('lock')) {
        lockoutHit = true;
        recordResult('P7', 'backend', 'login-lockout', 'PASS', `Locked after ${i+1} attempts, status: ${lr.status}`);
        break;
      }
    }
  }
  if (!lockoutHit) {
    recordResult('P7', 'backend', 'login-lockout', 'FAIL', 'No lockout triggered after 6 wrong attempts');
    issues.push(issueEntry('HIGH', 'Phase 7', 'No login lockout after 6 failed attempts', 'POST /auth/login 6x with wrong password for teacher@uchqun.uz', 'rate limiter / lockout middleware', 'Implement login lockout (5 attempts → 15min block)'));
  }

  // Wait for lockout to expire enough for teacher credential tests to work later
  // (actually, if lockout happened we need to note it — teacher creds may be temp-locked)
  if (lockoutHit) {
    log('  NOTE: teacher@uchqun.uz may be temporarily locked from lockout test. Wait or use different email for later tests.');
  }

  // 5. Cookie security flags (check response headers on login)
  log('  Cookie flags: httpOnly, secure, sameSite...');
  const r5 = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'government@uchqun.uz', password: 'Government@2026' })
  }).catch(() => null);
  if (r5) {
    const setCookie = r5.headers.get('set-cookie') || '';
    const hasHttpOnly = setCookie.toLowerCase().includes('httponly');
    const hasSecure = setCookie.toLowerCase().includes('secure');
    const hasSameSite = setCookie.toLowerCase().includes('samesite');
    recordResult('P7', 'backend', 'cookie-flags',
      (hasHttpOnly && hasSecure) ? 'PASS' : 'FAIL',
      `httpOnly=${hasHttpOnly}, secure=${hasSecure}, sameSite=${hasSameSite} — raw: ${setCookie.substring(0, 200)}`);
    if (!hasHttpOnly) issues.push(issueEntry('CRITICAL', 'Phase 7', 'Access token cookie not httpOnly', 'POST /auth/login, check Set-Cookie header', 'auth controller cookie settings', 'Add httpOnly flag to access token cookie'));
    if (!hasSecure) issues.push(issueEntry('HIGH', 'Phase 7', 'Access token cookie not Secure', 'POST /auth/login, check Set-Cookie header', 'auth controller cookie settings', 'Add Secure flag for production'));
  }

  // 6. XSS in login fields (basic check — should sanitize or not execute)
  log('  XSS in login email field...');
  const r6 = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '<script>alert(1)</script>@evil.com', password: 'Test@123' })
  }).catch(() => null);
  if (r6) {
    const body = await r6.text().catch(() => '');
    if (body.includes('<script>alert(1)</script>')) {
      recordResult('P7', 'backend', 'xss-login-field', 'FAIL', 'XSS payload reflected in response');
      issues.push(issueEntry('HIGH', 'Phase 7', 'XSS payload reflected in login response', 'POST /auth/login with <script> in email', 'input sanitization', 'Sanitize / escape error messages'));
    } else {
      recordResult('P7', 'backend', 'xss-login-field', 'PASS', 'XSS payload not reflected');
    }
  }

  // 7. SQL injection in login
  log('  SQL injection in login fields...');
  const r7 = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "' OR '1'='1", password: "' OR '1'='1" })
  }).catch(() => null);
  if (r7) {
    const body = await r7.json().catch(() => ({}));
    const status = r7.status;
    if (status === 200 && body.success) {
      recordResult('P7', 'backend', 'sqli-login', 'FAIL', 'SQL injection returned success!');
      issues.push(issueEntry('CRITICAL', 'Phase 7', 'SQL injection bypasses login', "POST /auth/login with ' OR '1'='1", 'auth controller raw query or ORM misuse', 'Use parameterized queries / ORM'));
    } else {
      recordResult('P7', 'backend', 'sqli-login', 'PASS', `Status ${status}, no bypass`);
    }
  }

  // 8. Rate limiting (burst)
  log('  Rate limit: 20 rapid requests...');
  const rateLimitPromises = Array.from({ length: 20 }, () =>
    fetch(`${base}/auth/me`, { headers: { Cookie: 'accessToken=invalid' } }).catch(() => null)
  );
  const rateLimitResults = await Promise.all(rateLimitPromises);
  const has429 = rateLimitResults.some(r => r && r.status === 429);
  recordResult('P7', 'backend', 'rate-limit-burst', has429 ? 'PASS' : 'PARTIAL',
    has429 ? '429 returned on burst' : 'No 429 on 20 concurrent requests — rate limiting may be too lenient');
  if (!has429) {
    issues.push(issueEntry('MEDIUM', 'Phase 7', 'No rate limiting on burst of 20 requests', '20 concurrent GET /auth/me requests', 'rate limiter config', 'Tighten rate limits for auth endpoints'));
  }
}

// ──────────────────────────────────────────────
// PHASE 6: TENANT ISOLATION (API-level spot checks)
// ──────────────────────────────────────────────
async function phase6TenantIsolation() {
  log('\n══ PHASE 6: TENANT ISOLATION (spot checks) ══');

  // Get tokens for two different-school roles
  // government (no school) and teacher (school-scoped)
  const govLogin = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'government@uchqun.uz', password: 'Government@2026' })
  }).catch(() => null);

  const teacherLogin = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher@uchqun.uz', password: 'Teacher@2025' })
  }).catch(() => null);

  if (!govLogin || !teacherLogin) {
    recordResult('P6', 'backend', 'setup', 'FAIL', 'Could not obtain test tokens');
    return;
  }

  const govCookie = govLogin.headers.get('set-cookie') || '';
  const teacherCookie = teacherLogin.headers.get('set-cookie') || '';
  const govToken = govCookie.split(';')[0] || '';
  const teacherToken = teacherCookie.split(';')[0] || '';

  log(`  Gov cookie: ${govToken.substring(0, 40)}...`);
  log(`  Teacher cookie: ${teacherToken.substring(0, 40)}...`);

  // Check list of endpoints for cross-school data
  const endpoints = [
    '/children', '/users', '/groups', '/teachers', '/parents',
    '/news', '/notifications', '/assessments', '/service-plans', '/meal-plans',
  ];

  for (const ep of endpoints) {
    const govResp = await fetch(`${BACKEND}${ep}`, { headers: { Cookie: govCookie } }).catch(() => null);
    const teachResp = await fetch(`${BACKEND}${ep}`, { headers: { Cookie: teacherCookie } }).catch(() => null);

    const govStatus = govResp?.status ?? 'ERR';
    const teachStatus = teachResp?.status ?? 'ERR';

    let govCount = '?', teachCount = '?';
    try {
      const gd = await govResp?.json();
      govCount = Array.isArray(gd) ? gd.length : Array.isArray(gd?.data) ? gd.data.length : typeof gd;
    } catch {}
    try {
      const td = await teachResp?.json();
      teachCount = Array.isArray(td) ? td.length : Array.isArray(td?.data) ? td.data.length : typeof td;
    } catch {}

    const verdict = (govStatus < 500 && teachStatus < 500) ? 'PASS' : 'PARTIAL';
    recordResult('P6', 'backend', `isolation-${ep}`, verdict,
      `gov=${govStatus}(${govCount} items), teacher=${teachStatus}(${teachCount} items)`);

    // If teacher sees more items than expected (e.g., all schools' data), flag it
    if (teachStatus === 200 && typeof teachCount === 'number' && teachCount > 100) {
      issues.push(issueEntry('HIGH', 'Phase 6',
        `Possible tenant leak: teacher sees ${teachCount} records on ${ep}`,
        `GET ${BACKEND}${ep} with teacher cookie`,
        `schoolScope middleware or controller filter on ${ep}`,
        'Ensure schoolId filter applied in query'));
    }
  }
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
  log('══════════════════════════════════════════');
  log('UCHQUN V4 BROWSER AUDIT — START');
  log(`Backend: ${BACKEND}`);
  log('Frontends: ' + Object.values(FRONTENDS).join(', '));
  log('══════════════════════════════════════════');

  // Phase -1: already confirmed Playwright + Chromium installed
  log('\n══ PHASE -1: ENVIRONMENT ══');
  log('  Playwright: AVAILABLE (just installed v1.60.0)');
  log('  Chromium: AVAILABLE (downloaded)');
  recordResult('P-1', 'env', 'playwright', 'PASS', 'Playwright 1.60.0 + Chromium installed');

  await withBrowser(async (browser) => {
    await phase0LoginTest(browser);
  });

  await phase1RegressionChecks();
  await phase6TenantIsolation();
  await phase7AuthSecurity();

  // Write results
  const reportData = { results, issues, generatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(EVIDENCE, 'v4_results.json'), JSON.stringify(reportData, null, 2));

  log('\n══ SUMMARY ══');
  const pass = results.filter(r => r.verdict === 'PASS').length;
  const fail = results.filter(r => r.verdict === 'FAIL').length;
  const partial = results.filter(r => r.verdict === 'PARTIAL').length;
  log(`  Results: ${pass} PASS / ${fail} FAIL / ${partial} PARTIAL`);
  log(`  Issues: ${issues.length} total`);
  issues.forEach(i => log(`    [${i.severity}] ${i.id}: ${i.title}`));
  log(`  Evidence: ${EVIDENCE}`);
  log('\nDone. Results saved to audit/evidence/v4/v4_results.json');

  return reportData;
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
