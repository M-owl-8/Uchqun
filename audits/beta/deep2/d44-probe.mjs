// D-44 re-derivation — does the DOCUMENTED hash authenticate the DOCUMENTED password?
import { phase, newBrowser, ctx, goto, shot, save, PORTALS, API } from './lib.mjs';
const P = phase('P1'); const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, 'd44');
await goto(P, p, `${PORTALS.government}/login`, 'd44', 'd44-login-page');
const out = await p.evaluate(async (api) => {
  const one = async (email, password) => { const r = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); return { email, password, status: r.status, body: (await r.text()).slice(0, 170) }; };
  return [
    await one('gov.republic@uchqun.uz', 'Test@2026'),
    await one('gov.toshkent@uchqun.uz', 'Test@2026'),
    await one('gov.samarqand@uchqun.uz', 'Test@2026'),
    await one('men@davlat.uz', 'Test@2026'),
    await one('direktor@tmm3.uz', 'Uchqun@2026'),   // P1-seed account family
  ];
}, API);
out.forEach(o => console.log(o.status, o.email.padEnd(26), o.body.slice(0, 90)));
save(P, 'd44-probe.json', out);
await c.close(); await browser.close();
