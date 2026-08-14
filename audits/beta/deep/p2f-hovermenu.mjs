// P2f — the parent action menu is a CSS :hover reveal. Prove the mechanism:
// click does nothing, hover reveals it, and the trigger has no onClick handler.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P2'); const TAG = 'reception-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2f', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };
const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);
await goto(P, p, `${PORTALS.reception}/reception/parents`, TAG, 'parents-hovermenu-base');

const trigger = p.locator('td .relative.group > button').first();
// 1. CLICK the trigger — does the menu open?
await trigger.click({ timeout: 10000 }).catch(() => {});
await p.waitForTimeout(1200);
const afterClick = await shot(P, p, TAG, 'D-25-action-menu-after-CLICK', { defect: 'D-25', full: true });
const visAfterClick = await p.locator('button', { hasText: /^Tahrirlash$/ }).first().isVisible().catch(() => false);
// 2. HOVER the trigger — does it open now?
await trigger.hover();
await p.waitForTimeout(1200);
const afterHover = await shot(P, p, TAG, 'D-25-action-menu-after-HOVER', { defect: 'D-25' });
const visAfterHover = await p.locator('button', { hasText: /^Tahrirlash$/ }).first().isVisible().catch(() => false);
// 3. open ParentFormModal through the hover path so its 19 controls get exercised
let modal = null; let controls = null; let validation = null;
if (visAfterHover) {
  await p.locator('button', { hasText: /^Tahrirlash$/ }).first().click();
  await p.waitForTimeout(2500);
  modal = await shot(P, p, TAG, 'ParentFormModal-open', { full: true });
  controls = await p.evaluate(() => ({
    buttons: [...document.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.innerText || e.title || '').trim().slice(0, 30)),
    inputs: [...document.querySelectorAll('input,select,textarea')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => `${e.tagName}:${e.type || ''}`),
  }));
  const t = p.locator('input[type="text"]:visible');
  if (await t.count()) await t.first().fill('');
  const sub = p.locator('button[type="submit"]:visible');
  if (await sub.count()) { await sub.first().click({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(2000); }
  validation = await shot(P, p, TAG, 'ParentFormModal-VALIDATION-blank-required', { full: true });
}
rec('D-25-hover-only-menu', { afterClick, visAfterClick, afterHover, visAfterHover, modal, controls, validation });
save(P, 'p2f.json', out);
await c.close(); await browser.close();
console.log('P2f DONE');
