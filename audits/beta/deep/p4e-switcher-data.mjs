// P4e — does switching child actually change the data, or only the label?
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW, DESKTOP } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const TAG = 'parent-desktop'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4e', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 420)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG, DESKTOP);
await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
const snap = async (tag) => {
  const s = await shot(P, p, TAG, tag, { full: true });
  const b = await text(p);
  return { shot: s, header: (b.match(/(Gulnoza|Islom)[^\n]*/) || [])[0] ?? null, body: b.replace(/\n/g, ' | ').slice(0, 220) };
};
await goto(P, p, `${B}/child`, TAG, 'switcher-child-A');
rec('child-A', await snap('switcher-child-A-profile'));
const clicked = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && (e.innerText || '').trim() === 'Islom'); if (b) { b.click(); return true; } return false; });
await p.waitForTimeout(4500);
rec('clicked-islom', clicked);
rec('child-B', await snap('switcher-child-B-profile'));
await goto(P, p, `${B}/attendance`, TAG, 'switcher-child-B-attendance');
rec('child-B-attendance', await snap('switcher-child-B-attendance-view'));
await goto(P, p, `${B}/journal`, TAG, 'switcher-child-B-journal');
rec('child-B-journal', await snap('switcher-child-B-journal-view'));
save(P, 'p4e.json', out); await c.close(); await browser.close(); console.log('P4e DONE');
