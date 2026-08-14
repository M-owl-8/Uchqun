// P2 — full route sweep (READ ONLY). Every route from the R0.5 inventory, per role.
// Baseline "before" state for the write phase, and the coverage ledger source.
import { newBrowser, ctx, login, goto, text, save, ev, PORTALS, PW } from './lib.mjs';

const SCHOOL = '5334e23c-a749-4808-8b9a-1f8c67aa1938';   // Samarqand Maxsus Maktab 2
const CHILD = '78d1f578-956c-42c7-81f5-9eafc994219b';    // Sanjar Yusupov (A-guruh)
const TEACHER7 = '56009e7e-1420-451d-8bd9-91f03249d86e';
const ADMIN4 = '9b01fa07-4570-41e1-a322-fe128fe0b1da';

const G = PORTALS.government, A = PORTALS.admin, T = PORTALS.teacher, R = PORTALS.reception;

const PLAN = [
  {
    tag: 'gov-republic', portal: 'government', email: 'gov.republic@uchqun.uz',
    routes: [
      ['/government', 'dashboard'],
      ['/government/schools', 'schools'],
      [`/government/schools/${SCHOOL}`, 'school-detail-smm2'],
      ['/government/students', 'students'],
      [`/government/children/${CHILD}`, 'child-detail'],
      ['/government/teachers', 'teachers'],
      ['/government/parents', 'parents'],
      ['/government/ratings', 'ratings'],
      ['/government/platform', 'platform'],
      ['/government/profile', 'profile'],
      ['/government/settings', 'settings'],
      [`/government/admin/${ADMIN4}`, 'admin-details'],
      ['/government/warnings', 'ai-warnings'],
      ['/government/audit-log', 'audit-log'],
      ['/government/change-password', 'change-password'],
      ['/government/zzz-nonexistent', 'notfound'],
    ], base: G,
  },
  {
    tag: 'gov-region-samarqand', portal: 'government', email: 'gov.samarqand@uchqun.uz',
    routes: [
      ['/government', 'dashboard'],
      ['/government/schools', 'schools'],
      [`/government/schools/${SCHOOL}`, 'school-detail-smm2'],
      ['/government/students', 'students'],
      ['/government/teachers', 'teachers'],
      ['/government/parents', 'parents'],
      ['/government/ratings', 'ratings'],
      ['/government/platform', 'platform'],
      ['/government/settings', 'settings'],
      ['/government/audit-log', 'audit-log'],
      ['/government/warnings', 'ai-warnings'],
      ['/government/profile', 'profile'],
    ], base: G,
  },
  {
    tag: 'admin-smm2', portal: 'admin', email: 'admin4@uchqun.uz',
    routes: [
      ['/admin', 'dashboard'],
      ['/admin/receptions', 'receptions'],
      ['/admin/parents', 'parents'],
      ['/admin/teachers', 'teachers'],
      [`/admin/teachers/${TEACHER7}`, 'teacher-detail'],
      ['/admin/groups', 'groups'],
      ['/admin/school-ratings', 'school-ratings'],
      ['/admin/profile', 'profile'],
      ['/admin/settings', 'settings'],
      ['/admin/documents', 'documents-queue'],
      ['/admin/ai-warnings', 'ai-warnings'],
      ['/admin/therapy', 'therapy'],
      ['/admin/import', 'bulk-import'],
      ['/admin/school', 'school-profile'],
      ['/admin/activity', 'activity-feed'],
      [`/admin/children/${CHILD}`, 'child-detail'],
      ['/admin/communications', 'communications'],
      ['/admin/trash', 'trash'],
      ['/admin/messages', 'gov-messages'],
      ['/admin/irr', 'irr'],
      ['/admin/change-password', 'change-password'],
      ['/admin/zzz-nonexistent', 'notfound'],
    ], base: A,
  },
  {
    tag: 'reception-smm2', portal: 'reception', email: 'reception4@uchqun.uz',
    routes: [
      ['/reception', 'dashboard'],
      ['/reception/parents', 'parents'],
      ['/reception/parents/new', 'parent-wizard'],
      ['/reception/teachers', 'teachers'],
      ['/reception/groups', 'groups'],
      ['/reception/documents', 'documents'],
      ['/reception/settings', 'settings'],
      ['/reception/profile', 'profile'],
      ['/reception/wizard/complete', 'wizard-complete'],
      ['/reception/change-password', 'change-password'],
      ['/reception/zzz-nonexistent', 'notfound'],
    ], base: R,
  },
  {
    tag: 'teacher-smm2', portal: 'teacher', email: 'teacher7@uchqun.uz',
    routes: [
      ['/teacher', 'dashboard'],
      ['/teacher/bolalar', 'bolalar'],
      ['/teacher/reja?tab=activities', 'reja-activities'],
      ['/teacher/reja?tab=therapy', 'reja-therapy'],
      ['/teacher/reja?tab=monitoring', 'reja-monitoring'],
      ['/teacher/xabar?tab=chat', 'xabar-chat'],
      ['/teacher/xabar?tab=warnings', 'xabar-warnings'],
      ['/teacher/men?tab=profile', 'men-profile'],
      ['/teacher/men?tab=settings', 'men-settings'],
      ['/teacher/men?tab=reflection', 'men-reflection'],
      ['/teacher/attendance', 'attendance'],
      ['/teacher/meals', 'meals'],
      ['/teacher/media', 'media'],
      ['/teacher/monitoring', 'monitoring-journal'],
      [`/teacher/children/${CHILD}`, 'child-detail'],
      [`/teacher/children/${CHILD}/irr`, 'child-irr'],
      ['/teacher/parents', 'redirect-parents'],
      ['/teacher/profile', 'redirect-profile'],
      ['/teacher/settings', 'redirect-settings'],
      ['/teacher/reflection', 'redirect-reflection'],
      ['/teacher/activities', 'redirect-activities'],
      ['/teacher/therapy', 'redirect-therapy'],
      ['/teacher/chat', 'redirect-chat'],
      ['/teacher/warnings', 'redirect-warnings'],
      ['/teacher/ai-warnings', 'redirect-ai-warnings'],
      ['/teacher/change-password', 'change-password'],
      ['/teacher/zzz-nonexistent', 'notfound'],
    ], base: T,
  },
  {
    tag: 'parent-smm2', portal: 'parent', email: 'parent10@uchqun.uz',
    tab: /Ota-ona|Parent|Родител/i,
    routes: [
      ['/', 'dashboard'],
      ['/child', 'child-profile'],
      ['/activities', 'activities'],
      ['/meals', 'meals'],
      ['/media', 'media'],
      ['/chat', 'chat'],
      ['/notifications', 'notifications'],
      ['/help', 'help'],
      ['/rating', 'teacher-rating'],
      ['/settings', 'settings'],
      ['/therapy', 'therapy'],
      ['/irr', 'irr'],
      ['/attendance', 'attendance'],
      ['/journal', 'journal'],
      ['/change-password', 'change-password'],
      ['/zzz-nonexistent', 'notfound'],
    ], base: T,
  },
];

const b = await newBrowser(true);
const ledger = [];
for (const role of PLAN) {
  const { c, p } = await ctx(b, role.tag);
  const li = await login(p, role.portal, role.email, PW, role.tag, { tab: role.tab });
  ledger.push({ role: role.tag, route: '/login', action: 'login', shot: li.shot, ok: li.ok, landing: li.landing });
  if (!li.ok) { console.log(`!! ${role.tag} LOGIN FAILED`); await c.close(); continue; }
  for (const [r, action] of role.routes) {
    const f = await goto(p, role.base + r, role.tag, action);
    const body = (await text(p)).slice(0, 400);
    ledger.push({ role: role.tag, route: r, action, shot: f, url: p.url(), head: body });
    console.log(`${role.tag} ${r} -> ${f}`);
  }
  await c.close();
}
save('p2-sweep.json', ledger);
await b.close();
console.log('P2 DONE');
