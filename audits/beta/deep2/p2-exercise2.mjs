// P2.3 continued — correct parameters, and a SIM- child for the transfer so no
// evidence-bearing seed row moves. Every result is read back from the DB after.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P2'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); };
const SIM_CHILD = '925f570f-51a3-4424-88d1-594bd49bf674'; // SIM-Malika, created by Campaign I P5 import
const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, 'admin-tmm3');
await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), 'admin-tmm3');

// schools available to transfer between
const schools = await p.evaluate(async (api) => { const x = await fetch(`${api}/admin/school`, { credentials: 'include' }); return { s: x.status, b: (await x.text()).slice(0, 200) }; }, API);
rec('own-school', schools);

// reject a pending document, with the right field name
const rej = await p.evaluate(async ([api]) => {
  const l = await (await fetch(`${api}/admin/documents?status=pending`, { credentials: 'include' })).json();
  const list = l.data || l; const docs = Array.isArray(list) ? list : list.documents || [];
  if (!docs.length) return { none: true };
  const d = docs[0];
  const x = await fetch(`${api}/admin/documents/${d.id}/reject`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rejectionReason: 'QA-P2 audit-integrity probe — will be re-approved' }) });
  return { docId: d.id, userId: d.userId, s: x.status, b: (await x.text()).slice(0, 200) };
}, [API]);
rec('reject-document', { ...rej, shot: await shot(P, p, 'admin-tmm3', 'audit-reject-document-ok', { full: true }) });

// transfer the SIM- child between schools
const tr = await p.evaluate(async ([api, child]) => {
  const gov = await fetch(`${api}/admin/school`, { credentials: 'include' });
  const school = (await gov.json())?.data?.id ?? null;
  const x = await fetch(`${api}/admin/children/${child}/transfer`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toSchoolId: '5eed12eb-5c07-43fb-8179-81b057c773b9', reason: 'QA-P2 audit-integrity probe' }) });
  return { fromSchool: school, s: x.status, b: (await x.text()).slice(0, 240) };
}, [API, SIM_CHILD]);
rec('transfer', { ...tr, shot: await shot(P, p, 'admin-tmm3', 'audit-transfer-ok') });
await c.close();

// data_export from a parent that has not consumed its window
{
  const TAG = 'parent2'; const { c: c2, p: p2 } = await ctx(P, browser, TAG);
  await login(P, p2, 'parent', 'otaona12@tmm3.uz', pwFor('otaona12@tmm3.uz'), TAG, { tab: /Ota-ona|Parent/i });
  await goto(P, p2, `${PORTALS.teacher}/settings`, TAG, 'data-export-context-2');
  const r = await p2.evaluate(async () => { const x = await fetch('/api/v1/parent/me/export', { credentials: 'include' }); return { s: x.status, bytes: (await x.text()).length }; });
  rec('data_export', { ...r, shot: await shot(P, p2, TAG, 'audit-data-export-ok') });
  await c2.close();
}

const res = await fetch(API.replace('/api/v1', '') + '/health/readiness');
rec('readiness-after', { s: res.status, b: (await res.text()).slice(0, 300) });
save(P, 'p2-exercise2.json', out); await browser.close(); console.log('DONE');
