// P3e — decisive re-check: fresh browser, fresh login for the two SIM
// government accounts with their post-change passwords.
import { newBrowser, ctx, login, goto, save, text, PORTALS } from './lib.mjs';

const NEWPW = 'SimNew@2026';
const b = await newBrowser(true);
const out = {};
for (const a of [
  { tag: 'gov-region-secondary-SIM', email: 'simviloyat@samarqand.uz' },
  { tag: 'gov-republic-secondary-SIM', email: 'simrespublika@davlat.uz' },
]) {
  const { c, p } = await ctx(b, a.tag);
  const li = await login(p, 'government', a.email, NEWPW, a.tag, {});
  out[a.tag] = { ok: li.ok, landing: li.landing, shot: li.shot };
  if (li.ok) {
    out[`${a.tag}:dashBody`] = (await text(p)).slice(0, 700);
    out[`${a.tag}:schools`] = await goto(p, `${PORTALS.government}/government/schools`, a.tag, 'schools-scope');
    out[`${a.tag}:schoolsBody`] = (await text(p)).slice(0, 700);
  }
  await c.close();
}
save('p3e-gov-recheck.json', out);
console.log(JSON.stringify(out, null, 1).slice(0, 3000));
await b.close();
