// P2c — D-17: create a reception as the director and screenshot EXACTLY what the
// creator is told about activation.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P2');
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2c', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 320)); };
const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, 'director-tmm3');
const li = await login(P, p, 'admin', 'direktor@tmm3.uz', PW, 'director-tmm3');
if (li.ok) {
  await goto(P, p, `${PORTALS.admin}/admin/receptions`, 'director-tmm3', 'D-17-receptions-before', { defect: 'D-17', full: true });
  await p.locator('button', { hasText: 'Qabul yaratish' }).first().click();
  await p.waitForTimeout(2500);
  const form = p.locator('form').first();
  const t = form.locator('input[type="text"]');
  await t.nth(0).fill('Shahnoza'); await t.nth(1).fill('Umarova'); await t.nth(2).fill('sh.umarova');
  await form.locator('input[type="password"]').first().fill(PW);
  const tel = form.locator('input[type="tel"]');
  if (await tel.count()) await tel.first().fill('+998901239911');
  rec('form', { shot: await shot(P, p, 'director-tmm3', 'D-17-create-form-filled', { defect: 'D-17' }) });
  await form.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(1500);
  const s1 = await shot(P, p, 'director-tmm3', 'D-17-immediately-after-create', { defect: 'D-17', full: true });
  const t1 = await text(p);
  await p.waitForTimeout(5000);
  const s2 = await shot(P, p, 'director-tmm3', 'D-17-list-after-create', { defect: 'D-17', full: true });
  const t2 = await text(p);
  rec('D-17-what-the-creator-is-told', {
    shots: [s1, s2],
    toastMentionsActivation: /faollashtir|activate|tasdiq|kutil/i.test(t1),
    listShowsPendingState: /Tasdiqlash kutilmoqda|Faol emas/i.test(t2),
    toastText: (t1.match(/[^\n]*(yaratildi|created|xatolik)[^\n]*/i) || [])[0] ?? null,
  });
}
await c.close(); await browser.close();
{
  const { c: c2, p: p2 } = await ctx(P, await newBrowser(true), 'new-reception-2');
  const li2 = await login(P, p2, 'reception', 'sh.umarova@tmm3.uz', PW, 'new-reception-2');
  const f = await shot(P, p2, 'new-reception-2', 'D-17-first-login-attempt', { defect: 'D-17' });
  rec('D-17-first-login', { ok: li2.ok, landing: li2.landing, shot: f, head: (await text(p2)).slice(0, 220) });
  await c2.close();
}
save(P, 'p2c.json', out);
console.log('P2c DONE');
process.exit(0);
