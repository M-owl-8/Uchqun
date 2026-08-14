import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
import fs from 'fs'; import path from 'path';
const P = phase('P5'); const TAG = 'reception-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5l', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 620)); };
const DL = path.resolve('audits/beta/deep/P5/downloads'); fs.mkdirSync(DL, { recursive: true });
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);
await goto(P, p, `${PORTALS.reception}/reception/parents`, TAG, 'reception-parents', { full: true });
const boxes = await p.locator('input[type="checkbox"]').count();
rec('checkboxes', boxes);
const picked = await p.evaluate(() => { const cb = [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.offsetParent); cb.slice(1, 4).forEach((e) => { if (!e.checked) e.click(); }); return cb.length; });
await p.waitForTimeout(2000);
const bar = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 20));
rec('bulk-bar', { picked, buttons: bar, shot: await shot(P, p, TAG, 'reception-rows-selected', { full: true }) });
let file = null, err = null;
try {
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 25000 }),
    p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /CSV|Eksport|Yuklab/i.test(e.innerText || '')); if (b) b.click(); }),
  ]);
  file = path.join(DL, dl.suggestedFilename());
  await dl.saveAs(file);
} catch (e) { err = e.message.split('\n')[0]; }
let content = null;
if (file && fs.existsSync(file)) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const cols = (l) => (l.match(/","/g) || []).length + 1;
  content = { bytes: Buffer.byteLength(raw), lines: lines.length, hasBom: raw.charCodeAt(0) === 0xFEFF,
    header: lines[0], rows: lines.slice(1).map((l) => l.slice(0, 120)),
    headerCols: cols(lines[0]), ragged: lines.slice(1).filter((l) => cols(l) !== cols(lines[0])).length };
}
rec('csv', { err, file: file ? path.basename(file) : null, content, shot: await shot(P, p, TAG, 'reception-export-done', { full: true }) });
save(P, 'p5l.json', out); await c.close(); await browser.close(); console.log('P5l DONE');
