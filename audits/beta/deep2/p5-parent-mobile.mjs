// P5.1 — parent portal, every page, desktop AND 390x844. The highest-volume
// surface in the product. Every layout break is a defect and gets fixed.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, acceptParentConsent, PORTALS, pwFor, DESKTOP, MOBILE } from './lib.mjs';
const P = phase('P5'); const B = PORTALS.teacher; const out = { desktop: {}, mobile: {} };
const rec = (k, v) => { ev(P, { kind: 'p5-parent', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 260)); };
const ROUTES = [['P1','/','dashboard'],['P2','/child','child'],['P3','/attendance','attendance'],
  ['P4','/activities','activities'],['P5','/meals','meals'],['P6','/media','media'],['P7','/chat','chat'],
  ['P8','/journal','journal'],['P9','/therapy','therapy'],['P10','/irr','irr'],['P11','/rating','rating'],
  ['P12','/notifications','notifications'],['P13','/help','help'],['P14','/settings','settings'],
  ['P15','/change-password','change-password'],['P16','/zzz','notfound']];
const browser = await newBrowser(true);
for (const [vp, viewport] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
  const TAG = `p5-parent-${vp}`;
  const { c, p } = await ctx(P, browser, TAG, { viewport, hasTouch: vp === 'mobile', isMobile: vp === 'mobile' });
  await login(P, p, 'parent', 'otaona11@tmm3.uz', pwFor('otaona11@tmm3.uz'), TAG, { tab: /Ota-ona|Parent/i, vp });
  await acceptParentConsent(P, p, TAG);
  for (const [id, r, action] of ROUTES) {
    await goto(P, p, B + r, TAG, `${id}-${action}`, { full: true, vp });
    const m = await p.evaluate(() => {
      const de = document.documentElement;
      const clipped = [...document.querySelectorAll('*')]
        .filter((e) => e.children.length === 0 && e.offsetParent && e.textContent.trim())
        .filter((e) => e.scrollWidth > e.clientWidth + 1)
        .map((e) => ({ t: e.textContent.trim().slice(0, 34), c: e.clientWidth, s: e.scrollWidth }));
      const over = [...document.querySelectorAll('*')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > de.clientWidth + 2)
        .slice(0, 3).map((e) => `${e.tagName}.${String(e.className).split(' ')[0]}@${Math.round(e.getBoundingClientRect().right)}`);
      return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflows: de.scrollWidth > de.clientWidth + 2, clipped: clipped.slice(0, 6), culprits: over };
    });
    out[vp][id] = { route: r, ...m };
    if (m.overflows || m.clipped.length) console.log(`${vp} ${id} ${r}`, m.overflows ? `OVERFLOW ${m.scrollWidth}>${m.clientWidth}` : '', m.clipped.length ? `clipped=${m.clipped.length}` : '');
  }
  await c.close();
}
const bad = Object.entries(out.mobile).filter(([, v]) => v.overflows || v.clipped.length);
rec('mobile-breaks', bad.map(([id, v]) => ({ id, route: v.route, scrollWidth: v.scrollWidth, clipped: v.clipped.length, culprits: v.culprits })));
save(P, 'p5-parent.json', out); await browser.close();
