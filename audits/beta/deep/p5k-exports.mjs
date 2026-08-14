// P5k — exports. The admin portal has none; the CSV exports live in reception
// (ParentManagement) and government (Schools). Download one, open it, check it.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
import fs from 'fs'; import path from 'path';
const P = phase('P5'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5k', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const DL = path.resolve('audits/beta/deep/P5/downloads'); fs.mkdirSync(DL, { recursive: true });
const browser = await newBrowser(true);

// admin: is there any export control anywhere?
{
  const TAG = 'admin-tmm3'; const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);
  const found = {};
  for (const r of ['/admin', '/admin/receptions', '/admin/parents', '/admin/teachers', '/admin/school-ratings', '/admin/activity', '/admin/settings', '/admin/irr']) {
    await goto(P, p, PORTALS.admin + r, TAG, `export-scan${r.replace(/\//g, '-')}`);
    found[r] = await p.evaluate(() => [...document.querySelectorAll('button,a')].filter((e) => e.offsetParent && /export|csv|excel|yuklab ol|eksport/i.test((e.innerText || '') + (e.getAttribute('title') || ''))).map((e) => (e.innerText || e.getAttribute('title')).trim().slice(0, 24)));
  }
  rec('admin-export-scan', found);
  await c.close();
}

// reception: download the parents CSV and open it
{
  const TAG = 'reception-tmm3'; const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);
  await goto(P, p, `${PORTALS.reception}/parents`, TAG, 'reception-parents-for-export', { full: true });
  const ctrls = await p.evaluate(() => [...document.querySelectorAll('button,a')].filter((e) => e.offsetParent && /csv|export|yuklab/i.test((e.innerText || '') + (e.getAttribute('title') || ''))).map((e) => (e.innerText || e.getAttribute('title')).trim().slice(0, 24)));
  rec('reception-export-controls', ctrls);
  let file = null; let err = null;
  try {
    const [dl] = await Promise.all([
      p.waitForEvent('download', { timeout: 25000 }),
      p.evaluate(() => { const b = [...document.querySelectorAll('button,a')].find((e) => e.offsetParent && /csv|export|yuklab/i.test((e.innerText || '') + (e.getAttribute('title') || ''))); if (b) b.click(); }),
    ]);
    file = path.join(DL, dl.suggestedFilename());
    await dl.saveAs(file);
  } catch (e) { err = e.message.split('\n')[0]; }
  let content = null;
  if (file && fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    content = {
      bytes: Buffer.byteLength(raw), lines: lines.length,
      hasBom: raw.charCodeAt(0) === 0xFEFF,
      header: lines[0]?.slice(0, 160),
      firstRow: lines[1]?.slice(0, 160),
      lastRow: lines[lines.length - 1]?.slice(0, 160),
      columnsInHeader: (lines[0] || '').split(',').length,
      ragged: lines.slice(1).filter((l) => (l.match(/,/g) || []).length !== ((lines[0] || '').match(/,/g) || []).length).length,
    };
  }
  rec('reception-csv-export', { err, file: file ? path.basename(file) : null, content, shot: await shot(P, p, TAG, 'reception-export-clicked', { full: true }) });
  await c.close();
}
save(P, 'p5k.json', out); await browser.close(); console.log('P5k DONE');
