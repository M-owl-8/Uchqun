// P2 teardown — reverse the two state changes made to exercise audit actions.
// Done through the API so the reversal is itself audited, then read back.
import { phase, newBrowser, ctx, login, save, ev, pwFor, API } from './lib.mjs';
const P = phase('P2'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2-restore', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, 'admin-tmm3');
await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), 'admin-tmm3');
// the child is now at smm3; only that school's admin can move it back, so use
// the government/republic path is unavailable — do it directly and disclose.
rec('note', 'SIM-Malika sits at smm3 after the transfer probe; the tmm3 admin cannot transfer a child it no longer owns. Restored by direct SQL in the same phase, disclosed in the artifact.');
// re-approve the document we rejected
const app = await p.evaluate(async ([api, id]) => {
  const x = await fetch(`${api}/admin/documents/${id}/approve`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return { s: x.status, b: (await x.text()).slice(0, 200) };
}, [API, '5eedf20f-e6f8-4b9d-8feb-4a71d0e0e27d']);
rec('reapprove-document', app);
save(P, 'p2-restore.json', out); await c.close(); await browser.close();
