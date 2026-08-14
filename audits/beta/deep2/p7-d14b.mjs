// D-14 — same conditions as the P5 sweep: authenticated, every government route.
import { phase, newBrowser, ctx, login, goto, shot, PORTALS, pwFor, DESKTOP } from './lib.mjs';
const P = phase('P7');
const b = await newBrowser(true);
const { c, p } = await ctx(P, b, 'D-14', DESKTOP);
const bad = [];
p.on('response', (r) => { if (r.status() >= 400) bad.push({ s: r.status(), u: r.url().replace(/^https?:\/\//, '').slice(0, 130) }); });
await login(P, p, 'government', 'gov.republic@uchqun.uz', pwFor('gov.republic@uchqun.uz'), 'D-14');
const routes = ['/government', '/government/schools', '/government/students', '/government/teachers',
  '/government/parents', '/government/ratings', '/government/platform', '/government/warnings',
  '/government/audit-log', '/government/profile', '/government/settings', '/government/change-password'];
for (const r of routes) await goto(P, p, PORTALS.government + r, 'D-14', `D-14-${r.split('/').pop() || 'root'}`);
const fonts = bad.filter((x) => /font|gstatic|googleapis|woff/.test(x.u));
console.log(JSON.stringify({
  routesSwept: routes.length,
  totalFailures: bad.length,
  fontFailures: fonts.length,
  fontSample: fonts.slice(0, 3),
  otherSample: bad.filter((x) => !/font|gstatic|googleapis|woff/.test(x.u)).slice(0, 4),
}, null, 1));
console.log('shot:', await shot(P, p, 'D-14', 'D-14-government-no-font-404', { full: true }));
await c.close(); await b.close();
