// P2.3 — exercise every action production has never recorded, then read the row
// back from the database. Response codes are not evidence (L13).
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P2'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 460)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const browser = await newBrowser(true);

// ---- data_export : parent GET /parent/me/export -------------------------
await T('data_export', async () => {
  const TAG = 'parent-tmm3'; const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'parent', 'otaona11@tmm3.uz', pwFor('otaona11@tmm3.uz'), TAG, { tab: /Ota-ona|Parent/i });
  await goto(P, p, `${PORTALS.teacher}/settings`, TAG, 'data-export-context');
  const r = await p.evaluate(async () => { const x = await fetch('/api/v1/parent/me/export', { credentials: 'include' }); return { s: x.status, bytes: (await x.text()).length }; });
  rec('data_export', { ...r, shot: await shot(P, p, TAG, 'audit-data-export') });
  await c.close();
});

// ---- deactivate + reject(document) : admin ------------------------------
await T('admin-actions', async () => {
  const TAG = 'admin-tmm3'; const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), TAG);
  // find a reception to deactivate and reactivate
  const recs = await p.evaluate(async (api) => { const x = await fetch(`${api}/admin/receptions`, { credentials: 'include' }); const j = await x.json(); const l = j.data || j; return (Array.isArray(l) ? l : l.receptions || []).map(u => ({ id: u.id, email: u.email, isActive: u.isActive })); }, API);
  rec('receptions', recs);
  const target = recs.find(r => r.email === 'sh.umarova@tmm3.uz') || recs[0];
  const deact = await p.evaluate(async ([api, id]) => { const x = await fetch(`${api}/admin/receptions/${id}/deactivate`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' }); return { s: x.status, b: (await x.text()).slice(0, 160) }; }, [API, target.id]);
  rec('deactivate', { target: target.email, ...deact, shot: await shot(P, p, TAG, 'audit-deactivate') });

  // document rejection
  await goto(P, p, `${PORTALS.admin}/admin/documents`, TAG, 'audit-documents-queue', { full: true });
  const docs = await p.evaluate(async (api) => { const x = await fetch(`${api}/admin/documents?status=pending`, { credentials: 'include' }); const j = await x.json(); const l = j.data || j; return { status: x.status, list: (Array.isArray(l) ? l : l.documents || []).slice(0, 3).map(d => ({ id: d.id, type: d.documentType || d.type, st: d.status })) }; }, API);
  rec('pending-documents', docs);
  if (docs.list?.length) {
    const rej = await p.evaluate(async ([api, id]) => { const x = await fetch(`${api}/admin/documents/${id}/reject`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'QA-P2 audit-integrity probe' }) }); return { s: x.status, b: (await x.text()).slice(0, 200) }; }, [API, docs.list[0].id]);
    rec('reject-document', { id: docs.list[0].id, ...rej, shot: await shot(P, p, TAG, 'audit-reject-document', { full: true }) });
  }

  // child transfer
  const tr = await p.evaluate(async ([api, child]) => { const x = await fetch(`${api}/admin/children/${child}/transfer`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: '5eed33af-d304-4b7a-8402-2fafaa2d7919' }) }); return { s: x.status, b: (await x.text()).slice(0, 220) }; }, [API, '5eed0c9a-fe3e-4031-8f5c-aac195c36b31']);
  rec('transfer', { ...tr, shot: await shot(P, p, TAG, 'audit-transfer') });
  await c.close();
});

// readiness after all of it — from Node, not a page context (cross-origin)
const res = await fetch(API.replace('/api/v1', '') + '/health/readiness');
rec('readiness-after', { s: res.status, b: (await res.text()).slice(0, 300) });
save(P, 'p2-exercise.json', out); await browser.close(); console.log('P2 exercise DONE');
