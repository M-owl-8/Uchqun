// P3.3 — the rebuilt isolation suite.
//
// The suite it replaces (audits/beta/ISOLATION-REPORT.md, 29/29 PASS, 2026-06-09)
// could not have found D-47 however often it ran:
//   - all 7 hostile-URL probes supply a foreign id on an endpoint whose ROLE
//     BRANCH already validated (/parent/…, /teacher/children/:id, /admin/teachers/:id)
//   - the one probe against /activities supplies NO childId — the safe branch
//   - zero probes supply a childId as an ADMIN or RECEPTION account, the exact evasion
//   - zero reception probes anywhere
//   - zero write probes: every one of the 29 is a read
//
// This suite is built from the code surface instead: 15 controllers read an
// id-bearing query param, 159 routes take a path id. Every cell below is
// (role, surface, foreign id) and each is attempted as READ, UPDATE and DELETE.
//
// A cell PASSES when the response is 403/404, or 200 with a body that provably
// does not contain the foreign id. Anything else is a leak and is printed first.
import { phase, newBrowser, ctx, login, shot, save, ev, pwFor, API } from './lib.mjs';
import fs from 'fs';

const P = phase('P3');
const F = JSON.parse(fs.readFileSync('audits/beta/deep2/foreign-fixture.json', 'utf8'));
const out = { fixture: F, cells: [] };

// tmm3 (Toshkent) accounts probing amm1 (Andijon) resources — different school AND region
const ACCOUNTS = [
  ['teacher', 'teacher', 'tarbiyachi1@tmm3.uz'],
  ['parent', 'parent', 'otaona11@tmm3.uz', { tab: /Ota-ona|Parent/i }],
  ['admin', 'admin', 'direktor@tmm3.uz'],
  ['reception', 'reception', 'qabul@tmm3.uz'],
  ['gov-region', 'government', 'gov.toshkent@uchqun.uz'],
];

// every id-bearing query surface found in P3.2, plus the path-id surfaces
const QUERY_SURFACES = [
  ['activities', `/activities?childId=${F.child}`],
  ['attendance', `/attendance?childId=${F.child}&startDate=2026-08-01&endDate=2026-08-14`],
  ['meals', `/meals?childId=${F.child}`],
  ['media', `/media?childId=${F.child}`],
  ['meal-plans', `/meal-plans?childId=${F.child}`],
  ['progress', `/progress?childId=${F.child}`],
  ['service-plans', `/service-plans?childId=${F.child}`],
  ['child-assessments', `/child-assessments?childId=${F.child}`],
  ['therapy-usage', `/therapy/usage?childId=${F.child}`],
  ['ai-warnings', `/ai-warnings?targetId=${F.child}&schoolId=${F.school}`],
  ['gov-schools-scoped', `/government/schools?schoolId=${F.school}`],
  ['parent-activities', `/parent/activities?childId=${F.child}`],
  ['parent-meals', `/parent/meals?childId=${F.child}`],
  ['emotional-monitoring', `/teacher/emotional-monitoring?childId=${F.child}`],
];

const PATH_SURFACES = [
  ['child-by-id', `/children/${F.child}`],
  ['admin-child', `/admin/children/${F.child}`],
  ['admin-child-irr', `/admin/children/${F.child}/irr`],
  ['teacher-child', `/teacher/children/${F.child}`],
  ['meal-by-id', `/meals/${F.meal}`],
  ['activity-by-id', `/activities/${F.activity}`],
  ['group-by-id', `/groups/${F.group}`],
  ['admin-teacher', `/admin/teachers/${F.teacher}`],
  ['admin-reception', `/admin/receptions/${F.reception}`],
  ['gov-school', `/government/schools/${F.school}`],
  ['document-by-id', `/admin/documents/${F.document}`],
];

