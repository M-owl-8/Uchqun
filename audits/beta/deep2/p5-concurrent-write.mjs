// P5.4 — two writers, same child, same day, issued concurrently. The teacher
// portal proxies /api/v1, so the teacher writes through a relative path; the
// reception portal does not, so it writes to the absolute origin. Both are
// authenticated sessions of real accounts.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P5'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5-cw', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); };
const CHILD = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31'; const DATE = '2026-08-10';
const browser = await newBrowser(true);
const { c: c1, p: p1 } = await ctx(P, browser, 'writer-teacher');
const { c: c2, p: p2 } = await ctx(P, browser, 'writer-reception');
await login(P, p1, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'writer-teacher');
await login(P, p2, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), 'writer-reception');
await goto(P, p1, `${PORTALS.teacher}/teacher/attendance`, 'writer-teacher', 'concurrent-teacher-context');

const teacherPost = p1.evaluate(async ([child, date]) => {
  const r = await fetch('/api/v1/attendance', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ childId: child, date, status: 'sick' }] }) });
  return { who: 'teacher', s: r.status, b: (await r.text()).slice(0, 130) };
}, [CHILD, DATE]);
const receptionPost = p2.evaluate(async ([api, child, date]) => {
  const r = await fetch(`${api}/attendance`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ childId: child, date, status: 'present' }] }) });
  return { who: 'reception', s: r.status, b: (await r.text()).slice(0, 130) };
}, [API, CHILD, DATE]);

const [a, b] = await Promise.all([teacherPost, receptionPost]);
rec('concurrent-writes', { date: DATE, teacher: a, reception: b });
await shot(P, p1, 'writer-teacher', 'concurrent-write-teacher');
await c1.close(); await c2.close();
save(P, 'p5-concurrent-write.json', out); await browser.close();
