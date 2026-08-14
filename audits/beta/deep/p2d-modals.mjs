// P2d — modal / sub-form controls not reachable from a bare route load.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
const P = phase('P2'); const B = PORTALS.reception; const TAG = 'reception-tmm3';
const out = {}; const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2d', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 280)); };
const T = async (label, fn) => { try { await fn(); } catch (e) { rec(`${label}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const li = await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);

await T('ChildFormModal', async () => {
  await goto(P, p, `${B}/reception/parents`, TAG, 'parents-for-childmodal');
  await p.locator('button', { hasText: /^Bolani tahrirlash$/ }).first().click({ timeout: 15000 });
  await p.waitForTimeout(2500);
  const opened = await shot(P, p, TAG, 'ChildFormModal-open', { full: true });
  const controls = await p.evaluate(DUMP);
  const t = p.locator('input[type="text"]:visible');
  if (await t.count()) await t.first().fill('');
  const sub = p.locator('button[type="submit"]:visible');
  let v = null;
  if (await sub.count()) { await sub.first().click({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(1800); v = await shot(P, p, TAG, 'ChildFormModal-VALIDATION-blank-required', { full: true }); }
  rec('ChildFormModal', { opened, validation: v, controls });
});

await T('ParentCard-actions', async () => {
  await goto(P, p, `${B}/reception/parents`, TAG, 'parents-for-cardactions');
  const d = await p.evaluate(DUMP);
  // the per-card 'submit' button is the status toggle rendered by ParentCard
  const toggles = p.locator('button[type="submit"]:visible');
  let f = null;
  if (await toggles.count()) { await toggles.first().click({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(2200); f = await shot(P, p, TAG, 'ParentCard-status-toggle-clicked', { full: true }); }
  rec('ParentCard-actions', { toggles: await toggles.count(), shot: f, buttons: d.buttons.slice(0, 12) });
});

await T('MessageModal', async () => {
  await goto(P, p, `${B}/reception/profile`, TAG, 'profile-for-message-modal');
  await p.locator('button', { hasText: /Davlatga xabar/ }).first().click({ timeout: 15000 });
  await p.waitForTimeout(2500);
  const opened = await shot(P, p, TAG, 'MessageModal-open', { full: true });
  const controls = await p.evaluate(DUMP);
  // empty submit — whatever the primary button is called
  const btns = controls.buttons;
  const sub = p.locator('button[type="submit"]:visible');
  let v = null;
  if (await sub.count()) { await sub.first().click({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(1800); }
  v = await shot(P, p, TAG, 'MessageModal-VALIDATION-empty', { full: true });
  // then a real message
  const ta = p.locator('textarea:visible'); const ti = p.locator('input[type="text"]:visible');
  if (await ti.count()) await ti.first().fill('Qo‘shimcha logoped shtati haqida so‘rov');
  if (await ta.count()) await ta.first().fill('Muassasamizda nutq nuqsoni bo‘lgan bolalar soni ortdi.');
  const filled = await shot(P, p, TAG, 'MessageModal-filled', { full: true });
  rec('MessageModal', { opened, validation: v, filled, controls, buttons: btns });
});

save(P, 'p2d.json', out);
await c.close(); await browser.close();
console.log('P2d DONE');
