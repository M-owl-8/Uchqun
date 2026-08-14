// D-52 — prove the reversal on PRODUCTION, per L13: the row is read back, the
// 200 is not the evidence. Scoped to a 5eed seed document only (L12).
import { phase, newBrowser, ctx, login, shot, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P7');
const DOC = '5eed382e-d0ee-44cb-823a-964d107258ee';
const b = await newBrowser(true);
const { c, p } = await ctx(P, b, 'D-52');
await login(P, p, 'admin', 'direktor@amm1.uz', pwFor('direktor@amm1.uz'), 'D-52');

const call = (method, path, body) => p.evaluate(async ([api, m, pth, bd]) => {
  const r = await fetch(api + pth, {
    method: m, credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: bd ? JSON.stringify(bd) : undefined,
  });
  return { status: r.status, body: (await r.text()).slice(0, 200) };
}, [API, method, path, body]);

const out = {};
out.reject = await call('PUT', `/admin/documents/${DOC}/reject`, { rejectionReason: 'D-52 reversal probe' });
out.approveAfterReject = await call('PUT', `/admin/documents/${DOC}/approve`);
out.shot = await shot(P, p, 'D-52', 'D-52-approve-after-rejection', { full: true });
console.log(JSON.stringify(out, null, 1));
await c.close(); await b.close();
