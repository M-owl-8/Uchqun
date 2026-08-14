// D-35 — L2: the witness is the rendered page under the account that should see
// it, not the database row.
import { phase, newBrowser, ctx, login, goto, shot, text, PORTALS, pwFor, MOBILE } from './lib.mjs';
const P = phase('P7');
const b = await newBrowser(true);
const { c, p } = await ctx(P, b, 'D-35w', MOBILE);
await login(P, p, 'parent', 'otaona11@tmm3.uz', pwFor('otaona11@tmm3.uz'), 'D-35w', { tab: /Ota-ona|Parent/i });
await goto(P, p, `${PORTALS.teacher}/notifications`, 'D-35w', 'D-35-parent-notifications', { full: true });
const body = await text(p);
console.log(JSON.stringify({
  showsZero: /\(0\)/.test(body) && /Hozircha bildirishnoma/.test(body),
  hasAttendanceNotification: /kelmadi|Gulnoza/i.test(body),
  excerpt: body.replace(/\n+/g, ' | ').slice(0, 320),
}, null, 1));
console.log('shot:', await shot(P, p, 'D-35w', 'D-35-parent-sees-attendance-notification', { full: true }));
await c.close(); await b.close();
