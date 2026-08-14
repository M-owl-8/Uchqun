// P6 — R2 part 3: reception daily workflow, admin approval action, and the
// full cross-role chain school → region → republic (and the reply hop back).
import { newBrowser, ctx, login, shot, goto, save, ev, text, PORTALS, PW, RUN } from './lib.mjs';

const SMM2 = '5334e23c-a749-4808-8b9a-1f8c67aa1938';
const b = await newBrowser(true);
const out = {};
const SUBJ = 'SIM-Escalation-01 davomat masalasi';
function rec(k, v) { out[k] = v; ev({ kind: 'workflow', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 260)); }

// ── A. Reception daily workflow ──────────────────────────────────────
{
  const { c, p } = await ctx(b, 'reception-smm2');
  const li = await login(p, 'reception', 'reception4@uchqun.uz', PW, 'reception-smm2');
  if (li.ok) {
    rec('A1-dashboard', { shot: await goto(p, `${PORTALS.reception}/reception`, 'reception-smm2', 'daily-dashboard') });
    try {
      await goto(p, `${PORTALS.reception}/reception/documents`, 'reception-smm2', 'documents-before-upload');
      await p.locator('select').first().selectOption('license');
      await p.waitForTimeout(600);
      await p.locator('input[type="file"]').first().setInputFiles(`${RUN}/sim-document.pdf`);
      await p.waitForTimeout(1500);
      await shot(p, 'reception-smm2', 'document-selected');
      await p.waitForTimeout(6000);
      const f = await shot(p, 'reception-smm2', 'document-uploaded');
      rec('A2-upload-document', { shot: f, body: (await text(p)).slice(0, 600) });
    } catch (e) { rec('A2-upload-document', { error: e.message }); }
    rec('A3-parents', { shot: await goto(p, `${PORTALS.reception}/reception/parents`, 'reception-smm2', 'parents-daily-review') });
    rec('A4-groups', { shot: await goto(p, `${PORTALS.reception}/reception/groups`, 'reception-smm2', 'groups-daily-review') });
  }
  await c.close();
}

// ── B. Admin: approval action + escalation to government ─────────────
{
  const { c, p } = await ctx(b, 'admin-smm2');
  const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, 'admin-smm2');
  if (li.ok) {
    try {
      await goto(p, `${PORTALS.admin}/admin/documents`, 'admin-smm2', 'document-approval-queue');
      const body = await text(p);
      const approve = p.locator('button', { hasText: /Tasdiqlash|Approve/ });
      const n = await approve.count();
      let f = null;
      if (n) {
        await approve.first().click();
        await p.waitForTimeout(2000);
        await shot(p, 'admin-smm2', 'document-approve-clicked');
        const yes = p.locator('button', { hasText: /Tasdiqlash|Ha|Approve/ }).last();
        await yes.click().catch(() => {});
        await p.waitForTimeout(5000);
        f = await shot(p, 'admin-smm2', 'document-approved');
      }
      rec('B1-approve-document', { approveButtons: n, shot: f, queueBody: body.slice(0, 700), after: (await text(p)).slice(0, 500) });
    } catch (e) { rec('B1-approve-document', { error: e.message }); }

    try {
      await goto(p, `${PORTALS.admin}/admin/messages`, 'admin-smm2', 'gov-messages-before');
      await p.locator('button', { hasText: 'Yangi xabar' }).first().click();
      await p.waitForTimeout(1800);
      await p.locator('input[placeholder="Mavzuni kiriting"]').fill(SUBJ);
      await p.locator('textarea[placeholder="Xabaringizni kiriting"]').fill(
        'SIM-Escalation-01 — Samarqand Maxsus Maktab 2: 2026-08-08..14 davomat yozuvlari bo\'yicha viloyat nazoratiga murojaat.');
      await shot(p, 'admin-smm2', 'gov-message-compose-filled');
      await p.locator('button', { hasText: 'Yuborish' }).first().click();
      await p.waitForTimeout(1200);
      await shot(p, 'admin-smm2', 'gov-message-1s-after-send');
      await p.waitForTimeout(5000);
      const f = await shot(p, 'admin-smm2', 'gov-message-sent');
      rec('B2-message-to-government', { subject: SUBJ, shot: f, body: (await text(p)).slice(0, 600) });
    } catch (e) { rec('B2-message-to-government', { error: e.message }); }

    rec('B3-activity-feed', { shot: await goto(p, `${PORTALS.admin}/admin/activity`, 'admin-smm2', 'activity-feed-after-actions') });
    out['B3-activityBody'] = null;
  }
  await c.close();
}

