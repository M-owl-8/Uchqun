import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW, DESKTOP } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const TAG = 'parent-desktop'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG, DESKTOP);
await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
await goto(P, p, `${B}/child`, TAG, 'modal-viewport-start');
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => /Mening murojaatlarim/.test(e.innerText || '')); b.scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(1000);
await p.locator('button', { hasText: /Mening murojaatlarim/ }).first().click();
await p.waitForTimeout(3000);
out.dialog = await p.evaluate(() => {
  const cands = [...document.querySelectorAll('div,section,dialog')].filter((e) => { const cs = getComputedStyle(e); return (cs.position === 'fixed') && e.getBoundingClientRect().width > 200 && e.getBoundingClientRect().height > 100; });
  return cands.slice(0, 4).map((e) => { const r = e.getBoundingClientRect(); return { tag: e.tagName, cls: String(e.className).slice(0, 44), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w || r.width), h: Math.round(r.height) }, text: (e.innerText || '').trim().replace(/\n/g, ' | ').slice(0, 200) }; });
});
out.viewportShot = await shot(P, p, TAG, 'parent-my-messages-modal-viewport', {});
console.log(JSON.stringify(out.dialog, null, 1).slice(0, 1100));
ev(P, { kind: 'p4k', v: out.dialog }); save(P, 'p4k.json', out); await c.close(); await browser.close();
