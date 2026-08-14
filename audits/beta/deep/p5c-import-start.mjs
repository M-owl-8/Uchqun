// P5c — the two open questions from P5b: is Start offered for a partially
// valid file, and why did the file input vanish on the second visit?
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW, API } from './lib.mjs';
import path from 'path';
const P = phase('P5'); const B = PORTALS.admin; const TAG = 'admin-tmm3'; const out = {};
const F = (n) => path.resolve('audits/beta/deep/fixtures', n);
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5c', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 620)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/admin\/import/.test(r.url())) return; let b = ''; try { b = (await r.text()).slice(0, 600); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

// state of the import page on a cold visit
await goto(P, p, `${B}/admin/import`, TAG, 'import-cold-visit', { full: true });
rec('cold-visit', { ...(await p.evaluate(DUMP)), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 400) });

// valid file end to end
const fi = p.locator('input[type="file"]');
rec('file-input-present-on-cold-visit', await fi.count());
await fi.first().setInputFiles(F('import-valid.csv'));
await p.waitForTimeout(1500);
since();
await p.locator('button', { hasText: /Tekshirish/ }).first().click();
await p.waitForTimeout(9000);
const validateNet = since();
const afterValidate = await p.evaluate(DUMP);
rec('valid-validate', { net: validateNet, buttons: afterValidate.buttons, shot: await shot(P, p, TAG, 'import-valid-validated', { full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 500) });

// start
const startBtn = p.locator('button').filter({ hasText: /Boshlash|Importni boshlash|Yuklash/i });
const startLabels = await startBtn.evaluateAll((e) => e.map((b) => ({ t: b.innerText.trim(), disabled: b.disabled })));
since();
if (await startBtn.count()) await startBtn.first().click();
await p.waitForTimeout(6000);
const polls = [];
for (let i = 0; i < 5; i++) { await p.waitForTimeout(4000); polls.push((await text(p)).replace(/\n/g, ' | ').slice(-220)); }
rec('valid-start', { startLabels, net: since(), polls: polls.slice(-2), shot: await shot(P, p, TAG, 'import-valid-finished', { full: true }) });

// now a partially valid file, and look hard for a Start action
await goto(P, p, `${B}/admin/import`, TAG, 'import-malformed-second-visit', { full: true });
const fi2 = p.locator('input[type="file"]');
rec('file-input-present-after-a-completed-import', await fi2.count());
if (await fi2.count()) {
  await fi2.first().setInputFiles(F('import-malformed.csv'));
  await p.waitForTimeout(1500);
  since();
  await p.locator('button', { hasText: /Tekshirish/ }).first().click();
  await p.waitForTimeout(9000);
  const d = await p.evaluate(DUMP);
  const allButtons = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => ({ t: (b.innerText || '').trim().slice(0, 30), disabled: b.disabled })));
  rec('malformed-after-validate', { net: since(), buttons: d.buttons, allButtons, shot: await shot(P, p, TAG, 'D-39-import-partial-no-start', { defect: 'D-39', full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 600) });
}

// IDOR against the real backend origin, not the SPA host
const idor = await p.evaluate(async (api) => {
  const r = await fetch(`${api}/admin/import/00000000-0000-0000-0000-000000000000/start`, { method: 'POST', credentials: 'include' });
  return { s: r.status, b: (await r.text()).slice(0, 220) };
}, API);
rec('import-idor-probe', idor);

save(P, 'p5c.json', out); await c.close(); await browser.close(); console.log('P5c DONE');
