// W4 — D-04 three hops (school → region reply → school sees it).
// W5 — the buyer demo path end to end.
// W1 — remaining fixes: D-05 audit-log dates, D-10 nav reachability, D-06 upload error.
import { newBrowser, ctx, login, shot, goto, save, ev, text, acceptParentConsent, PORTALS, PW, OLDPW } from './lib.mjs';

const out = {};
const b = await newBrowser(false);
function rec(k, v) { out[k] = v; ev({ kind: 'w45', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 330)); }
const SUBJ = 'Terapiya mashg‘ulotlari uchun qo‘shimcha mutaxassis so‘rovi';
const REPLY = 'So‘rov qabul qilindi. Viloyat bo‘yicha logoped shtati kelgusi chorakda ko‘rib chiqiladi.';

// ── HOP 1: the school asks ───────────────────────────────────────────────────
{
  const tag = 'director-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'admin', 'direktor@tmm3.uz', PW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin/messages`, tag, 'gov-messages-before', { defect: 'D-04' });
    await p.locator('button', { hasText: 'Yangi xabar' }).first().click();
    await p.waitForTimeout(1800);
    await p.locator('input[placeholder="Mavzuni kiriting"]').fill(SUBJ);
    await p.locator('textarea[placeholder="Xabaringizni kiriting"]').fill(
      'Muassasamizda nutq nuqsoni bo‘lgan bolalar soni ortdi. Qo‘shimcha logoped shtati ajratilishini so‘raymiz.');
    await shot(p, tag, 'gov-message-compose', { defect: 'D-04' });
    await p.locator('button', { hasText: 'Yuborish' }).first().click();
    await p.waitForTimeout(5000);
    rec('D-04-hop1-sent', { shot: await shot(p, tag, 'hop1-school-sent-pending', { defect: 'D-04', full: true }), body: (await text(p)).slice(0, 400) });

    // D-10: the admin sidebar must now expose Muassasa / Import / Savatcha / Profil
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
    rec('D-10-admin-nav', {
      shot: await shot(p, tag, 'admin-sidebar-institution-section', { defect: 'D-10', full: true }),
      hasImport: links.includes('/admin/import'), hasTrash: links.includes('/admin/trash'),
      hasSchool: links.includes('/admin/school'), hasProfile: links.includes('/admin/profile'),
      total: links.length,
    });
  }
  await c.close();
}

// ── HOP 2: the region reads it and replies ──────────────────────────────────
{
  const tag = 'gov-toshkent';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'government', 'gov.toshkent@uchqun.uz', OLDPW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.government}/government/platform`, tag, 'platform');
    await p.locator('button', { hasText: 'Xabarlar' }).first().click();
    await p.waitForTimeout(4000);
    rec('D-04-hop2-sees', { shot: await shot(p, tag, 'hop2-region-sees-request', { defect: 'D-04', full: true }), visible: (await text(p)).includes('logoped') });
    await p.locator('button', { hasText: /^Javob$/ }).first().click();
    await p.waitForTimeout(1800);
    await p.locator('textarea[placeholder="Javobingizni yozing..."]').first().fill(REPLY);
    await shot(p, tag, 'hop2-reply-typed', { defect: 'D-04' });
    await p.locator('button[aria-label="Yuborish"]').first().click();
    await p.waitForTimeout(5000);
    rec('D-04-hop2-replied', { shot: await shot(p, tag, 'hop2-region-replied', { defect: 'D-04', full: true }) });

    // D-05: audit log must show dates
    rec('D-05-audit-log', {
      shot: await goto(p, `${PORTALS.government}/government/audit-log`, tag, 'audit-log-dates', { defect: 'D-05', full: true }),
      body: (await text(p)).slice(0, 700),
    });
    // D-10: government nav must now expose Students / Teachers / Parents
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
    rec('D-10-gov-nav', {
      shot: await shot(p, tag, 'gov-sidebar-registers', { defect: 'D-10', full: true }),
      hasStudents: links.includes('/government/students'),
      hasTeachers: links.includes('/government/teachers'),
      hasParents: links.includes('/government/parents'),
      total: links.length,
    });
  }
  await c.close();
}

// ── HOP 3: the school sees the answer ───────────────────────────────────────
{
  const tag = 'director-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'admin', 'direktor@tmm3.uz', PW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin/messages`, tag, 'gov-messages-after');
    try { await p.locator('button', { hasText: 'Terapiya mashg' }).first().click(); await p.waitForTimeout(3000); } catch { /* none */ }
    const body = await text(p);
    rec('D-04-hop3-school-sees-reply', {
      shot: await shot(p, tag, 'hop3-school-sees-reply', { defect: 'D-04', full: true }),
      replyVisible: body.includes('So‘rov qabul qilindi'),
      badgeReplied: body.includes('Javob berildi'),
      body: body.slice(0, 700),
    });
  }
  await c.close();
}

