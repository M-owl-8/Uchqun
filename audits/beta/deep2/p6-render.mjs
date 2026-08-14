// P6.3 — one representative page per portal per locale, rendered and measured.
// A raw key, an English fallback in a non-English locale, or an overflow is a defect.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, pwFor, DESKTOP } from './lib.mjs';
const P = phase('P6'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p6', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };
const SPEC = [
  ['reception', 'reception', 'qabul@tmm3.uz', `${PORTALS.reception}/reception/parents`, {}],
  ['teacher', 'teacher', 'tarbiyachi1@tmm3.uz', `${PORTALS.teacher}/teacher/bolalar`, {}],
  ['parent', 'parent', 'otaona11@tmm3.uz', `${PORTALS.teacher}/rating`, { tab: /Ota-ona|Parent/i }],
  ['admin', 'admin', 'direktor@tmm3.uz', `${PORTALS.admin}/admin/receptions`, {}],
  ['government', 'government', 'gov.republic@uchqun.uz', `${PORTALS.government}/government/schools`, {}],
];
const browser = await newBrowser(true);
for (const [name, portal, email, url, opts] of SPEC) {
  for (const loc of ['uz', 'ru', 'en']) {
    const TAG = `p6-${name}-${loc}`;
    const { c, p } = await ctx(P, browser, TAG, DESKTOP);
    await p.goto(`${PORTALS[portal]}/login`, { waitUntil: 'domcontentloaded' });
    await p.evaluate((l) => { localStorage.setItem('dnp:lang', l); localStorage.setItem('lang', l); }, loc);
    await login(P, p, portal, email, pwFor(email), TAG, opts);
    await goto(P, p, url, TAG, `${name}-${loc}`, { full: true });
    const m = await p.evaluate(() => {
      const body = document.body.innerText;
      const de = document.documentElement;
      // a raw key on screen: a dotted lowerCamel identifier standing alone
      const rawKeys = (body.match(/\b[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*){1,3}\b/g) || [])
        .filter((s) => !/\.(uz|com|json|js|jsx|png|svg)$/.test(s) && !s.includes('@'));
      return { rawKeys: [...new Set(rawKeys)].slice(0, 6), scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
        overflows: de.scrollWidth > de.clientWidth + 2, chars: body.length, sample: body.replace(/\n/g, ' | ').slice(120, 260) };
    });
    out[`${name}-${loc}`] = m;
    console.log(`${name.padEnd(11)} ${loc}  chars=${String(m.chars).padEnd(6)} rawKeys=${m.rawKeys.length} ${m.overflows ? 'OVERFLOW' : ''} ${m.rawKeys.join(',')}`);
    await c.close();
  }
}
save(P, 'p6-render.json', out); await browser.close();