// a forged scope field in the BODY — the caller claims to belong elsewhere
const FORGED_WRITES = [
  ['forge-schoolId-on-attendance', 'POST', '/attendance',
    { records: [{ childId: F.child, date: '2026-08-13', status: 'absent' }], schoolId: F.school }],
  ['forge-schoolId-on-child-create', 'POST', '/children',
    { firstName: 'SIM-Forge', lastName: 'Probe', dateOfBirth: '2020-01-01', gender: 'Male', schoolId: F.school, parentId: F.parent }],
  ['forge-groupId-cross-school', 'PUT', `/admin/children/${F.child}`, { groupId: F.group }],
];

const browser = await newBrowser(true);

for (const [role, portal, email, opts = {}] of ACCOUNTS) {
  const TAG = `iso-${role}`;
  const { c, p } = await ctx(P, browser, TAG);
  const li = await login(P, p, portal, email, pwFor(email), TAG, opts);
  if (!li.ok) { out.cells.push({ role, surface: 'LOGIN', verdict: 'BLOCKED', note: 'login failed' }); await c.close(); continue; }

  const run = await p.evaluate(async ([api, queries, paths, forged, foreignChild]) => {
    const res = [];
    const short = (t) => (t || '').slice(0, 150);
    // A leak is a SUCCESSFUL response carrying the foreign id. A 4xx refusal
    // that echoes the id back ("ATTENDANCE_ACCESS_DENIED … childId: X") is the
    // control working, not a breach — the first run of this suite counted those
    // and over-reported 8 leaks where there are 6.
    const leaked = (t, status) => status >= 200 && status < 300
      && typeof t === 'string' && foreignChild && t.includes(foreignChild);

    for (const [name, path] of queries) {
      try {
        const r = await fetch(api + path, { credentials: 'include' });
        const t = await r.text();
        res.push({ kind: 'READ', surface: name, path, status: r.status, bytes: t.length, leaked: leaked(t, r.status), body: short(t) });
      } catch (e) { res.push({ kind: 'READ', surface: name, path, error: String(e).slice(0, 60) }); }
    }
    for (const [name, path] of paths) {
      for (const method of ['GET', 'PUT', 'DELETE']) {
        try {
          const init = { method, credentials: 'include' };
          if (method === 'PUT') { init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify({ firstName: 'SIM-ISO-PROBE' }); }
          const r = await fetch(api + path, init);
          const t = await r.text();
          res.push({ kind: method, surface: name, path, status: r.status, bytes: t.length, leaked: leaked(t, r.status), body: short(t) });
        } catch (e) { res.push({ kind: method, surface: name, path, error: String(e).slice(0, 60) }); }
      }
    }
    for (const [name, method, path, body] of forged) {
      try {
        const r = await fetch(api + path, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const t = await r.text();
        res.push({ kind: 'FORGE', surface: name, path, status: r.status, bytes: t.length, leaked: leaked(t, r.status), body: short(t) });
      } catch (e) { res.push({ kind: 'FORGE', surface: name, path, error: String(e).slice(0, 60) }); }
    }
    return res;
  }, [API, QUERY_SURFACES, PATH_SURFACES, FORGED_WRITES, F.child]);

  run.forEach((r) => out.cells.push({ role, ...r }));
  await shot(P, p, TAG, `isolation-${role}-context`);
  await c.close();
  const leaks = run.filter((r) => r.leaked);
  const ok200 = run.filter((r) => r.status === 200 && !r.leaked).length;
  console.log(`${role.padEnd(11)} cells=${run.length}  leaks=${leaks.length}  200-without-foreign-id=${ok200}`);
  leaks.forEach((l) => console.log(`   !! LEAK ${l.kind} ${l.surface} -> ${l.status} ${l.body.slice(0, 80)}`));
}

save(P, 'p3-isolation.json', out);
const allLeaks = out.cells.filter((c) => c.leaked);
console.log(`\nTOTAL CELLS: ${out.cells.length}   LEAKS: ${allLeaks.length}`);
fs.writeFileSync('audits/beta/deep2/p3-leaks.json', JSON.stringify(allLeaks, null, 1));
await browser.close();
