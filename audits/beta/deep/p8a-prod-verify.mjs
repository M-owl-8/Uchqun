// P8a — the fixes re-witnessed against production after deploy.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW, API } from './lib.mjs';
const P = phase('P8'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p8a', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 620)); };
const FOREIGN_CHILD = '5eed7fed-b5ea-4db5-8ab7-b60720996a30';  // amm1, Andijon
const FOREIGN_MEAL = '5eed28fa-3765-41ec-8bec-60f3180e972f';
const OWN_CHILD = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';      // tmm3, Toshkent
const browser = await newBrowser(true);

// D-47 — the breach must be closed for admin and reception
for (const [tag, portal, email] of [['admin-tmm3', 'admin', 'direktor@tmm3.uz'], ['reception-tmm3', 'reception', 'qabul@tmm3.uz']]) {
  const { c, p } = await ctx(P, browser, tag);
  await login(P, p, portal, email, PW, tag);
  const r = await p.evaluate(async ([api, foreign, meal]) => {
    const g = async (u) => { const x = await fetch(api + u, { credentials: 'include' }); const t = await x.text(); return { u, s: x.status, bytes: t.length, containsForeign: t.includes('5eed7fed'), body: t.slice(0, 120) }; };
    return [await g(`/activities?childId=${foreign}`), await g(`/meals?childId=${foreign}`), await g(`/meals/${meal}`), await g(`/media?childId=${foreign}`)];
  }, [API, FOREIGN_CHILD, FOREIGN_MEAL]);
  rec(`D-47-after-${tag}`, r);
  await shot(P, p, tag, `D-47-FIXED-${tag}`, { defect: 'D-47' });
  await c.close();
}

// D-31 — a teacher must no longer receive the whole school
{
  const tag = 'teacher-tmm3'; const { c, p } = await ctx(P, browser, tag);
  await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, tag);
  await goto(P, p, `${PORTALS.teacher}/teacher/attendance`, tag, 'D-31-after-fix', { defect: 'D-31', full: true });
  const r = await p.evaluate(async () => {
    const x = await fetch('/api/v1/attendance?startDate=2026-08-14&endDate=2026-08-14', { credentials: 'include' });
    const j = await x.json(); const recs = j.data || j;
    const own = await fetch('/api/v1/teacher/children', { credentials: 'include' });
    const oj = await own.json(); const kids = oj.data || oj;
    const bar = [...document.querySelectorAll('button')].find((b) => /belgilangan/.test(b.innerText));
    return { status: x.status, records: recs.length, distinctChildren: [...new Set(recs.map((r) => r.childId))].length, ownChildren: Array.isArray(kids) ? kids.length : null, saveBar: bar ? bar.innerText.trim() : null };
  });
  rec('D-31-after', r);
  await shot(P, p, tag, 'D-31-FIXED-savebar', { defect: 'D-31' });

  // D-26 — the old date must now be refused
  const d26 = await p.evaluate(async (child) => {
    const x = await fetch('/api/v1/attendance', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ childId: child, date: '2020-01-06', status: 'present' }] }) });
    return { status: x.status, body: (await x.text()).slice(0, 220) };
  }, OWN_CHILD);
  rec('D-26-after', d26);
  await c.close();
}

// D-43 — /admin/therapy must render
{
  const tag = 'admin-tmm3'; const { c, p } = await ctx(P, browser, tag);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.split('\n')[0].slice(0, 120)));
  await login(P, p, 'admin', 'direktor@tmm3.uz', PW, tag);
  const f = await goto(P, p, `${PORTALS.admin}/admin/therapy`, tag, 'D-43-FIXED-admin-therapy', { defect: 'D-43', full: true, wait: 8000 });
  const body = (await text(p)).replace(/\n/g, ' | ');
  rec('D-43-after', { shot: f, crashed: /Something went wrong|Try Again/.test(body), pageErrors: errs, head: body.slice(150, 460) });
  await c.close();
}
save(P, 'p8a.json', out); await browser.close(); console.log('P8a DONE');
