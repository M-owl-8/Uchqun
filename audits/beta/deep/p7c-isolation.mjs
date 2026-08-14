// P7c — tenant isolation across the six-school seed, re-derived rather than
// cited. Every probe: log in as an account of school A, then ask the API for a
// resource that belongs to school B, by id.
import { phase, newBrowser, ctx, login, shot, save, ev, PORTALS, PW, API } from './lib.mjs';

const P = phase('P7');
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7c', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); };

// resolved from the seed in P1 / verified in P3-P5
const TMM3 = {
  school: '5eedd253-e422-44d5-82a8-a37d03df93dd',
  child: '5eed0c9a-fe3e-4031-8f5c-aac195c36b31',
  parent: '5eed7bf3-ed3a-4548-8e59-099dd6737ea2',
  teacher: '5eedf422-4935-4657-84ed-b36e12f3f190',
  group: '5eed2a08-5b27-4b7e-83dc-43d9f7b3c9f8',
  irr: '5eedf307-681f-48a5-8d31-857cadd4a9d6',
};

const browser = await newBrowser(true);

// resolve a foreign (smm3 / amm1) child, teacher and group via the republic account
let FOREIGN = null;
{
  const { c, p } = await ctx(P, browser, 'gov-republic');
  await login(P, p, 'government', 'gov.republic@uchqun.uz', PW, 'gov-republic');
  FOREIGN = await p.evaluate(async (api) => {
    const j = async (u) => { const r = await fetch(api + u, { credentials: 'include' }); return r.ok ? r.json() : null; };
    const schools = (await j('/government/schools?limit=200'))?.data?.schools || [];
    const other = schools.find((s) => s.slug === 'smm3') || schools.find((s) => s.slug === 'amm1');
    if (!other) return null;
    const detail = await j(`/government/schools/${other.id}`);
    const d = detail?.data || {};
    return {
      school: other.id, slug: other.slug, name: other.name,
      child: (d.children || d.students || [])[0]?.id ?? null,
      teacher: (d.teachers || [])[0]?.id ?? null,
    };
  }, API);
  rec('foreign-target', FOREIGN);
  await c.close();
}

// fallback: pull a foreign child straight from the students list
if (!FOREIGN?.child) {
  const { c, p } = await ctx(P, browser, 'gov-republic');
  await login(P, p, 'government', 'gov.republic@uchqun.uz', PW, 'gov-republic');
  const extra = await p.evaluate(async ([api, tmm3]) => {
    const r = await fetch(`${api}/government/students?limit=200`, { credentials: 'include' });
    const j = await r.json();
    const list = j.data?.students || j.data || [];
    const foreign = list.find((s) => s.schoolId && s.schoolId !== tmm3);
    return foreign ? { child: foreign.id, schoolId: foreign.schoolId, name: `${foreign.firstName} ${foreign.lastName}` } : { sample: list.slice(0, 2) };
  }, [API, TMM3.school]);
  rec('foreign-child-fallback', extra);
  if (extra?.child) FOREIGN = { ...(FOREIGN || {}), child: extra.child, school: extra.schoolId };
  await c.close();
}

const PROBES = (F) => [
  ['child by id', `/children/${F.child}`],
  ['child detail (admin path)', `/admin/children/${F.child}`],
  ['child IRR', `/admin/children/${F.child}/irr`],
  ['teacher child list scope', `/teacher/children`],
  ['attendance for foreign child', `/attendance?childId=${F.child}&startDate=2026-08-14&endDate=2026-08-14`],
  ['activities for foreign child', `/activities?childId=${F.child}`],
  ['meals for foreign child', `/meals?childId=${F.child}`],
  ['media for foreign child', `/media?childId=${F.child}`],
  ['foreign school', `/government/schools/${F.school}`],
  ['foreign school admin view', `/admin/school/${F.school}`],
];

const WRITES = (F) => [
  ['POST attendance for foreign child', '/attendance', { records: [{ childId: F.child, date: '2026-08-13', status: 'absent' }] }],
  ['POST journal to foreign child', '/teacher/journal/bulk', { subject: 'QA', body: 'QA', recipientIds: [F.child] }],
];

const ACCOUNTS = [
  ['teacher-tmm3', 'teacher', 'tarbiyachi1@tmm3.uz'],
  ['reception-tmm3', 'reception', 'qabul@tmm3.uz'],
  ['admin-tmm3', 'admin', 'direktor@tmm3.uz'],
  ['parent-tmm3', 'parent', 'otaona11@tmm3.uz'],
];

for (const [tag, portal, email] of ACCOUNTS) {
  const { c, p } = await ctx(P, browser, tag);
  const li = await login(P, p, portal, email, PW, tag, portal === 'parent' ? { tab: /Ota-ona|Parent/i } : {});
  if (!li.ok) { rec(`iso-${tag}`, { loginFailed: true }); await c.close(); continue; }
  const reads = await p.evaluate(async ([api, probes]) => {
    const res = [];
    for (const [label, path] of probes) {
      try {
        const r = await fetch(api + path, { credentials: 'include' });
        const t = await r.text();
        res.push({ label, path, status: r.status, len: t.length, body: t.slice(0, 110) });
      } catch (e) { res.push({ label, path, error: String(e).slice(0, 80) }); }
    }
    return res;
  }, [API, PROBES(FOREIGN)]);
  const writes = await p.evaluate(async ([api, ws]) => {
    const res = [];
    for (const [label, path, body] of ws) {
      try {
        const r = await fetch(api + path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        res.push({ label, status: r.status, body: (await r.text()).slice(0, 130) });
      } catch (e) { res.push({ label, error: String(e).slice(0, 80) }); }
    }
    return res;
  }, [API, WRITES(FOREIGN)]);
  // a leak is any 200 whose body contains the foreign child id
  const leaks = reads.filter((r) => r.status === 200 && FOREIGN.child && r.body && String(r.body).includes(String(FOREIGN.child).slice(0, 8)));
  rec(`iso-${tag}`, { reads, writes, suspectedLeaks: leaks.map((l) => l.label) });
  await shot(P, p, tag, `isolation-probe-context-${tag}`);
  await c.close();
}

save(P, 'p7c.json', out);
await browser.close();
console.log('P7c DONE');
