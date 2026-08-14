import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
await goto(P, p, `${B}/teacher/attendance`, TAG, 'scope-probe-context');
out.api = await p.evaluate(async () => {
  const r = await fetch('/api/v1/attendance?startDate=2026-08-14&endDate=2026-08-14', { credentials: 'include' });
  const j = await r.json();
  const recs = j.data || j;
  const ids = [...new Set(recs.map((x) => x.childId))];
  return { status: r.status, records: recs.length, distinctChildren: ids.length, sample: recs.slice(0, 2).map((x) => ({ childId: x.childId, status: x.status, snapshot: x.childSnapshot })) };
});
out.ownChildren = await p.evaluate(async () => { const r = await fetch('/api/v1/teacher/children', { credentials: 'include' }); const j = await r.json(); const d = j.data || j; return Array.isArray(d) ? d.length : (d.children?.length ?? null); });
out.saveBar = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /belgilangan/.test(x.innerText)); return b ? b.innerText.trim() : null; });
out.shot = await shot(P, p, TAG, 'D-31-attendance-scope-leak-savebar', { defect: 'D-31', full: true });
console.log(JSON.stringify(out, null, 1).slice(0, 1400));
ev(P, { kind: 'p3q', v: out.api });
save(P, 'p3q.json', out); await c.close(); await browser.close();
