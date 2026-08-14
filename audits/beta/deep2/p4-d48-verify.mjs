// P4 — D-48 verified on the deployed build: lock, unlock, log in successfully.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P4'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4d48', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 340)); };
const TARGET = 'k.yusupova@tmm3.uz';
const browser = await newBrowser(true);
{ const { c, p } = await ctx(P, browser, 'lock');
  await goto(P, p, `${PORTALS.admin}/login`, 'lock', 'd48-verify-lock');
  const r = await p.evaluate(async ([api, email]) => { const res = [];
    for (let i = 1; i <= 25; i++) { const x = await fetch(`${api}/auth/login`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password: 'Wrong@'+i }) }); res.push(x.status); if (x.status === 429) break; }
    return res; }, [API, TARGET]);
  rec('lock', { attempts: r.length, finalStatus: r.at(-1) }); await c.close(); }
{ const { c, p } = await ctx(P, browser, 'unlock');
  await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), 'unlock');
  const seq = await p.evaluate(async ([api, email, pw]) => {
    const un = await fetch(`${api}/auth/unlock-account`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
    const unBody = await un.text();
    const li = await fetch(`${api}/auth/login`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password: pw }) });
    return { unlock: { s: un.status, b: unBody.slice(0,140) }, login: { s: li.status, b: (await li.text()).slice(0,140) } };
  }, [API, TARGET, pwFor(TARGET)]);
  rec('unlock-then-login', seq);
  await shot(P, p, 'unlock', 'D-48-FIXED-unlock-then-login', { defect: 'D-48' });
  await c.close(); }
save(P, 'p4-d48-verify.json', out); await browser.close();
