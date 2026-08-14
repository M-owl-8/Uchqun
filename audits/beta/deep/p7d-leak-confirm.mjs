// P7d — confirm the cross-tenant read leak precisely, and re-run the teacher and
// parent probes through the portal-relative path (their cookies do not travel to
// the absolute backend origin from a page context, which made P7c inconclusive).
import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P7'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7d', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 700)); };
const FOREIGN_CHILD = '5eed7fed-b5ea-4db5-8ab7-b60720996a30';   // Oysha Abdullayeva, amm1 (Andijon)
const FOREIGN_SCHOOL = '5eedd611-e85e-477e-875a-56e0fa6d93fd';
const HOME_SCHOOL = '5eedd253-e422-44d5-82a8-a37d03df93dd';     // tmm3 (Toshkent)
const browser = await newBrowser(true);

const probe = (paths) => (p) => p.evaluate(async (ps) => {
  const res = [];
  for (const [label, path] of ps) {
    const r = await fetch(path, { credentials: 'include' });
    const t = await r.text();
    res.push({ label, path, status: r.status, len: t.length, body: t.slice(0, 300) });
  }
  return res;
}, paths);

const READS = [
  ['activities', `/api/v1/activities?childId=${FOREIGN_CHILD}`],
  ['meals', `/api/v1/meals?childId=${FOREIGN_CHILD}`],
  ['media', `/api/v1/media?childId=${FOREIGN_CHILD}`],
  ['attendance', `/api/v1/attendance?childId=${FOREIGN_CHILD}&startDate=2026-08-01&endDate=2026-08-14`],
  ['therapy usage', `/api/v1/therapy/usage?childId=${FOREIGN_CHILD}`],
  ['monitoring', `/api/v1/teacher/emotional-monitoring?childId=${FOREIGN_CHILD}`],
];

for (const [tag, portal, email, opts] of [
  ['admin-tmm3', 'admin', 'direktor@tmm3.uz', {}],
  ['reception-tmm3', 'reception', 'qabul@tmm3.uz', {}],
  ['teacher-tmm3', 'teacher', 'tarbiyachi1@tmm3.uz', {}],
  ['parent-tmm3', 'parent', 'otaona11@tmm3.uz', { tab: /Ota-ona|Parent/i }],
]) {
  const { c, p } = await ctx(P, browser, tag);
  const li = await login(P, p, portal, email, PW, tag, opts);
  if (!li.ok) { rec(`leak-${tag}`, { loginFailed: true }); await c.close(); continue; }
  // land on an in-app page so relative fetches hit the portal's own proxy
  await goto(P, p, `${PORTALS[portal]}/`, tag, `leak-probe-${tag}`);
  const reads = await probe(READS)(p);
  const leaked = reads.filter((r) => r.status === 200 && r.body.includes(FOREIGN_CHILD));
  rec(`leak-${tag}`, {
    home: HOME_SCHOOL, foreignChild: FOREIGN_CHILD, foreignSchool: FOREIGN_SCHOOL,
    reads: reads.map((r) => ({ label: r.label, status: r.status, len: r.len, containsForeignChildId: r.body.includes(FOREIGN_CHILD), body: r.body.slice(0, 200) })),
    LEAKED: leaked.map((l) => l.label),
  });
  if (leaked.length) await shot(P, p, tag, `D-47-cross-tenant-leak-${tag}`, { defect: 'D-47' });
  await c.close();
}
save(P, 'p7d.json', out); await browser.close(); console.log('P7d DONE');