// ── D-06: document upload failure must be legible ───────────────────────────
{
  const tag = 'reception-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'reception', 'qabul@tmm3.uz', PW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.reception}/reception/documents`, tag, 'documents-before', { defect: 'D-06' });
    await p.locator('select').first().selectOption('license');
    await p.waitForTimeout(500);
    await p.locator('input[type="file"]').first().setInputFiles('C:/work/Uchqun/audits/beta/fullrun-2026-08-14/sim-document.pdf');
    await p.waitForTimeout(2500);
    rec('D-06-upload-error', {
      shot: await shot(p, tag, 'document-upload-error-message', { defect: 'D-06', full: true }),
      body: (await text(p)).slice(0, 320),
    });
  }
  await c.close();
}

// ── W5: the buyer demo path, in order ───────────────────────────────────────
const DEMO = [];
{
  const tag = 'demo-gov-republic';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', OLDPW, tag, { shotForm: { defect: 'W5' } });
  DEMO.push(['1 government login', li.ok]);
  if (li.ok) {
    await goto(p, `${PORTALS.government}/government`, tag, 'demo-1-republic-dashboard', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.government}/government/schools`, tag, 'demo-2-all-schools', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.government}/government/students`, tag, 'demo-3-all-students', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.government}/government/ratings`, tag, 'demo-4-ratings', { defect: 'W5', full: true });
    DEMO.push(['republic body', (await text(p)).slice(0, 200)]);
  }
  await c.close();
}
{
  const tag = 'demo-gov-region';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'government', 'gov.toshkent@uchqun.uz', OLDPW, tag);
  DEMO.push(['2 region login', li.ok]);
  if (li.ok) {
    await goto(p, `${PORTALS.government}/government`, tag, 'demo-5-region-dashboard', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.government}/government/schools`, tag, 'demo-6-region-schools', { defect: 'W5', full: true });
    const schools = await p.evaluate(() => [...document.querySelectorAll('a[href^="/government/schools/"]')].map((a) => a.getAttribute('href')));
    if (schools.length) await goto(p, PORTALS.government + schools[0], tag, 'demo-7-school-detail', { defect: 'W5', full: true });
    DEMO.push(['region schools listed', schools.length]);
  }
  await c.close();
}
{
  const tag = 'demo-director';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'admin', 'direktor@tmm3.uz', PW, tag);
  DEMO.push(['3 director login', li.ok]);
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin`, tag, 'demo-8-director-dashboard', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.admin}/admin/teachers`, tag, 'demo-9-director-teachers', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.admin}/admin/activity`, tag, 'demo-10-director-activity', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.admin}/admin/irr`, tag, 'demo-11-director-irr', { defect: 'W5', full: true });
  }
  await c.close();
}
{
  const tag = 'demo-teacher';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, tag);
  DEMO.push(['4 teacher login', li.ok]);
  if (li.ok) {
    await goto(p, `${PORTALS.teacher}/teacher`, tag, 'demo-12-teacher-day', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.teacher}/teacher/bolalar`, tag, 'demo-13-teacher-children', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.teacher}/teacher/reja?tab=activities`, tag, 'demo-14-teacher-plan', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.teacher}/teacher/xabar?tab=chat`, tag, 'demo-15-teacher-chat', { defect: 'W5', full: true });
  }
  await c.close();
}
{
  const tag = 'demo-parent';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'parent', 'otaona11@tmm3.uz', PW, tag, { tab: /Ota-ona|Parent/i });
  DEMO.push(['5 parent login', li.ok]);
  if (li.ok) {
    await acceptParentConsent(p, tag);
    await goto(p, `${PORTALS.teacher}/`, tag, 'demo-16-parent-today', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.teacher}/attendance`, tag, 'demo-17-parent-attendance', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.teacher}/meals`, tag, 'demo-18-parent-meals', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.teacher}/journal`, tag, 'demo-19-parent-journal', { defect: 'W5', full: true });
    await goto(p, `${PORTALS.teacher}/chat`, tag, 'demo-20-parent-chat', { defect: 'W5', full: true });
    // W6 — seeded media as a parent sees it (X-01 gate)
    await goto(p, `${PORTALS.teacher}/media`, tag, 'demo-21-parent-gallery', { defect: 'W6', full: true });
    rec('W6-parent-gallery', { body: (await text(p)).slice(0, 300) });
  }
  await c.close();
}
rec('W5-demo-path', DEMO);

save('w4-w5.json', out);
await b.close();
console.log('W4/W5 DONE');
