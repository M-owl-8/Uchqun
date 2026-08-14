// P3a — teacher portal: every route cold, control dumps, empty/full state,
// and the two-group teacher.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P3');
const B = PORTALS.teacher;
const TAG = 'teacher-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3a', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
// tarbiyachi1@tmm3.uz owns TWO groups (Umid + Yulduz) — 21 children between them
const li = await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
rec('login', li);
if (!li.ok) process.exit(1);

const ROUTES = [
  ['T3', '/teacher', 'dashboard'],
  ['T4', '/teacher/bolalar', 'bolalar'],
  ['T5a', '/teacher/reja?tab=activities', 'reja-activities'],
  ['T5b', '/teacher/reja?tab=therapy', 'reja-therapy'],
  ['T5c', '/teacher/reja?tab=monitoring', 'reja-monitoring'],
  ['T5d', '/teacher/reja?tab=meals', 'reja-meals'],
  ['T6a', '/teacher/xabar?tab=chat', 'xabar-chat'],
  ['T6b', '/teacher/xabar?tab=warnings', 'xabar-warnings'],
  ['T7a', '/teacher/men?tab=profile', 'men-profile'],
  ['T7b', '/teacher/men?tab=settings', 'men-settings'],
  ['T7c', '/teacher/men?tab=reflection', 'men-reflection'],
  ['T16', '/teacher/attendance', 'attendance'],
  ['T17', '/teacher/meals', 'meals'],
  ['T18', '/teacher/media', 'media'],
  ['T19', '/teacher/monitoring', 'monitoring'],
  ['T2', '/teacher/change-password', 'change-password'],
  ['T22', '/teacher/zzz-nonexistent', 'notfound'],
];
const dumps = {};
for (const [id, r, action] of ROUTES) {
  const f = await goto(P, p, B + r, TAG, `${id}-${action}`, { full: true });
  dumps[id] = { route: r, shot: f, ...(await p.evaluate(DUMP)), head: (await text(p)).slice(0, 240) };
  console.log(id, r, '→', f, `btn=${dumps[id].buttons.length} in=${dumps[id].inputs.length}`);
}
save(P, 'p3a-route-dumps.json', dumps);

// child-scoped routes need a real child id
const childHref = (dumps.T4.links || []).find((h) => /\/teacher\/children\//.test(h));
if (childHref) {
  dumps.T20 = { route: childHref, shot: await goto(P, p, B + childHref, TAG, 'T20-child-detail', { full: true }), ...(await p.evaluate(DUMP)) };
  dumps.T21 = { route: `${childHref}/irr`, shot: await goto(P, p, `${B}${childHref}/irr`, TAG, 'T21-child-irr', { full: true }), ...(await p.evaluate(DUMP)) };
}
rec('child-routes', { childHref, t20: dumps.T20?.shot, t21: dumps.T21?.shot });

// ── the two-group teacher: are both groups present and separated? ───────────
{
  await goto(P, p, `${B}/teacher/bolalar`, TAG, 'two-group-teacher-children', { full: true });
  const body = await text(p);
  const names = await p.evaluate(() => [...document.querySelectorAll('a[href^="/teacher/children/"]')].map((a) => (a.innerText || a.getAttribute('title') || '').trim()).filter(Boolean));
  await goto(P, p, `${B}/teacher/attendance`, TAG, 'two-group-teacher-attendance-grid', { full: true });
  const cards = await p.locator('button[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).filter((a) => a && a.includes(':')));
  rec('two-group-teacher', {
    childrenListed: names.length, attendanceCards: cards.length,
    names: cards.map((x) => x.split(':')[0]).slice(0, 30),
    headline: (body.match(/Bolalar \((\d+)\)/) || [])[0] ?? null,
    groupLabel: (body.match(/"[^"]*"\s*Guruh/) || [])[0] ?? null,
  });
}

// ── empty state: a teacher with NO group ───────────────────────────────────
await c.close();
{
  const { c: c2, p: p2 } = await ctx(P, browser, 'teacher-nogroup');
  const l2 = await login(P, p2, 'teacher', 'tarbiyachi6@tmm3.uz', PW, 'teacher-nogroup');
  const d = await goto(P, p2, `${B}/teacher`, 'teacher-nogroup', 'EMPTY-STATE-dashboard-no-group', { full: true });
  const a = await goto(P, p2, `${B}/teacher/attendance`, 'teacher-nogroup', 'EMPTY-STATE-attendance-no-group', { full: true });
  const bo = await goto(P, p2, `${B}/teacher/bolalar`, 'teacher-nogroup', 'EMPTY-STATE-bolalar-no-group', { full: true });
  rec('teacher-with-no-group', { ok: l2.ok, dashboard: d, attendance: a, bolalar: bo, body: (await text(p2)).slice(0, 320) });
  await c2.close();
}

save(P, 'p3a.json', out);
await browser.close();
console.log('P3a DONE');
