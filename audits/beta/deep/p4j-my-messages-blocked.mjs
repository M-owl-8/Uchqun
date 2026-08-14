import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW, DESKTOP } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const TAG = 'parent-desktop'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG, DESKTOP);
await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
await goto(P, p, `${B}/child`, TAG, 'my-messages-hit-test');
out.hitTest = await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((e) => /Mening murojaatlarim/.test(e.innerText || ''));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return {
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
    topElementAtCentre: top ? `${top.tagName}.${String(top.className).slice(0, 40)}` : null,
    topIsTheButtonOrChild: top ? (top === b || b.contains(top)) : null,
    windowH: window.innerHeight, scrollY: Math.round(window.scrollY),
  };
});
console.log('hitTest', JSON.stringify(out.hitTest));
// scroll it into view, then retry a normal click
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => /Mening murojaatlarim/.test(e.innerText || '')); if (b) b.scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(1200);
out.hitTestAfterScroll = await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((e) => /Mening murojaatlarim/.test(e.innerText || ''));
  const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { topElementAtCentre: top ? `${top.tagName}.${String(top.className).slice(0, 40)}` : null, topIsTheButtonOrChild: top ? (top === b || b.contains(top)) : null };
});
console.log('afterScroll', JSON.stringify(out.hitTestAfterScroll));
let clickErr = null;
try { await p.locator('button', { hasText: /Mening murojaatlarim/ }).first().click({ timeout: 8000 }); } catch (e) { clickErr = e.message.split('\n')[0]; }
await p.waitForTimeout(2500);
out.normalClick = { error: clickErr, shot: await shot(P, p, TAG, 'my-messages-after-normal-click', { full: true }) };
// DOM-level click, bypassing hit testing entirely
out.domClick = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => /Mening murojaatlarim/.test(e.innerText || '')); if (!b) return false; b.click(); return true; });
await p.waitForTimeout(3000);
out.afterDomClick = { shot: await shot(P, p, TAG, 'my-messages-after-dom-click', { full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 320) };
console.log('normalClickErr:', clickErr);
console.log('afterDomClick:', out.afterDomClick.body.slice(0, 260));
ev(P, { kind: 'p4j', v: { hit: out.hitTest, clickErr } }); save(P, 'p4j.json', out); await c.close(); await browser.close();
