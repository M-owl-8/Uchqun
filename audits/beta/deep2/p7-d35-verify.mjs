// D-35 — the teacher portal PROXIES /api/v1, so the absolute API origin loses
// the cookie (the same trap P5 §7.2 recorded). Relative path here.
import { phase, newBrowser, ctx, login, shot, pwFor } from './lib.mjs';
const P = phase('P7');
const CHILD = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';
const b = await newBrowser(true);
const { c, p } = await ctx(P, b, 'D-35');
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'D-35');
const r = await p.evaluate(async ([child]) => {
  const res = await fetch('/api/v1/attendance', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ childId: child, date: '2026-08-09', status: 'absent' }] }),
  });
  return { status: res.status, body: (await res.text()).slice(0, 200) };
}, [CHILD]);
console.log('markAbsent', JSON.stringify(r));
console.log('shot:', await shot(P, p, 'D-35', 'D-35-attendance-marked-absent', { full: true }));
await c.close(); await b.close();
