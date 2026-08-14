// P7f — auth and session: logout invalidation, lockout, and the single-meal
// endpoint that mealController.js:150 leaves unfiltered for admin.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW, API } from './lib.mjs';
const P = phase('P7'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7f', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 560)); };
const FOREIGN_MEAL = '5eed28fa-3765-41ec-8bec-60f3180e972f'; // a meal of the Andijon child, id seen in P7e
const browser = await newBrowser(true);

// ── getMeal by id: admin has no filter at all (mealController.js:150-151) ──
{
  const { c, p } = await ctx(P, browser, 'admin-tmm3');
  await login(P, p, 'admin', 'direktor@tmm3.uz', PW, 'admin-tmm3');
  const r = await p.evaluate(async ([api, id]) => {
    const x = await fetch(`${api}/meals/${id}`, { credentials: 'include' });
    const t = await x.text();
    return { status: x.status, bytes: t.length, body: t.slice(0, 300) };
  }, [API, FOREIGN_MEAL]);
  rec('D-47-getMeal-by-id', r);
  await shot(P, p, 'admin-tmm3', 'D-47-single-meal-by-id', { defect: 'D-47' });
  await c.close();
}

// ── logout must invalidate the session ────────────────────────────────────
{
  const { c, p } = await ctx(P, browser, 'session');
  await login(P, p, 'admin', 'direktor@tmm3.uz', PW, 'session');
  const before = await p.evaluate(async (api) => { const r = await fetch(`${api}/auth/me`, { credentials: 'include' }); return { s: r.status, b: (await r.text()).slice(0, 90) }; }, API);
  const lo = await p.evaluate(async (api) => { const r = await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' }); return { s: r.status, b: (await r.text()).slice(0, 90) }; }, API);
  await p.waitForTimeout(1500);
  const after = await p.evaluate(async (api) => {
    const me = await fetch(`${api}/auth/me`, { credentials: 'include' });
    const prot = await fetch(`${api}/admin/receptions`, { credentials: 'include' });
    return { me: { s: me.status, b: (await me.text()).slice(0, 80) }, protectedRoute: { s: prot.status, b: (await prot.text()).slice(0, 80) } };
  }, API);
  const refresh = await p.evaluate(async (api) => { const r = await fetch(`${api}/auth/refresh`, { method: 'POST', credentials: 'include' }); return { s: r.status, b: (await r.text()).slice(0, 110) }; }, API);
  rec('logout-invalidation', { before, logout: lo, after, refreshAfterLogout: refresh, shot: await shot(P, p, 'session', 'after-logout') });
  await c.close();
}

// ── login lockout after repeated failures ─────────────────────────────────
{
  const { c, p } = await ctx(P, browser, 'lockout');
  await goto(P, p, `${PORTALS.admin}/login`, 'lockout', 'lockout-start');
  const attempts = await p.evaluate(async (api) => {
    const res = [];
    for (let i = 1; i <= 7; i++) {
      const r = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'lockout.probe@tmm3.uz', password: 'DefinitelyWrong@' + i }) });
      res.push({ attempt: i, status: r.status, body: (await r.text()).slice(0, 130) });
    }
    return res;
  }, API);
  rec('lockout', { attempts, distinctStatuses: [...new Set(attempts.map((a) => a.status))], lockedAt: attempts.findIndex((a) => /lock|blok|qulf|429/i.test(a.body) || a.status === 429) + 1 || null });
  await c.close();
}

// ── unauthenticated access to every portal's protected root ───────────────
{
  const { c, p } = await ctx(P, browser, 'anon');
  const res = {};
  for (const [name, url] of [['admin', `${PORTALS.admin}/admin`], ['government', `${PORTALS.government}/government`], ['teacher', `${PORTALS.teacher}/teacher`], ['parent', `${PORTALS.teacher}/`], ['reception', `${PORTALS.reception}/reception`]]) {
    await goto(P, p, url, 'anon', `anon-${name}`);
    res[name] = { landedOn: new URL(p.url()).pathname, redirectedToLogin: /login/.test(p.url()), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 90) };
  }
  rec('unauthenticated-access', res);
  await c.close();
}

save(P, 'p7f.json', out); await browser.close(); console.log('P7f DONE');
