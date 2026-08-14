// P5a — admin portal: every route cold, control dumps, and the register page.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P5');
const B = PORTALS.admin;
const TAG = 'admin-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5a', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 260)); };

const ROUTES = [
  ['A1', '/admin', 'dashboard'],
  ['A2', '/admin/receptions', 'receptions'],
  ['A3', '/admin/parents', 'parents'],
  ['A4', '/admin/teachers', 'teachers'],
  ['A5', '/admin/groups', 'groups'],
  ['A6', '/admin/school-ratings', 'school-ratings'],
  ['A7', '/admin/profile', 'profile'],
  ['A8', '/admin/settings', 'settings'],
  ['A9', '/admin/documents', 'documents'],
  ['A10', '/admin/ai-warnings', 'ai-warnings'],
  ['A11', '/admin/therapy', 'therapy'],
  ['A12', '/admin/import', 'bulk-import'],
  ['A13', '/admin/school', 'school-profile'],
  ['A14', '/admin/activity', 'activity-feed'],
  ['A15', '/admin/communications', 'communications'],
  ['A16', '/admin/trash', 'trash'],
  ['A17', '/admin/messages', 'gov-messages'],
  ['A18', '/admin/irr', 'admin-irr'],
  ['A19', '/admin/change-password', 'change-password'],
  ['A20', '/admin/zzz-nonexistent', 'notfound'],
];

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const li = await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);
rec('login', li);
if (!li.ok) { await c.close(); await browser.close(); process.exit(1); }

const dumps = {};
for (const [id, r, action] of ROUTES) {
  const f = await goto(P, p, B + r, TAG, `${id}-${action}`, { full: true });
  const d = await p.evaluate(DUMP);
  dumps[id] = { route: r, shot: f, ...d, head: (await text(p)).slice(0, 220) };
  console.log(id, r, '→', f, `btn=${d.buttons.length} in=${d.inputs.length}`);
}
save(P, 'p5a-route-dumps.json', dumps);

// detail routes need real ids
const teacherHref = (dumps.A4.links || []).find((h) => /\/admin\/teachers\/[0-9a-f-]{8}/.test(h));
const childHref = (dumps.A3.links || []).find((h) => /\/admin\/children\/[0-9a-f-]{8}/.test(h));
if (teacherHref) dumps.A21 = { route: teacherHref, shot: await goto(P, p, B + teacherHref, TAG, 'A21-teacher-detail', { full: true }), ...(await p.evaluate(DUMP)) };
if (childHref) dumps.A22 = { route: childHref, shot: await goto(P, p, B + childHref, TAG, 'A22-child-detail', { full: true }), ...(await p.evaluate(DUMP)) };
rec('detail-routes', { teacherHref, childHref, a21: dumps.A21?.shot, a22: dumps.A22?.shot });

// the unauthenticated register page
await c.close();
{
  const { c: c2, p: p2 } = await ctx(P, browser, 'anon');
  const f = await goto(P, p2, `${B}/admin-register`, 'anon', 'A23-admin-register', { full: true });
  const d = await p2.evaluate(DUMP);
  rec('admin-register', { shot: f, buttons: d.buttons, inputs: d.inputs, head: (await text(p2)).slice(0, 220) });
  await c2.close();
}

save(P, 'p5a.json', out);
save(P, 'p5a-route-dumps.json', dumps);
await browser.close();
console.log('P5a DONE');
