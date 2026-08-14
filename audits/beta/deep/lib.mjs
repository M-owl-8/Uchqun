// Shared harness for the deep hardening campaign (P2–P7).
// One screenshot directory per phase; a machine-generated index per phase.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

export const ROOT = 'C:/work/Uchqun/audits/beta/deep';

export const PORTALS = {
  government: 'https://government-production.up.railway.app',
  admin: 'https://admin-production-536f.up.railway.app',
  teacher: 'https://teacher-production-0647.up.railway.app',
  parent: 'https://teacher-production-0647.up.railway.app',
  reception: 'https://reception-production-ba41.up.railway.app',
};
export const API = 'https://uchqun-production-b484.up.railway.app/api/v1';

export const PW = 'Uchqun@2026';   // seeded accounts
export const OLDPW = 'Test@2026';  // pre-existing government accounts

export const DESKTOP = { width: 1440, height: 950 };
export const MOBILE = { width: 390, height: 844 };

export function phase(name) {
  const dir = `${ROOT}/${name}`;
  const shots = `${dir}/screenshots`;
  const logs = `${dir}/logs`;
  fs.mkdirSync(shots, { recursive: true });
  fs.mkdirSync(logs, { recursive: true });
  return { name, dir, shots, logs };
}

function nextN(P) {
  const f = `${P.dir}/counter.json`;
  let n = 0;
  try { n = JSON.parse(fs.readFileSync(f, 'utf8')).n; } catch { n = 0; }
  n += 1;
  fs.writeFileSync(f, JSON.stringify({ n }));
  return String(n).padStart(3, '0');
}

export function ev(P, o) {
  fs.appendFileSync(`${P.logs}/events.jsonl`, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');
}

export function instrument(P, page, role) {
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    fs.appendFileSync(`${P.logs}/console.jsonl`, JSON.stringify({
      t: new Date().toISOString(), role, type: m.type(), url: page.url(), text: m.text().slice(0, 400),
    }) + '\n');
  });
  page.on('pageerror', (e) => {
    fs.appendFileSync(`${P.logs}/console.jsonl`, JSON.stringify({
      t: new Date().toISOString(), role, type: 'pageerror', url: page.url(), text: String(e.message).slice(0, 400),
    }) + '\n');
  });
  page.on('response', async (r) => {
    if (r.status() < 400) return;
    let body = null;
    try { body = (await r.text()).slice(0, 500); } catch { /* consumed */ }
    fs.appendFileSync(`${P.logs}/network.jsonl`, JSON.stringify({
      t: new Date().toISOString(), role, status: r.status(), method: r.request().method(),
      api: r.url(), page: page.url(), body,
    }) + '\n');
  });
}

export async function newBrowser(headless = true) {
  return chromium.launch({ headless });
}

export async function ctx(P, browser, role, viewport = DESKTOP) {
  const c = await browser.newContext({ viewport, locale: 'uz' });
  const p = await c.newPage();
  instrument(P, p, role);
  return { c, p };
}

export async function shot(P, page, role, action, opts = {}) {
  const n = nextN(P);
  const tag = [opts.defect, opts.vp === 'mobile' ? 'mobile' : null, action].filter(Boolean).join('-');
  const safe = tag.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 74);
  const f = `${n}_${role}_${safe}.png`;
  try { await page.screenshot({ path: `${P.shots}/${f}`, fullPage: !!opts.full }); }
  catch (e) { ev(P, { kind: 'shot-fail', role, action, err: e.message }); }
  ev(P, { kind: 'shot', file: f, role, action, defect: opts.defect ?? null, vp: opts.vp ?? 'desktop', url: page.url() });
  return f;
}

export async function login(P, page, portal, email, password, role, opts = {}) {
  await page.goto(`${PORTALS[portal]}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  if (opts.tab) {
    const t = page.locator('button', { hasText: opts.tab });
    if (await t.count()) { await t.first().click(); await page.waitForTimeout(700); }
  }
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  const pwf = page.locator('input[type="password"]').first();
  await pwf.fill(password);
  const btn = page.locator('button[type="submit"]');
  if (await btn.count()) await btn.first().click(); else await pwf.press('Enter');
  await page.waitForTimeout(opts.wait ?? 7000);
  const ok = !/\/login/.test(page.url());
  ev(P, { kind: 'login', portal, email, role, ok, landing: page.url() });
  return { ok, landing: page.url() };
}

export async function goto(P, page, url, role, action, opts = {}) {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
  catch (e) { ev(P, { kind: 'nav-fail', role, url, err: e.message }); }
  await page.waitForTimeout(opts.wait ?? 4000);
  return shot(P, page, role, action, opts);
}

export async function text(page) {
  try { return (await page.locator('body').innerText()).replace(/\n{3,}/g, '\n\n'); } catch { return ''; }
}

/** Dump every visible interactive control on the current screen. */
export const DUMP = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const lab = (e) => (e.getAttribute('aria-label') || e.placeholder || (e.innerText || '').trim() || e.getAttribute('title') || e.type || '').replace(/\s+/g, ' ').slice(0, 48);
  return {
    buttons: [...document.querySelectorAll('button')].filter(vis).map(lab),
    links: [...document.querySelectorAll('a[href]')].filter(vis).map((a) => a.getAttribute('href')),
    inputs: [...document.querySelectorAll('input,select,textarea')].filter(vis).map((e) => `${e.tagName}:${e.type || ''}:${lab(e)}`),
    tabs: [...document.querySelectorAll('[role=tab]')].filter(vis).map(lab),
  };
};

export async function acceptParentConsent(P, page, role) {
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

export function save(P, name, data) {
  fs.writeFileSync(path.join(P.logs, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

/** L4: index built from the event log, cross-checked against the filesystem. */
export function writeIndex(P) {
  const have = new Set(fs.readdirSync(P.shots).filter((f) => f.endsWith('.png')));
  const rows = []; const seen = new Set();
  for (const line of fs.readFileSync(`${P.logs}/events.jsonl`, 'utf8').trim().split('\n')) {
    const e = JSON.parse(line);
    if (e.kind !== 'shot' || !have.has(e.file) || seen.has(e.file)) continue;
    seen.add(e.file);
    rows.push(`| ${e.file} | ${e.defect ?? '—'} | ${e.vp ?? 'desktop'} | ${e.role} | ${e.action} | ${String(e.url || '').replace(/https:\/\/[^/]+/, '')} |`);
  }
  rows.sort();
  fs.writeFileSync(`${P.dir}/screenshot-index.md`,
    '| File | Defect | Viewport | Role | Action | Path |\n|---|---|---|---|---|---|\n' + rows.join('\n') + '\n');
  return { indexed: rows.length, files: have.size, orphans: [...have].filter((f) => !seen.has(f)) };
}
