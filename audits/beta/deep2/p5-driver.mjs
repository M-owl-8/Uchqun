// P5 — deep UI pass, one portal per invocation.
//
//   node p5-driver.mjs <portal>
//
// Per route: cold load + screenshot, full control dump, horizontal-fit check.
// Then the named scenarios: a validation failure per form, refresh mid-flow,
// browser back and forward, double-submit, and a deep link while logged out.
// Console and network are captured per page and every row is classified.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, pwFor, DESKTOP } from './lib.mjs';
import fs from 'fs';

const PORTAL = process.argv[2];
const SPEC = {
  reception: {
    portal: 'reception', account: 'qabul@tmm3.uz', base: PORTALS.reception,
    routes: [['R1', '/reception', 'dashboard'], ['R2', '/reception/parents', 'parents'],
      ['R3', '/reception/parents/new', 'parent-wizard'], ['R4', '/reception/teachers', 'teachers'],
      ['R5', '/reception/groups', 'groups'], ['R6', '/reception/documents', 'documents'],
      ['R7', '/reception/settings', 'settings'], ['R8', '/reception/profile', 'profile'],
      ['R9', '/reception/change-password', 'change-password'],
      ['R10', '/reception/wizard/complete', 'wizard-complete'], ['R11', '/reception/zzz', 'notfound']],
  },
  teacher: {
    portal: 'teacher', account: 'tarbiyachi1@tmm3.uz', base: PORTALS.teacher,
    routes: [['T1', '/teacher', 'dashboard'], ['T2', '/teacher/bolalar', 'bolalar'],
      ['T3', '/teacher/reja?tab=activities', 'reja-activities'], ['T4', '/teacher/reja?tab=therapy', 'reja-therapy'],
      ['T5', '/teacher/reja?tab=monitoring', 'reja-monitoring'], ['T6', '/teacher/reja?tab=meals', 'reja-meals'],
      ['T7', '/teacher/xabar?tab=chat', 'xabar-chat'], ['T8', '/teacher/xabar?tab=warnings', 'xabar-warnings'],
      ['T9', '/teacher/men?tab=profile', 'men-profile'], ['T10', '/teacher/men?tab=settings', 'men-settings'],
      ['T11', '/teacher/men?tab=reflection', 'men-reflection'], ['T12', '/teacher/attendance', 'attendance'],
      ['T13', '/teacher/meals', 'meals'], ['T14', '/teacher/media', 'media'],
      ['T15', '/teacher/monitoring', 'monitoring'], ['T16', '/teacher/change-password', 'change-password'],
      ['T17', '/teacher/zzz', 'notfound']],
  },
  admin: {
    portal: 'admin', account: 'direktor@tmm3.uz', base: PORTALS.admin,
    routes: [['A1', '/admin', 'dashboard'], ['A2', '/admin/receptions', 'receptions'],
      ['A3', '/admin/parents', 'parents'], ['A4', '/admin/teachers', 'teachers'],
      ['A5', '/admin/groups', 'groups'], ['A6', '/admin/school-ratings', 'school-ratings'],
      ['A7', '/admin/profile', 'profile'], ['A8', '/admin/settings', 'settings'],
      ['A9', '/admin/documents', 'documents'], ['A10', '/admin/ai-warnings', 'ai-warnings'],
      ['A11', '/admin/therapy', 'therapy'], ['A12', '/admin/import', 'bulk-import'],
      ['A13', '/admin/school', 'school-profile'], ['A14', '/admin/activity', 'activity'],
      ['A15', '/admin/communications', 'communications'], ['A16', '/admin/trash', 'trash'],
      ['A17', '/admin/messages', 'gov-messages'], ['A18', '/admin/irr', 'irr'],
      ['A19', '/admin/change-password', 'change-password'], ['A20', '/admin/zzz', 'notfound']],
  },
  government: {
    portal: 'government', account: 'gov.republic@uchqun.uz', base: PORTALS.government,
    routes: [['G1', '/government', 'dashboard'], ['G2', '/government/schools', 'schools'],
      ['G3', '/government/students', 'students'], ['G4', '/government/teachers', 'teachers'],
      ['G5', '/government/parents', 'parents'], ['G6', '/government/ratings', 'ratings'],
      ['G7', '/government/platform', 'platform'], ['G8', '/government/warnings', 'warnings'],
      ['G9', '/government/audit-log', 'audit-log'], ['G10', '/government/profile', 'profile'],
      ['G11', '/government/settings', 'settings'], ['G12', '/government/change-password', 'change-password'],
      ['G13', '/government/zzz', 'notfound']],
  },
}[PORTAL];

if (!SPEC) { console.error('usage: p5-driver.mjs <reception|teacher|admin|government>'); process.exit(2); }

