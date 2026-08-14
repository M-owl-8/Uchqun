// P2g — D-25 decisive test: a touch device has no :hover. Tap the ⋯ trigger on a
// touch-enabled context and see whether the action menu is reachable at all.
import { chromium } from 'playwright';
import { phase, shot, save, ev, instrument, login, goto, PORTALS, PW } from './lib.mjs';
const P = phase('P2'); const TAG = 'reception-touch'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2g', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };
const browser = await chromium.launch({ headless: true });
const c = await browser.newContext({ viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: false, locale: 'uz' });
const p = await c.newPage();
instrument(P, p, TAG);
await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);
await goto(P, p, `${PORTALS.reception}/reception/parents`, TAG, 'D-25-touch-parents-list', { defect: 'D-25', full: true });

const trigger = p.locator('td .relative.group > button').first();
const box = await trigger.boundingBox();
let tapped = null; let visible = false;
if (box) {
  // a real tap: touchscreen only, no mouse move, so :hover never fires
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(1500);
  tapped = await shot(P, p, TAG, 'D-25-after-TOUCH-TAP-no-hover', { defect: 'D-25', full: true });
  visible = await p.locator('button', { hasText: /^Tahrirlash$/ }).first().isVisible().catch(() => false);
}
// and confirm the trigger has no click handler in the source
rec('D-25-touch', {
  triggerFound: !!box, tapped, editVisibleAfterTap: visible,
  note: 'trigger markup: <button className="p-1 ..."><MoreHorizontal/></button> — no onClick (ParentManagement.jsx:617-619); menu is <div className="hidden group-hover:block ...">',
});
save(P, 'p2g.json', out);
await c.close(); await browser.close();
console.log('P2g DONE');
