// P7 — verify D-35, D-41, D-60 on PRODUCTION. Per L13 the response code is not
// the evidence; every row is read back from the database separately.
// Scoped to 5eed seed rows only (L12).
import { phase, newBrowser, ctx, login, shot, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P7');
const CHILD = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';
const DOC = '5eed382e-d0ee-44cb-823a-964d107258ee';
const b = await newBrowser(true);
const out = {};

const call = (p, method, path, body, base = API) => p.evaluate(async ([api, m, pth, bd]) => {
  const r = await fetch(api + pth, {
    method: m, credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: bd ? JSON.stringify(bd) : undefined,
  });
  return { status: r.status, body: (await r.text()).slice(0, 240) };
}, [base, method, path, body]);

// D-35 — mark absent as the teacher
{
  const { c, p } = await ctx(P, b, 'D-35');
  await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'D-35');
  out['D-35-markAbsent'] = await call(p, 'POST', '/attendance',
    { records: [{ childId: CHILD, date: '2026-08-09', status: 'absent' }] });
  out['D-35-shot'] = await shot(P, p, 'D-35', 'D-35-attendance-marked', { full: true });
  await c.close();
}

// D-41 — the admin child endpoint, and the cross-tenant refusal
{
  const { c, p } = await ctx(P, b, 'D-41');
  await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), 'D-41');
  out['D-41-ownSchool'] = await call(p, 'GET', `/admin/children/${CHILD}`);
  out['D-41-refresh'] = await (async () => {
    await p.goto(`${PORTALS.admin}/admin/children/${CHILD}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4500);
    const heading = await p.evaluate(() => document.querySelector('h1')?.innerText ?? null);
    return { heading, showsRawUuid: /^Child [0-9a-f-]{36}$/i.test(heading || '') };
  })();
  out['D-41-shot'] = await shot(P, p, 'D-41', 'D-41-child-detail-after-refresh', { full: true });
  await c.close();
}

// D-60 — revoke the approval my own D-52 probe created, restoring access state
{
  const { c, p } = await ctx(P, b, 'D-60');
  await login(P, p, 'admin', 'direktor@amm1.uz', pwFor('direktor@amm1.uz'), 'D-60');
  out['D-60-rejectApproved'] = await call(p, 'PUT', `/admin/documents/${DOC}/reject`,
    { rejectionReason: 'Audit restoration — reverting the D-52 verification probe' });
  out['D-60-shot'] = await shot(P, p, 'D-60', 'D-60-reject-after-approval', { full: true });
  await c.close();
}

console.log(JSON.stringify(out, null, 1));
await b.close();
