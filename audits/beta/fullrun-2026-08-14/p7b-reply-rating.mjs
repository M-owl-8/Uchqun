// P7b — corrected selectors: the reply send button is icon-only
// (aria-label="Yuborish"); the rating period is a <select> and the indicators
// are star buttons (5 rows x 5 stars).
import { newBrowser, ctx, login, shot, goto, save, ev, text, PORTALS, PW } from './lib.mjs';

const SMM2 = '5334e23c-a749-4808-8b9a-1f8c67aa1938';
const b = await newBrowser(true);
const out = {};
function rec(k, v) { out[k] = v; ev({ kind: 'p7b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); }

{
  const { c, p } = await ctx(b, 'gov-region-samarqand');
  const li = await login(p, 'government', 'gov.samarqand@uchqun.uz', PW, 'gov-region-samarqand');
  if (li.ok) {
    try {
      await goto(p, `${PORTALS.government}/government/platform`, 'gov-region-samarqand', 'platform');
      await p.locator('button', { hasText: 'Xabarlar' }).first().click();
      await p.waitForTimeout(4000);
      await p.locator('button', { hasText: /^Javob$/ }).first().click();
      await p.waitForTimeout(1800);
      await shot(p, 'gov-region-samarqand', 'reply-composer-open');
      await p.locator('textarea[placeholder="Javobingizni yozing..."]').first()
        .fill('SIM-Escalation-01-REPLY — viloyat nazorati qabul qildi, 2026-08-14.');
      await shot(p, 'gov-region-samarqand', 'reply-typed');
      await p.locator('button[aria-label="Yuborish"]').first().click();
      await p.waitForTimeout(1200);
      await shot(p, 'gov-region-samarqand', 'reply-1s-after-send');
      await p.waitForTimeout(5000);
      const f = await shot(p, 'gov-region-samarqand', 'reply-sent');
      rec('C2b-region-replies', { shot: f, body: (await text(p)).slice(0, 1000) });
    } catch (e) { rec('C2b-region-replies', { error: e.message }); }

    try {
      await goto(p, `${PORTALS.government}/government/schools/${SMM2}`, 'gov-region-samarqand', 'school-detail');
      const form = p.locator('form').first();
      const sel = form.locator('select').first();
      const period = await sel.inputValue();
      // 5 indicator rows x 5 stars = 25 buttons; pick the 4th star in each row
      const stars = form.locator('button svg').locator('..');
      const total = await stars.count();
      for (let row = 0; row < 5; row++) {
        const idx = row * 5 + 3;
        if (idx < total) { await stars.nth(idx).click(); await p.waitForTimeout(250); }
      }
      await form.locator('textarea').first().fill('SIM- viloyat bahosi, beta simulyatsiya 2026-08-14.');
      await shot(p, 'gov-region-samarqand', 'school-rating-filled');
      await form.locator('button[type="submit"]').first().click();
      await p.waitForTimeout(1200);
      await shot(p, 'gov-region-samarqand', 'school-rating-1s-after-submit');
      await p.waitForTimeout(5000);
      const f = await shot(p, 'gov-region-samarqand', 'school-rating-result');
      rec('C3b-region-rates-school', { period, starButtons: total, shot: f, body: (await text(p)).slice(0, 800) });
    } catch (e) { rec('C3b-region-rates-school', { error: e.message }); }
  }
  await c.close();
}

{
  const { c, p } = await ctx(b, 'admin-smm2');
  const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, 'admin-smm2');
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin/messages`, 'admin-smm2', 'gov-messages-list');
    try { await p.locator('button', { hasText: 'SIM-Escalation-01' }).first().click(); await p.waitForTimeout(3000); } catch { /* none */ }
    const f = await shot(p, 'admin-smm2', 'gov-message-thread-reply-check');
    const body = await text(p);
    rec('E2-admin-sees-reply', { replyVisible: body.includes('SIM-Escalation-01-REPLY'), shot: f, body: body.slice(0, 1000) });
  }
  await c.close();
}

save('p7b-reply-rating.json', out);
await b.close();
console.log('P7b DONE');
