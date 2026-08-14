// P5j — does restore preserve account state? Delete/restore an account whose
// pre-state is fully active, and compare field by field.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, text, PORTALS, PW, API } from './lib.mjs';
const P = phase('P5'); const B = PORTALS.admin; const TAG = 'admin-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5j', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const TARGET = 'qabul2@tmm3.uz';
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 400); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

const fetchState = () => p.evaluate(async ([api, email]) => {
  const r = await fetch(`${api}/admin/receptions`, { credentials: 'include' });
  const j = await r.json();
  const list = j.data || j;
  const u = (Array.isArray(list) ? list : list.receptions || []).find((x) => x.email === email);
  return u ? { id: u.id, email: u.email, isActive: u.isActive, isVerified: u.isVerified, documentsApproved: u.documentsApproved, status: u.status } : null;
}, [API, TARGET]);

await goto(P, p, `${B}/admin/receptions`, TAG, 'restore-fidelity-before', { full: true });
const before = await fetchState();
rec('before', { state: before, shot: await shot(P, p, TAG, 'restore-fidelity-before', { full: true }) });
if (!before) { rec('abort', 'target not found'); await c.close(); await browser.close(); process.exit(0); }

// delete the specific row for this email
since();
const clicked = await p.evaluate((email) => {
  const row = [...document.querySelectorAll('tr,li,div')].find((e) => e.offsetParent && (e.innerText || '').includes(email) && e.querySelector('button[title]'));
  if (!row) return null;
  const b = [...row.querySelectorAll('button[title]')].find((x) => /chirish/i.test(x.getAttribute('title') || ''));
  if (!b) return null; b.click(); return b.getAttribute('title');
}, TARGET);
await p.waitForTimeout(3000);
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Tasdiqlash|Ha)$/i.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
await p.waitForTimeout(5500);
rec('deleted', { clicked, net: since(), shot: await shot(P, p, TAG, 'restore-fidelity-deleted', { full: true }) });

await goto(P, p, `${B}/admin/trash`, TAG, 'restore-fidelity-trash', { full: true });
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Qabulxona/.test(x.innerText)); if (b) b.click(); });
await p.waitForTimeout(4000);
const listed = (await text(p)).includes(TARGET);
since();
await p.evaluate((email) => {
  const row = [...document.querySelectorAll('tr,li,div')].find((e) => e.offsetParent && (e.innerText || '').includes(email) && [...e.querySelectorAll('button')].some((b) => /Tikla/i.test(b.innerText)));
  const b = row ? [...row.querySelectorAll('button')].find((x) => /Tikla/i.test(x.innerText)) : [...document.querySelectorAll('button')].find((x) => /Tikla/i.test(x.innerText));
  if (b) b.click();
}, TARGET);
await p.waitForTimeout(3000);
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Tasdiqlash|Ha|Tiklash)$/i.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
await p.waitForTimeout(6000);
rec('restored', { listedInTrash: listed, net: since(), shot: await shot(P, p, TAG, 'restore-fidelity-restored', { full: true }) });

await goto(P, p, `${B}/admin/receptions`, TAG, 'restore-fidelity-after', { full: true });
const after = await fetchState();
const same = before && after && ['isActive', 'isVerified', 'documentsApproved', 'status'].every((k) => before[k] === after[k]);
rec('comparison', { before, after, identical: same, changed: before && after ? ['isActive', 'isVerified', 'documentsApproved', 'status'].filter((k) => before[k] !== after[k]) : null, shot: await shot(P, p, TAG, 'restore-fidelity-after', { full: true }) });
save(P, 'p5j.json', out); await c.close(); await browser.close(); console.log('P5j DONE');
