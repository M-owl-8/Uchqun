// P2e — ChildFormModal / ParentFormModal: the controls are icon-only buttons whose
// only label is a title attribute, so they must be targeted by [title], not by text.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
const P = phase('P2'); const B = PORTALS.reception; const TAG = 'reception-tmm3';
const out = {}; const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2e', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };
const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);
await goto(P, p, `${B}/reception/parents`, TAG, 'parents-for-icon-modals');

const titles = await p.evaluate(() => [...document.querySelectorAll('button[title]')]
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map((e) => e.getAttribute('title')));
rec('icon-button-titles', [...new Set(titles)]);

try {
  await p.locator('button[title="Bolani tahrirlash"]').first().click({ timeout: 15000 });
  await p.waitForTimeout(2500);
  const opened = await shot(P, p, TAG, 'ChildFormModal-open', { full: true });
  const controls = await p.evaluate(DUMP);
  const t = p.locator('input[type="text"]:visible');
  if (await t.count()) await t.first().fill('');
  const sub = p.locator('button[type="submit"]:visible');
  let v = null;
  if (await sub.count()) { await sub.first().click({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(2000); }
  v = await shot(P, p, TAG, 'ChildFormModal-VALIDATION-blank-required', { full: true });
  rec('ChildFormModal', { opened, validation: v, controls });
} catch (e) { rec('ChildFormModal-ERR', e.message.split('\n')[0]); }

save(P, 'p2e.json', out);
await c.close(); await browser.close();
console.log('P2e DONE');
