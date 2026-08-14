// P3d — complete first-login for the two SIM government accounts:
// forced change-password, then prove the hierarchy each one actually sees.
import { newBrowser, ctx, login, shot, goto, save, text, PORTALS, SIMPW } from './lib.mjs';

const NEWPW = 'SimNew@2026';
const b = await newBrowser(true);
const out = {};

for (const a of [
  { tag: 'gov-region-secondary-SIM', email: 'simviloyat@samarqand.uz' },
  { tag: 'gov-republic-secondary-SIM', email: 'simrespublika@davlat.uz' },
]) {
  const { c, p } = await ctx(b, a.tag);
  const li = await login(p, 'government', a.email, SIMPW, a.tag);
  out[a.tag] = { firstLogin: li.ok, landing: li.landing, shot: li.shot };
  if (li.ok) {
    try {
      await shot(p, a.tag, 'forced-change-password');
      const pw = p.locator('input[type="password"]');
      await pw.nth(0).fill(SIMPW);
      await pw.nth(1).fill(NEWPW);
      await pw.nth(2).fill(NEWPW);
      await shot(p, a.tag, 'change-password-filled');
      await p.locator('button', { hasText: /o'zgartirish|Saqlash|Change/i }).first().click();
      await p.waitForTimeout(6000);
      out[`${a.tag}:changed`] = await shot(p, a.tag, 'change-password-result');
      out[`${a.tag}:afterUrl`] = p.url();
    } catch (e) { out[`${a.tag}:changeErr`] = e.message; }

    // re-login with the new password, then check what the account can see
    await p.context().clearCookies();
    const li2 = await login(p, 'government', a.email, NEWPW, a.tag);
    out[`${a.tag}:relogin`] = { ok: li2.ok, landing: li2.landing, shot: li2.shot };
    if (li2.ok) {
      out[`${a.tag}:dash`] = await goto(p, `${PORTALS.government}/government`, a.tag, 'dashboard');
      out[`${a.tag}:dashBody`] = (await text(p)).slice(0, 900);
      out[`${a.tag}:schools`] = await goto(p, `${PORTALS.government}/government/schools`, a.tag, 'schools-scope');
      out[`${a.tag}:schoolsBody`] = (await text(p)).slice(0, 900);
    }
  }
  await c.close();
}

save('p3d-gov-firstlogin.json', out);
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
await b.close();
