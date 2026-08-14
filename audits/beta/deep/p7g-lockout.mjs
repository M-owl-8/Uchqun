// P7g — does login lockout fire for a REAL account? Uses sh.umarova@tmm3.uz, a
// reception account that is already isActive:false and unused by other phases.
// If it locks, unlock via the documented endpoint so nothing is left broken.
import { phase, newBrowser, ctx, login, goto, save, ev, PORTALS, PW, API } from './lib.mjs';
const P = phase('P7'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7g', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 600)); };
const TARGET = 'sh.umarova@tmm3.uz';
const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, 'lockout-real');
await goto(P, p, `${PORTALS.admin}/login`, 'lockout-real', 'lockout-real-start');
const attempts = await p.evaluate(async ([api, email]) => {
  const res = [];
  for (let i = 1; i <= 8; i++) {
    const r = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'WrongOnPurpose@' + i }) });
    res.push({ i, status: r.status, body: (await r.text()).slice(0, 150) });
  }
  return res;
}, [API, TARGET]);
rec('attempts', attempts.map((a) => ({ i: a.i, s: a.status, b: a.body.slice(0, 90) })));
const locked = attempts.find((a) => a.status === 429 || /lock|blok|qulf|urinish/i.test(a.body));
rec('verdict', { lockedAtAttempt: locked ? locked.i : null, distinctStatuses: [...new Set(attempts.map((a) => a.status))], lastBody: attempts[attempts.length - 1].body });
// correct password now — is it refused because of the lock?
const correct = await p.evaluate(async ([api, email, pw]) => {
  const r = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
  return { status: r.status, body: (await r.text()).slice(0, 200) };
}, [API, TARGET, PW]);
rec('correct-password-after-failures', correct);
await c.close();

// unlock, if the platform locked it
if (out.verdict.lockedAtAttempt) {
  const { c: c2, p: p2 } = await ctx(P, browser, 'unlock');
  await login(P, p2, 'admin', 'direktor@tmm3.uz', PW, 'unlock');
  const un = await p2.evaluate(async ([api, email]) => {
    const r = await fetch(`${api}/auth/unlock-account`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    return { status: r.status, body: (await r.text()).slice(0, 200) };
  }, [API, TARGET]);
  rec('unlock', un);
  await c2.close();
}
save(P, 'p7g.json', out); await browser.close(); console.log('P7g DONE');
