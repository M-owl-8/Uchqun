// P4d — is the parent mobile tab bar fixed or in-flow? Measured on a short page
// and a long page, with viewport-sized captures at top and bottom of scroll.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW, MOBILE } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const TAG = 'parent-mobile'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4d', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 460)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG, { viewport: MOBILE, hasTouch: true, isMobile: true });
await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i, vp: 'mobile' });

const measure = () => p.evaluate(() => {
  const nav = [...document.querySelectorAll('nav')].filter((n) => n.getBoundingClientRect().height > 0)[0];
  const de = document.documentElement;
  if (!nav) return null;
  const r = nav.getBoundingClientRect();
  return { position: getComputedStyle(nav).position, navTopViewport: Math.round(r.top), navBottomViewport: Math.round(r.bottom),
    navTopDocument: Math.round(r.top + window.scrollY), docHeight: de.scrollHeight, viewportHeight: window.innerHeight,
    scrollY: Math.round(window.scrollY), visibleInViewport: r.top < window.innerHeight && r.bottom > 0 };
});

for (const [route, label] of [['/', 'short-dashboard'], ['/rating', 'long-rating']]) {
  await goto(P, p, B + route, TAG, `D-34-tabbar-${label}-top`, { vp: 'mobile', defect: 'D-34' });
  const atTop = await measure();
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(1500);
  const atBottom = await measure();
  const shotBottom = await shot(P, p, TAG, `D-34-tabbar-${label}-scrolled-bottom`, { vp: 'mobile', defect: 'D-34' });
  await p.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight / 2)));
  await p.waitForTimeout(1200);
  const atMiddle = await measure();
  const shotMid = await shot(P, p, TAG, `D-34-tabbar-${label}-scrolled-middle`, { vp: 'mobile', defect: 'D-34' });
  rec(`tabbar-${label}`, { atTop, atMiddle, atBottom, shotMid, shotBottom });
}

// real taps against the VISIBLE nav only
await goto(P, p, `${B}/`, TAG, 'mobile-taps-start', { vp: 'mobile' });
const taps = [];
for (const label of ['Kundalik', 'Galereya', 'Xabar', 'Bola', 'Bugun']) {
  const box = await p.evaluate((L) => {
    const nav = [...document.querySelectorAll('nav')].filter((n) => n.getBoundingClientRect().height > 0)[0];
    if (!nav) return null;
    const el = [...nav.querySelectorAll('a,button')].find((e) => (e.innerText || '').trim() === L);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, label);
  if (!box) { taps.push({ label, found: false }); continue; }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.touchscreen.tap(box.x + box.w / 2, box.y + box.h / 2);
  await p.waitForTimeout(3200);
  taps.push({ label, target: { w: Math.round(box.w), h: Math.round(box.h) }, url: new URL(p.url()).pathname, shot: await shot(P, p, TAG, `mobile-tap-${label}`, { vp: 'mobile' }) });
  console.log('tap', label, '→', taps[taps.length - 1].url);
}
rec('mobile-tab-taps', taps);
rec('tap-targets-under-44px', taps.filter((t) => t.target && (t.target.h < 44 || t.target.w < 44)));

// child switcher on mobile (first names only)
await goto(P, p, `${B}/`, TAG, 'mobile-switcher-before', { vp: 'mobile' });
const chips = await p.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.offsetParent && /^(Gulnoza|Islom)$/.test((e.innerText || '').trim())).map((e) => e.innerText.trim()));
rec('switcher-chips-mobile', chips);
await c.close(); save(P, 'p4d.json', out); await browser.close(); console.log('P4d DONE');
