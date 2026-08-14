// P7 — finish the cross-role chain: regional gov replies to the school's
// escalation, rates the school, then the school admin reads the reply.
import { newBrowser, ctx, login, shot, goto, save, ev, text, PORTALS, PW } from './lib.mjs';

const SMM2 = '5334e23c-a749-4808-8b9a-1f8c67aa1938';
const b = await newBrowser(true);
const out = {};
function rec(k, v) { out[k] = v; ev({ kind: 'p7', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); }

// ── Regional government ──────────────────────────────────────────────
{
  const { c, p } = await ctx(b, 'gov-region-samarqand');
  const li = await login(p, 'government', 'gov.samarqand@uchqun.uz', PW, 'gov-region-samarqand');
  if (li.ok) {
    // reply to the escalation
    try {
      await goto(p, `${PORTALS.government}/government/platform`, 'gov-region-samarqand', 'platform');
      await p.locator('button', { hasText: 'Xabarlar' }).first().click();
      await p.waitForTimeout(4000);
      await shot(p, 'gov-region-samarqand', 'messages-list');
      // "Javob" toggles the reply composer for that message
      await p.locator('button', { hasText: /^Javob$/ }).first().click();
      await p.waitForTimeout(1800);
      await shot(p, 'gov-region-samarqand', 'reply-composer-open');
      await p.locator('textarea').first().fill('SIM-Escalation-01-REPLY — viloyat nazorati qabul qildi, 2026-08-14.');
      await shot(p, 'gov-region-samarqand', 'reply-typed');
      const send = p.locator('button', { hasText: /Yuborish|Jo'natish/ }).last();
      await send.click();
      await p.waitForTimeout(1200);
      await shot(p, 'gov-region-samarqand', 'reply-1s-after-send');
      await p.waitForTimeout(5000);
      const f = await shot(p, 'gov-region-samarqand', 'reply-sent');
      rec('C2b-region-replies', { shot: f, body: (await text(p)).slice(0, 900) });
    } catch (e) { rec('C2b-region-replies', { error: e.message }); }

    // rate the school (inline form on SchoolDetail)
    try {
      await goto(p, `${PORTALS.government}/government/schools/${SMM2}`, 'gov-region-samarqand', 'school-detail');
      const period = p.locator('input[type="text"], input[type="month"]').first();
      const ph = await period.getAttribute('placeholder');
      await period.fill('2026-Q3').catch(() => {});
      const ranges = p.locator('input[type="range"]');
      const nr = await ranges.count();
      for (let i = 0; i < nr; i++) await ranges.nth(i).fill('4');
      await p.locator('textarea').first().fill('SIM- viloyat bahosi, beta simulyatsiya 2026-08-14.');
      await shot(p, 'gov-region-samarqand', 'school-rating-filled');
      await p.locator('button[type="submit"]').first().click();
      await p.waitForTimeout(1200);
      await shot(p, 'gov-region-samarqand', 'school-rating-1s-after-submit');
      await p.waitForTimeout(5000);
      const f = await shot(p, 'gov-region-samarqand', 'school-rating-result');
      rec('C3b-region-rates-school', { periodPlaceholder: ph, ranges: nr, shot: f, body: (await text(p)).slice(0, 700) });
    } catch (e) { rec('C3b-region-rates-school', { error: e.message }); }
  }
  await c.close();
}

// ── School admin reads the reply ─────────────────────────────────────
{
  const { c, p } = await ctx(b, 'admin-smm2');
  const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, 'admin-smm2');
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin/messages`, 'admin-smm2', 'gov-messages-list');
    try { await p.locator('button', { hasText: 'SIM-Escalation-01' }).first().click(); await p.waitForTimeout(3000); } catch { /* none */ }
    const f = await shot(p, 'admin-smm2', 'gov-message-thread-reply-check');
    const body = await text(p);
    rec('E2-admin-sees-reply', { replyVisible: body.includes('SIM-Escalation-01-REPLY'), shot: f, body: body.slice(0, 900) });
  }
  await c.close();
}

// ── Republic sees the new rating ─────────────────────────────────────
{
  const { c, p } = await ctx(b, 'gov-republic');
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', PW, 'gov-republic');
  if (li.ok) {
    rec('D5-ratings-after', {
      shot: await goto(p, `${PORTALS.government}/government/ratings`, 'gov-republic', 'ratings-after-region-rating'),
      body: (await text(p)).slice(0, 800),
    });
    rec('D6-dashboard-after', {
      shot: await goto(p, `${PORTALS.government}/government`, 'gov-republic', 'dashboard-after-region-rating'),
      body: (await text(p)).slice(0, 800),
    });
    rec('D7-auditlog-after', {
      shot: await goto(p, `${PORTALS.government}/government/audit-log`, 'gov-republic', 'audit-log-after'),
      body: (await text(p)).slice(0, 800),
    });
  }
  await c.close();
}

save('p7-reply-rating.json', out);
await b.close();
console.log('P7 DONE');
