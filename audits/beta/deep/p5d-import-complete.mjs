// P5d — complete the import wizard with the real action label, on both a fully
// valid file and a partially valid one.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
import path from 'path';
const P = phase('P5'); const B = PORTALS.admin; const TAG = 'admin-tmm3'; const out = {};
const F = (n) => path.resolve('audits/beta/deep/fixtures', n);
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5d', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 560)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/admin\/import/.test(r.url())) return; let b = ''; try { b = (await r.text()).slice(0, 500); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

async function run(file, label) {
  await goto(P, p, `${B}/admin/import`, TAG, `wiz-${label}-step1`, { full: true });
  // if the wizard is mid-flow, walk back to step 1
  for (let i = 0; i < 5; i++) {
    if (await p.locator('input[type="file"]').count()) break;
    const back = p.locator('button', { hasText: /^Orqaga$/ });
    if (!(await back.count())) break;
    await back.first().click(); await p.waitForTimeout(1800);
  }
  const hasInput = await p.locator('input[type="file"]').count();
  if (!hasInput) return { error: 'could not return to step 1', shot: await shot(P, p, TAG, `wiz-${label}-stuck`, { full: true }) };
  await p.locator('input[type="file"]').first().setInputFiles(F(file));
  await p.waitForTimeout(1500);
  since();
  await p.locator('button', { hasText: /Tekshirish/ }).first().click();
  await p.waitForTimeout(9000);
  const validateNet = since();
  const step2 = await shot(P, p, TAG, `wiz-${label}-validated`, { full: true });
  const btns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => ({ t: (b.innerText || '').trim().slice(0, 34), disabled: b.disabled })));
  const cont = p.locator('button', { hasText: /davom etish/i });
  const contCount = await cont.count();
  since();
  if (contCount) { await cont.first().click(); await p.waitForTimeout(5000); }
  const step3 = await shot(P, p, TAG, `wiz-${label}-started`, { full: true });
  const polls = [];
  for (let i = 0; i < 7; i++) { await p.waitForTimeout(4000); polls.push((await text(p)).replace(/\n/g, ' | ').slice(-260)); }
  return { validateNet, buttons: btns, continueOffered: contCount, step2, startNet: since(), step3, lastPoll: polls[polls.length - 1], final: await shot(P, p, TAG, `wiz-${label}-final`, { full: true }) };
}

rec('valid-run', await run('import-valid.csv', 'valid'));
rec('malformed-run', await run('import-malformed.csv', 'malformed'));
save(P, 'p5d.json', out); await c.close(); await browser.close(); console.log('P5d DONE');