const P = phase('P5');
const TAG = `p5-${PORTAL}`;
const out = { portal: PORTAL, routes: {}, scenarios: {} };
const rec = (k, v) => { out.scenarios[k] = v; ev(P, { kind: 'p5', portal: PORTAL, step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };

const browser = await newBrowser(true);

// ── deep link while logged out, BEFORE authenticating ─────────────────────
{
  const { c, p } = await ctx(P, browser, `${TAG}-anon`);
  const deep = SPEC.routes[1][1];
  await goto(P, p, SPEC.base + deep, `${TAG}-anon`, 'deeplink-logged-out');
  const landed = new URL(p.url()).pathname;
  const li = await login(P, p, SPEC.portal, SPEC.account, pwFor(SPEC.account), `${TAG}-anon`);
  await p.waitForTimeout(3000);
  rec('deeplink-then-login', {
    requested: deep, landedLoggedOut: landed, redirectedToLogin: /login/.test(landed),
    afterLogin: new URL(p.url()).pathname,
    returnedToDeepLink: new URL(p.url()).pathname === deep,
    shot: await shot(P, p, `${TAG}-anon`, 'deeplink-after-login'),
  });
  await c.close();
}

const { c, p } = await ctx(P, browser, TAG, DESKTOP);
const consoleRows = []; const netRows = [];
p.on('console', (m) => { if (m.type() === 'error') consoleRows.push({ url: p.url(), text: m.text().slice(0, 160) }); });
p.on('response', (r) => { if (r.status() >= 400) netRows.push({ url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), page: p.url() }); });

const li = await login(P, p, SPEC.portal, SPEC.account, pwFor(SPEC.account), TAG);
rec('login', li);

// ── every route: cold load, control dump, horizontal fit ──────────────────
for (const [id, route, action] of SPEC.routes) {
  const f = await goto(P, p, SPEC.base + route, TAG, `${id}-${action}`, { full: true });
  const d = await p.evaluate(DUMP);
  const fit = await p.evaluate(() => {
    const de = document.documentElement;
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflows: de.scrollWidth > de.clientWidth + 2 };
  });
  out.routes[id] = { route, shot: f, buttons: d.buttons, inputs: d.inputs, links: (d.links || []).length, fit, head: (await text(p)).slice(0, 180) };
  console.log(`${id} ${route} -> ${f} btn=${d.buttons.length} in=${d.inputs.length}${fit.overflows ? ' OVERFLOW' : ''}`);
}

// ── a validation failure on the first form that has one ───────────────────
{
  const withForm = SPEC.routes.find(([, , a]) => /change-password|settings/.test(a));
  if (withForm) {
    await goto(P, p, SPEC.base + withForm[1], TAG, 'validation-form');
    const pw = p.locator('input[type="password"]');
    if (await pw.count() >= 2) {
      await pw.nth(0).fill('WrongCurrent@1');
      for (let i = 1; i < await pw.count(); i++) await pw.nth(i).fill('short');
      await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /Parol|Yangila|Saqla|O'zgartir/.test(x.innerText)); if (b) b.click(); });
      await p.waitForTimeout(3500);
      const body = (await text(p)).replace(/\n/g, ' | ');
      rec('validation-failure', {
        route: withForm[1], shot: await shot(P, p, TAG, 'validation-failure-message', { full: true }),
        message: (body.match(/[^|]*(xato|noto'g'ri|majburiy|kamida|kerak|incorrect|required)[^|]*/i) || [])[0]?.trim().slice(0, 140) ?? null,
        namesTheField: /parol|password|joriy/i.test(body),
      });
    }
  }
}

// ── refresh mid-flow, back, forward, double-submit ────────────────────────
{
  const [, first] = SPEC.routes[1];
  await goto(P, p, SPEC.base + first, TAG, 'nav-start');
  await goto(P, p, SPEC.base + SPEC.routes[2][1], TAG, 'nav-second');
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  const afterReload = { url: new URL(p.url()).pathname, body: (await text(p)).slice(0, 90).replace(/\n/g, ' '), shot: await shot(P, p, TAG, 'nav-after-refresh') };
  await p.goBack({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const afterBack = { url: new URL(p.url()).pathname, shot: await shot(P, p, TAG, 'nav-after-back') };
  await p.goForward({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const afterForward = { url: new URL(p.url()).pathname, shot: await shot(P, p, TAG, 'nav-after-forward') };
  rec('navigation', { afterReload, afterBack, afterForward });
}

// ── console and network classification ────────────────────────────────────
const classify = (r) => {
  if (r.status === 401) return 'expected: pre-auth probe';
  if (r.status === 403) return 'expected: authorisation boundary';
  if (r.status === 404) return 'not-found (route or absent record)';
  if (r.status >= 500) return 'SERVER ERROR — investigate';
  return 'client error';
};
rec('console-errors', { total: consoleRows.length, distinct: [...new Set(consoleRows.map((r) => r.text))].slice(0, 8) });
rec('network-failures', {
  total: netRows.length,
  byStatus: netRows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}),
  serverErrors: netRows.filter((r) => r.status >= 500).map((r) => ({ url: r.url, status: r.status })),
  classified: [...new Set(netRows.map((r) => `${r.status} ${r.url.split('?')[0]} — ${classify(r)}`))].slice(0, 14),
});

await c.close();
save(P, `p5-${PORTAL}.json`, out);
fs.writeFileSync(`audits/beta/deep2/p5-${PORTAL}-routes.json`, JSON.stringify(out.routes, null, 1));
await browser.close();
console.log(`P5 ${PORTAL} DONE — ${Object.keys(out.routes).length} routes`);