// ── C. Government region (Samarqand) — reads across schools, replies ─
{
  const { c, p } = await ctx(b, 'gov-region-samarqand');
  const li = await login(p, 'government', 'gov.samarqand@uchqun.uz', PW, 'gov-region-samarqand');
  if (li.ok) {
    rec('C1-schools-across-region', {
      shot: await goto(p, `${PORTALS.government}/government/schools`, 'gov-region-samarqand', 'schools-across-region'),
      body: (await text(p)).slice(0, 600),
    });
    rec('C1b-students-across-region', {
      shot: await goto(p, `${PORTALS.government}/government/students`, 'gov-region-samarqand', 'students-across-region'),
      body: (await text(p)).slice(0, 600),
    });
    try {
      await goto(p, `${PORTALS.government}/government/platform`, 'gov-region-samarqand', 'platform-default');
      await p.locator('button', { hasText: 'Xabarlar' }).first().click();
      await p.waitForTimeout(4000);
      const body = await text(p);
      const f = await shot(p, 'gov-region-samarqand', 'messages-sees-school-escalation');
      const seen = body.includes('SIM-Escalation-01');
      let f2 = null;
      if (seen) {
        await p.locator('button, div', { hasText: 'SIM-Escalation-01' }).first().click().catch(() => {});
        await p.waitForTimeout(2500);
        await shot(p, 'gov-region-samarqand', 'message-opened');
        const ta = p.locator('textarea');
        if (await ta.count()) {
          await ta.first().fill('SIM-Escalation-01-REPLY — viloyat nazorati qabul qildi, 2026-08-14.');
          await shot(p, 'gov-region-samarqand', 'message-reply-typed');
          await p.locator('button', { hasText: /Yuborish|Javob/ }).last().click();
          await p.waitForTimeout(5000);
          f2 = await shot(p, 'gov-region-samarqand', 'message-reply-sent');
        }
      }
      rec('C2-region-sees-and-replies', { escalationVisible: seen, shots: [f, f2], body: body.slice(0, 700) });
    } catch (e) { rec('C2-region-sees-and-replies', { error: e.message }); }

    // regional write: rate smm2
    try {
      await goto(p, `${PORTALS.government}/government/schools/${SMM2}`, 'gov-region-samarqand', 'school-detail-before-rating');
      const rateBtn = p.locator('button', { hasText: /Baholash|Reyting|Baho/ });
      let f = null;
      if (await rateBtn.count()) {
        await rateBtn.first().click();
        await p.waitForTimeout(2500);
        await shot(p, 'gov-region-samarqand', 'rating-dialog-open');
        const stars = p.locator('button', { hasText: /^5$/ });
        for (let i = 0; i < Math.min(await stars.count(), 8); i++) await stars.nth(i).click().catch(() => {});
        const ta = p.locator('textarea');
        if (await ta.count()) await ta.first().fill('SIM- viloyat bahosi, beta simulyatsiya 2026-08-14.');
        await shot(p, 'gov-region-samarqand', 'rating-filled');
        await p.locator('button', { hasText: /Saqlash|Yuborish|Baholash/ }).last().click();
        await p.waitForTimeout(5000);
        f = await shot(p, 'gov-region-samarqand', 'rating-submitted');
      }
      rec('C3-region-rates-school', { rateButtons: await rateBtn.count(), shot: f, body: (await text(p)).slice(0, 500) });
    } catch (e) { rec('C3-region-rates-school', { error: e.message }); }
  }
  await c.close();
}

// ── D. Government republic — reads across regions ────────────────────
{
  const { c, p } = await ctx(b, 'gov-republic');
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', PW, 'gov-republic');
  if (li.ok) {
    rec('D1-dashboard-across-regions', {
      shot: await goto(p, `${PORTALS.government}/government`, 'gov-republic', 'dashboard-across-regions'),
      body: (await text(p)).slice(0, 800),
    });
    try {
      await goto(p, `${PORTALS.government}/government/platform`, 'gov-republic', 'platform-default');
      await p.locator('button', { hasText: 'Xabarlar' }).first().click();
      await p.waitForTimeout(4000);
      const body = await text(p);
      const f = await shot(p, 'gov-republic', 'messages-republic-view');
      rec('D2-republic-sees-escalation', { escalationVisible: body.includes('SIM-Escalation-01'), shot: f, body: body.slice(0, 700) });
    } catch (e) { rec('D2-republic-sees-escalation', { error: e.message }); }
    rec('D3-ratings-across-regions', {
      shot: await goto(p, `${PORTALS.government}/government/ratings`, 'gov-republic', 'ratings-across-regions'),
      body: (await text(p)).slice(0, 600),
    });
    rec('D4-audit-log', {
      shot: await goto(p, `${PORTALS.government}/government/audit-log`, 'gov-republic', 'audit-log-after-actions'),
      body: (await text(p)).slice(0, 800),
    });
  }
  await c.close();
}

// ── E. Admin sees the government reply ───────────────────────────────
{
  const { c, p } = await ctx(b, 'admin-smm2');
  const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, 'admin-smm2');
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin/messages`, 'admin-smm2', 'gov-messages-reply-check');
    const body = await text(p);
    let f = null;
    try {
      await p.locator('button', { hasText: 'SIM-Escalation-01' }).first().click();
      await p.waitForTimeout(2500);
      f = await shot(p, 'admin-smm2', 'gov-message-thread-with-reply');
    } catch { /* no thread */ }
    rec('E-admin-sees-reply', {
      replyVisible: (await text(p)).includes('SIM-Escalation-01-REPLY'), shot: f, body: body.slice(0, 600),
      threadBody: (await text(p)).slice(0, 800),
    });
  }
  await c.close();
}

save('p6-workflow.json', out);
await b.close();
console.log('P6 DONE');
