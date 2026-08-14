// P6 re-witness harness — headed Chromium, numbered screenshots, verified index.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export const RUN = 'C:/work/Uchqun/audits/beta/rerun-2026-08-14';
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

// seeded accounts (P3) and the pre-existing government accounts
export const PW = 'Uchqun@2026';
export const OLDPW = 'Test@2026';

const CTR = `${RUN}/counter.json`;
function nextN() {
  let n = 0;
  try { n = JSON.parse(fs.readFileSync(CTR, 'utf8')).n; } catch { n = 0; }
  n += 1;
  fs.writeFileSync(CTR, JSON.stringify({ n }));
  return String(n).padStart(3, '0');
}

const EVT = `${LOGS}/events.jsonl`;
export function ev(o) { fs.appendFileSync(EVT, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n'); }

const CONSOLE = `${LOGS}/console.jsonl`;
const NETLOG = `${LOGS}/network.jsonl`;

export async function newBrowser(headless = false) {
  return chromium.launch({ headless, args: ['--window-size=1500,1000'] });
}

export function instrument(page, role) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      fs.appendFileSync(CONSOLE, JSON.stringify({
        t: new Date().toISOString(), role, type: m.type(), url: page.url(), text: m.text().slice(0, 400),
      }) + '\n');
    }
  });
  page.on('pageerror', (e) => {
    fs.appendFileSync(CONSOLE, JSON.stringify({
      t: new Date().toISOString(), role, type: 'pageerror', url: page.url(), text: String(e.message).slice(0, 400),
    }) + '\n');
  });
  page.on('response', async (r) => {
    if (r.status() < 400) return;
    let body = null;
    try { body = (await r.text()).slice(0, 500); } catch { /* consumed */ }
    fs.appendFileSync(NETLOG, JSON.stringify({
      t: new Date().toISOString(), role, status: r.status(), method: r.request().method(),
      api: r.url(), page: page.url(), body,
    }) + '\n');
  });
}

export async function ctx(browser, role) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'uz' });
  const p = await c.newPage();
  instrument(p, role);
  return { c, p };
}

/** Screenshot. `defect` prefixes the filename so a witness is findable by defect id. */
export async function shot(page, role, action, opts = {}) {
  const n = nextN();
  const safe = `${opts.defect ? `${opts.defect}-` : ''}${action}`.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 70);
  const f = `${n}_${role}_${safe}.png`;
  try { await page.screenshot({ path: `${SHOTS}/${f}`, fullPage: !!opts.full }); }
  catch (e) { ev({ kind: 'shot-fail', role, action, err: e.message }); }
  ev({ kind: 'shot', file: f, role, action, defect: opts.defect ?? null, url: page.url() });
  return f;
}

export async function login(page, portal, email, password, roleTag, opts = {}) {
  const base = PORTALS[portal];
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  if (opts.tab) {
    const t = page.locator('button', { hasText: opts.tab });
    if (await t.count()) { await t.first().click(); await page.waitForTimeout(700); }
  }
  if (opts.shotForm) await shot(page, roleTag, 'login-form', opts.shotForm);
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  const pwf = page.locator('input[type="password"]').first();
  await pwf.fill(password);
  const btn = page.locator('button[type="submit"]');
  if (await btn.count()) await btn.first().click(); else await pwf.press('Enter');
  await page.waitForTimeout(7000);
  const ok = !/\/login/.test(page.url());
  ev({ kind: 'login', portal, email, ok, landing: page.url() });
  return { ok, landing: page.url() };
}

export async function goto(page, url, roleTag, action, opts = {}) {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
  catch (e) { ev({ kind: 'nav-fail', role: roleTag, url, err: e.message }); }
  await page.waitForTimeout(opts.wait ?? 4000);
  return shot(page, roleTag, action, opts);
}

export async function text(page) {
  try { return (await page.locator('body').innerText()).replace(/\n{3,}/g, '\n\n'); } catch { return ''; }
}

/** Parent portal privacy gate. Seeded parents have privacyConsentedAt set, so this is usually absent. */
export async function acceptParentConsent(page, roleTag) {
  try {
    const dlg = page.locator('[aria-labelledby="privacy-consent-title"]');
    if (!(await dlg.count())) return 'absent';
    const boxes = dlg.locator('input[type="checkbox"]');
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
    await page.waitForTimeout(300);
    await dlg.locator('button').first().click();
    await page.waitForTimeout(3000);
    return (await dlg.count()) ? 'still-open' : 'accepted';
  } catch (e) { return `error:${e.message}`; }
}

export function save(name, data) {
  fs.writeFileSync(path.join(LOGS, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

/** L3: rebuild the index from files that actually exist, and verify every event row. */
export function writeIndex() {
  const have = new Set(fs.readdirSync(SHOTS).filter((f) => f.endsWith('.png')));
  const rows = [];
  const seen = new Set();
  for (const line of fs.readFileSync(EVT, 'utf8').trim().split('\n')) {
    const e = JSON.parse(line);
    if (e.kind !== 'shot' || !have.has(e.file) || seen.has(e.file)) continue;
    seen.add(e.file);
    rows.push(`| ${e.file} | ${e.defect ?? '—'} | ${e.role} | ${e.action} | ${String(e.url || '').replace(/https:\/\/[^/]+/, '')} |`);
  }
  rows.sort();
  fs.writeFileSync(`${RUN}/screenshot-index.md`,
    '| File | Defect | Role | Action | Path |\n|---|---|---|---|---|\n' + rows.join('\n') + '\n');
  const orphans = [...have].filter((f) => !seen.has(f));
  return { indexed: rows.length, files: have.size, orphans };
}
