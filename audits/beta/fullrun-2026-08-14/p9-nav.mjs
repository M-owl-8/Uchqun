// P9 — navigation reachability audit: every in-app link/nav target a role can
// reach from the landing page, to find routes that exist but are unreachable.
import { newBrowser, ctx, login, shot, save, PORTALS, PW } from './lib.mjs';

const HREFS = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const links = [...document.querySelectorAll('a[href]')].filter(vis).map(a => a.getAttribute('href'));
  const navBtns = [...document.querySelectorAll('button')].filter(vis).map(e => (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean);
  return { links: [...new Set(links)], navBtns: [...new Set(navBtns)] };
};

const b = await newBrowser(true);
const out = {};
for (const r of [
  { tag: 'gov-republic', portal: 'government', email: 'gov.republic@uchqun.uz', home: `${PORTALS.government}/government` },
  { tag: 'admin-smm2', portal: 'admin', email: 'admin4@uchqun.uz', home: `${PORTALS.admin}/admin` },
  { tag: 'reception-smm2', portal: 'reception', email: 'reception4@uchqun.uz', home: `${PORTALS.reception}/reception` },
  { tag: 'teacher-smm2', portal: 'teacher', email: 'teacher7@uchqun.uz', home: `${PORTALS.teacher}/teacher` },
]) {
  const { c, p } = await ctx(b, r.tag);
  const li = await login(p, r.portal, r.email, PW, r.tag);
  if (li.ok) {
    await p.goto(r.home, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4000);
    out[r.tag] = await p.evaluate(HREFS);
    await shot(p, r.tag, 'nav-reachability-home');
  }
  await c.close();
}
save('p9-nav.json', out);
console.log(JSON.stringify(out, null, 1));
await b.close();
