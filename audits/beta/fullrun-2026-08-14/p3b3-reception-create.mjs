// P3b3 — isolated retry of the one provisioning path not yet proven:
// admin → create reception (modal submit button is type=submit inside the form).
import { newBrowser, ctx, login, shot, save, PORTALS, PW, SIMPW } from './lib.mjs';

const b = await newBrowser(true);
const { c, p } = await ctx(b, 'admin-smm2');
const out = {};
const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, 'admin-smm2');
if (li.ok) {
  await p.goto(`${PORTALS.admin}/admin/receptions`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  await p.locator('button', { hasText: 'Qabul yaratish' }).first().click();
  await p.waitForTimeout(2500);
  const form = p.locator('form').first();
  const texts = form.locator('input[type="text"]');
  await texts.nth(0).fill('SIM-Qabul');
  await texts.nth(1).fill('Beta');
  await texts.nth(2).fill('sim.qabul');
  await form.locator('input[type="password"]').first().fill(SIMPW);
  const tel = form.locator('input[type="tel"]');
  if (await tel.count()) await tel.first().fill('+998901112233');
  out.filled = await shot(p, 'admin-smm2', 'create-reception-filled');
  await form.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(1000);
  out.after1s = await shot(p, 'admin-smm2', 'create-reception-1s-after-submit');
  await p.waitForTimeout(4000);
  out.after5s = await shot(p, 'admin-smm2', 'create-reception-5s-after-submit');
  out.body = (await p.locator('body').innerText()).slice(0, 600);
}
save('p3b3-reception.json', out);
console.log(JSON.stringify(out, null, 1).slice(0, 900));
await c.close(); await b.close();
