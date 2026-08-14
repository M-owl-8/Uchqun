// P3c — finish R1: create the republic/secondary government account, then
// witness first login for both newly-created government accounts.
import { newBrowser, ctx, login, shot, goto, save, text, PORTALS, PW, SIMPW } from './lib.mjs';

const b = await newBrowser(true);
const out = {};

// 1. create republic / secondary
{
  const { c, p } = await ctx(b, 'gov-republic');
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', PW, 'gov-republic');
  if (li.ok) {
    await p.goto(`${PORTALS.government}/government/platform`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    await p.locator('button', { hasText: 'Davlat foydalanuvchilari' }).first().click();
    await p.waitForTimeout(2000);
    await p.locator('select').nth(0).selectOption('republic');
    await p.waitForTimeout(700);
    await p.locator('select').nth(1).selectOption('secondary');
    await p.waitForTimeout(1200);
    await p.locator('#ism').fill('SIM-Respublika');
    await p.locator('#familiya').fill('Ikkinchi');
    await p.locator('input[type="password"]').first().fill(SIMPW);
    const cbs = p.locator('input[type="checkbox"]');
    for (let i = 0; i < await cbs.count(); i++) { try { await cbs.nth(i).check(); } catch { /* skip */ } }
    out.formShot = await shot(p, 'gov-republic', 'create-gov-republic-secondary-filled');
    await p.locator('button', { hasText: 'Hisob Yaratish' }).first().click();
    await p.waitForTimeout(1000);
    out.after1s = await shot(p, 'gov-republic', 'create-gov-republic-secondary-1s');
    await p.waitForTimeout(4000);
    out.after5s = await shot(p, 'gov-republic', 'create-gov-republic-secondary-5s');
    out.listBody = (await text(p)).slice(0, 1500);
  }
  await c.close();
}

// 2. first-login witness for the region/secondary account created in P3b2
for (const acct of [
  { tag: 'gov-region-secondary-SIM', email: 'simviloyat@samarqand.uz' },
]) {
  const { c, p } = await ctx(b, acct.tag);
  const li = await login(p, 'government', acct.email, SIMPW, acct.tag);
  out[acct.tag] = { ok: li.ok, landing: li.landing, shot: li.shot };
  if (li.ok) {
    out[`${acct.tag}:schools`] = await goto(p, `${PORTALS.government}/government/schools`, acct.tag, 'schools-scope-check');
    out[`${acct.tag}:schoolsBody`] = (await text(p)).slice(0, 900);
    out[`${acct.tag}:platform`] = await goto(p, `${PORTALS.government}/government/platform`, acct.tag, 'platform');
  }
  await c.close();
}

save('p3c-gov-accounts.json', out);
console.log(JSON.stringify(out, null, 1).slice(0, 2500));
await b.close();
