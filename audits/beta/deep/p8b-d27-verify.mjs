import { phase, newBrowser, ctx, login, save, ev, PW, API } from './lib.mjs';
const P = phase('P8'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p8b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); };
const CHILD = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31'; const DATE = '2026-08-12';
const browser = await newBrowser(true);
// teacher marks absent
{ const { c, p } = await ctx(P, browser, 'teacher-tmm3');
  await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, 'teacher-tmm3');
  rec('teacher-marks-absent', await p.evaluate(async ([child, date]) => {
    const r = await fetch('/api/v1/attendance', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ childId: child, date, status: 'absent' }] }) });
    return { status: r.status, body: (await r.text()).slice(0, 120) };
  }, [CHILD, DATE]));
  await c.close(); }
// reception overwrites to present
{ const { c, p } = await ctx(P, browser, 'reception-tmm3');
  await login(P, p, 'reception', 'qabul@tmm3.uz', PW, 'reception-tmm3');
  rec('reception-overwrites', await p.evaluate(async ([api, child, date]) => {
    const r = await fetch(`${api}/attendance`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ childId: child, date, status: 'present' }] }) });
    return { status: r.status, body: (await r.text()).slice(0, 120) };
  }, [API, CHILD, DATE]));
  await c.close(); }
save(P, 'p8b.json', out); await browser.close(); console.log('P8b DONE');
