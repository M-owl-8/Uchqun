import { phase, newBrowser, ctx, goto, save, ev, PORTALS, API } from './lib.mjs';
const P = phase('P7'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7h', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 500)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, 'lockout-deep');
await goto(P, p, `${PORTALS.admin}/login`, 'lockout-deep', 'lockout-deep-start');
const r = await p.evaluate(async ([api, email]) => {
  const res = []; const t0 = Date.now();
  for (let i = 1; i <= 15; i++) {
    const s = Date.now();
    const x = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'WrongOnPurpose@' + i }) });
    const b = (await x.text()).slice(0, 120);
    res.push({ i, status: x.status, ms: Date.now() - s, b });
  }
  return { res, totalMs: Date.now() - t0 };
}, [API, 'sh.umarova@tmm3.uz']);
rec('fifteen-attempts', { statuses: r.res.map((x) => x.status), totalMs: r.totalMs, perAttemptMs: r.res.map((x) => x.ms), anyNon401: r.res.filter((x) => x.status !== 401).map((x) => ({ i: x.i, s: x.status, b: x.b })) });
// enumeration: unknown email vs known-but-unapproved vs known-wrong-password
const enumeration = await p.evaluate(async (api) => {
  const one = async (email, password) => { const x = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); return { email, status: x.status, body: (await x.text()).slice(0, 190) }; };
  return [
    await one('definitely.not.a.user@tmm3.uz', 'Whatever@2026'),
    await one('sh.umarova@tmm3.uz', 'Whatever@2026'),
    await one('sh.umarova@tmm3.uz', 'Test@2026'),
    await one('direktor@tmm3.uz', 'Whatever@2026'),
  ];
}, API);
rec('enumeration', enumeration);
save(P, 'p7h.json', out); await c.close(); await browser.close(); console.log('P7h DONE');
