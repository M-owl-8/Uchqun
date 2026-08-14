// Shared harness for the 2026-08-14 full-coverage beta run.
// Production Railway environment. Screenshots numbered globally & sequentially.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export const RUN = 'C:/work/Uchqun/audits/beta/fullrun-2026-08-14';
export const SHOTS = `${RUN}/screenshots`;
export const LOGS = `${RUN}/logs`;
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(LOGS, { recursive: true });

export const PORTALS = {
  government: 'https://government-production.up.railway.app',
  admin: 'https://admin-production-536f.up.railway.app',
  teacher: 'https://teacher-production-0647.up.railway.app',
  parent: 'https://teacher-production-0647.up.railway.app',
  reception: 'https://reception-production-ba41.up.railway.app',
};
export const API = 'https://uchqun-production-b484.up.railway.app/api/v1';
export const PW = 'Test@2026';
export const SIMPW = 'SimRun@2026';

const CTR = `${RUN}/counter.json`;
function nextN() {
  let n = 0;
  try { n = JSON.parse(fs.readFileSync(CTR, 'utf8')).n; } catch { n = 0; }
  n += 1;
  fs.writeFileSync(CTR, JSON.stringify({ n }));
  return String(n).padStart(3, '0');
}

const EVT = `${LOGS}/events.jsonl`;
export function ev(obj) {
  fs.appendFileSync(EVT, JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n');
}

const CONSOLE = `${LOGS}/console.jsonl`;
const NETLOG = `${LOGS}/network.jsonl`;

export async function newBrowser(headless = true) {
  return chromium.launch({ headless });
}

/** Attach console + failed-network capture to a page, tagged with role. */
export function instrument(page, role) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      fs.appendFileSync(CONSOLE, JSON.stringify({
        t: new Date().toISOString(), role, type: m.type(),
        url: page.url(), text: m.text().slice(0, 500),
      }) + '\n');
    }
  });
  page.on('pageerror', (e) => {
    fs.appendFileSync(CONSOLE, JSON.stringify({
      t: new Date().toISOString(), role, type: 'pageerror',
      url: page.url(), text: String(e.message).slice(0, 500),
    }) + '\n');
  });
  page.on('response', async (r) => {
    const s = r.status();
    if (s < 400) return;
    let body = null;
    try { body = (await r.text()).slice(0, 600); } catch { /* body already consumed */ }
    fs.appendFileSync(NETLOG, JSON.stringify({
      t: new Date().toISOString(), role, status: s,
      method: r.request().method(), api: r.url(), page: page.url(), body,
    }) + '\n');
  });
}

export async function ctx(browser, role, headless = true) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'uz' });
  const p = await c.newPage();
  instrument(p, role);
  return { c, p };
}

/** Screenshot with sequential global numbering. Returns filename. */
export async function shot(page, role, action, full = false) {
  const n = nextN();
  const safe = action.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60);
  const f = `${n}_${role}_${safe}.png`;
  try {
    await page.screenshot({ path: `${SHOTS}/${f}`, fullPage: full });
  } catch (e) {
    ev({ kind: 'shot-fail', role, action, err: e.message });
  }
  ev({ kind: 'shot', file: f, role, action, url: page.url() });
  return f;
}

/**
 * Log in through the real UI. Each portal's login form is <input type=email/password>
 * + submit button. Returns { ok, landing, shotFile }.
 */
export async function login(page, portal, email, password, roleTag, opts = {}) {
  const base = PORTALS[portal];
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  // teacher app hosts both teacher & parent personas behind tabs
  if (opts.tab) {
    const t = page.locator('button', { hasText: opts.tab });
    if (await t.count()) { await t.first().click(); await page.waitForTimeout(700); }
  }
  await shot(page, roleTag, 'login-form');
  const em = page.locator('input[type="email"], input[name="email"], input[name="login"]').first();
  const pwf = page.locator('input[type="password"]').first();
  await em.fill(email);
  await pwf.fill(password);
  const btn = page.locator('button[type="submit"]');
  if (await btn.count()) {
    await btn.first().click();
  } else {
    // government/admin use DNP <PrimaryButton type="button"> — Enter in the
    // password field is the wired submit path (Login.jsx onKeyDown).
    await pwf.press('Enter');
  }
  await page.waitForTimeout(7000);
  const landing = page.url();
  const ok = !/\/login/.test(landing);
  const f = await shot(page, roleTag, ok ? 'landing' : 'login-FAILED');
  ev({ kind: 'login', portal, email, ok, landing, shot: f });
  return { ok, landing, shot: f };
}

/**
 * Parent portal shows a blocking privacy-consent modal (PrivacyConsentModal.jsx)
 * on every page until accepted. Tick both acks and accept.
 * Returns 'accepted' | 'absent' | 'error:<msg>'.
 */
export async function acceptParentConsent(page, roleTag) {
  try {
    const dlg = page.locator('[aria-labelledby="privacy-consent-title"]');
    if (!(await dlg.count())) { ev({ kind: 'consent', role: roleTag, result: 'absent' }); return 'absent'; }
    await shot(page, roleTag, 'privacy-consent-gate');
    const boxes = dlg.locator('input[type="checkbox"]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    await page.waitForTimeout(400);
    await shot(page, roleTag, 'privacy-consent-both-ticked');
    await dlg.locator('button').first().click();
    await page.waitForTimeout(3000);
    const still = await dlg.count();
    ev({ kind: 'consent', role: roleTag, result: still ? 'still-open' : 'accepted' });
    return still ? 'still-open' : 'accepted';
  } catch (e) {
    ev({ kind: 'consent', role: roleTag, result: 'error', err: e.message });
    return `error:${e.message}`;
  }
}

export async function goto(page, url, roleTag, action, wait = 3500) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    ev({ kind: 'nav-fail', role: roleTag, url, err: e.message });
  }
  await page.waitForTimeout(wait);
  return shot(page, roleTag, action);
}

export async function text(page) {
  try { return (await page.locator('body').innerText()).replace(/\n{3,}/g, '\n\n'); }
  catch { return ''; }
}

export async function logout(page, roleTag) {
  try {
    await page.context().clearCookies();
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ } });
  } catch { /* noop */ }
  ev({ kind: 'logout', role: roleTag });
}

export function save(name, data) {
  fs.writeFileSync(path.join(LOGS, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}
