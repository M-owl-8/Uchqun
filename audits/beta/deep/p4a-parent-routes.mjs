// P4a — parent portal: every route at 1440x950 AND 390x844, control dumps,
// horizontal-overflow check at mobile width, consent modal handled first.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, acceptParentConsent, PORTALS, PW, DESKTOP, MOBILE } from './lib.mjs';

const P = phase('P4');
const B = PORTALS.teacher;
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4a', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 240)); };

const ROUTES = [
  ['P1', '/', 'dashboard'],
  ['P2', '/child', 'child-profile'],
  ['P3', '/attendance', 'attendance'],
  ['P4', '/activities', 'activities'],
  ['P5', '/meals', 'meals'],
  ['P6', '/media', 'media'],
  ['P7', '/chat', 'chat'],
  ['P8', '/journal', 'journal'],
  ['P9', '/therapy', 'therapy'],
  ['P10', '/irr', 'irr'],
  ['P11', '/rating', 'rating'],
  ['P12', '/notifications', 'notifications'],
  ['P13', '/help', 'help'],
  ['P14', '/settings', 'settings'],
  ['P15', '/change-password', 'change-password'],
  ['P16', '/zzz-nonexistent', 'notfound'],
];

const browser = await newBrowser(true);

for (const [vpName, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
  const TAG = `parent-${vpName}`;
  const { c, p } = await ctx(P, browser, TAG, { viewport: vp, hasTouch: vpName === 'mobile', isMobile: vpName === 'mobile' });
  const li = await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i, vp: vpName });
  rec(`login-${vpName}`, li);
  if (!li.ok) { await c.close(); continue; }
  const consent = await acceptParentConsent(P, p, TAG);
  rec(`consent-${vpName}`, consent);

  const dumps = {};
  for (const [id, r, action] of ROUTES) {
    const f = await goto(P, p, B + r, TAG, `${id}-${action}`, { full: true, vp: vpName });
    const d = await p.evaluate(DUMP);
    // horizontal overflow: does anything push the document wider than the viewport?
    const overflow = await p.evaluate(() => {
      const de = document.documentElement;
      const over = [...document.querySelectorAll('*')]
        .filter((e) => e.getBoundingClientRect().right > de.clientWidth + 2 && e.offsetParent)
        .slice(0, 4)
        .map((e) => `${e.tagName}.${String(e.className).split(' ')[0]}@${Math.round(e.getBoundingClientRect().right)}`);
      return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflows: de.scrollWidth > de.clientWidth + 2, culprits: over };
    });
    dumps[id] = { route: r, shot: f, buttons: d.buttons, inputs: d.inputs, links: d.links, overflow, head: (await text(p)).slice(0, 200) };
    console.log(vpName, id, r, '→', f, `btn=${d.buttons.length}`, overflow.overflows ? `OVERFLOW ${overflow.scrollWidth}>${overflow.clientWidth}` : '');
  }
  save(P, `p4a-route-dumps-${vpName}.json`, dumps);
  rec(`overflowing-routes-${vpName}`, Object.entries(dumps).filter(([, d]) => d.overflow.overflows).map(([id, d]) => ({ id, route: d.route, ...d.overflow })));
  await c.close();
}

save(P, 'p4a.json', out);
await browser.close();
console.log('P4a DONE');
