// P3a — form discovery. READ ONLY (opens create dialogs, submits nothing).
// Dumps every visible form control + button on the provisioning/action surfaces
// so the write phase can target them deterministically.
import { newBrowser, ctx, login, save, acceptParentConsent, PORTALS, PW } from './lib.mjs';

const CHILD = '78d1f578-956c-42c7-81f5-9eafc994219b';

const DUMP = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const ctl = [...document.querySelectorAll('input,select,textarea')].filter(vis).map((e, i) => ({
    i, tag: e.tagName, type: e.type || null, name: e.name || null, id: e.id || null,
    placeholder: e.placeholder || null,
    options: e.tagName === 'SELECT' ? [...e.options].map(o => o.value + '::' + o.text).slice(0, 12) : null,
  }));
  const btn = [...document.querySelectorAll('button,[role=button],a[href]')].filter(vis).map((e, i) => ({
    i, tag: e.tagName, type: e.type || null, aria: e.getAttribute('aria-label'),
    text: (e.innerText || '').trim().slice(0, 45), href: e.getAttribute('href') || null,
  })).filter(b => b.text || b.aria);
  return { ctl, btn };
};

const b = await newBrowser(true);
const out = {};

async function run(tag, portal, email, steps, tab) {
  const { c, p } = await ctx(b, tag);
  const li = await login(p, portal, email, PW, tag, { tab });
  if (!li.ok) { out[tag] = { loginFailed: true }; await c.close(); return; }
  if (tag.startsWith('parent')) out[`${tag}:consent`] = await acceptParentConsent(p, tag);
  for (const [key, url, opener] of steps) {
    // discovery navigates without screenshotting — evidence comes from the write phase
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch { /* recorded below */ }
    await p.waitForTimeout(3500);
    if (opener) {
      try {
        const loc = p.locator(opener.sel, opener.opt);
        if (await loc.count()) { await loc.first().click(); await p.waitForTimeout(2500); }
      } catch (e) { out[`${tag}:${key}:openerErr`] = e.message; }
    }
    out[`${tag}:${key}`] = await p.evaluate(DUMP);
    console.log(`dumped ${tag}:${key}`);
  }
  await c.close();
}

await run('gov-republic', 'government', 'gov.republic@uchqun.uz', [
  ['platform-admins', `${PORTALS.government}/government/platform`, null],
  ['platform-gov', `${PORTALS.government}/government/platform`, { sel: 'button', opt: { hasText: /Government Users|Davlat|Hukumat/i } }],
  ['platform-messages', `${PORTALS.government}/government/platform`, { sel: 'button', opt: { hasText: /Messages|Xabar/i } }],
  ['platform-registrations', `${PORTALS.government}/government/platform`, { sel: 'button', opt: { hasText: /Registrations|Ro.yxat|So.rov/i } }],
  ['school-detail', `${PORTALS.government}/government/schools/5334e23c-a749-4808-8b9a-1f8c67aa1938`, null],
]);

await run('admin-smm2', 'admin', 'admin4@uchqun.uz', [
  ['receptions', `${PORTALS.admin}/admin/receptions`, { sel: 'button', opt: { hasText: /\+|Yangi|Qo'sh|Add|Create/i } }],
  ['messages', `${PORTALS.admin}/admin/messages`, { sel: 'button', opt: { hasText: /Yangi xabar|Compose|\+/i } }],
  ['groups', `${PORTALS.admin}/admin/groups`, null],
  ['documents', `${PORTALS.admin}/admin/documents`, null],
  ['communications', `${PORTALS.admin}/admin/communications`, null],
  ['school-ratings', `${PORTALS.admin}/admin/school-ratings`, null],
]);

await run('reception-smm2', 'reception', 'reception4@uchqun.uz', [
  ['teachers', `${PORTALS.reception}/reception/teachers`, { sel: 'button', opt: { hasText: /Yangi|Qo'sh|Add|\+/i } }],
  ['parent-wizard', `${PORTALS.reception}/reception/parents/new`, null],
  ['groups', `${PORTALS.reception}/reception/groups`, null],
  ['documents', `${PORTALS.reception}/reception/documents`, null],
]);

await run('teacher-smm2', 'teacher', 'teacher7@uchqun.uz', [
  ['attendance', `${PORTALS.teacher}/teacher/attendance`, null],
  ['media-modal', `${PORTALS.teacher}/teacher/media`, { sel: 'button', opt: { hasText: /Qo'sh|Add|Yangi/i } }],
  ['chat', `${PORTALS.teacher}/teacher/xabar?tab=chat`, null],
  ['reja-activities', `${PORTALS.teacher}/teacher/reja?tab=activities`, null],
  ['meals', `${PORTALS.teacher}/teacher/meals`, null],
  ['reflection', `${PORTALS.teacher}/teacher/men?tab=reflection`, null],
  ['child-irr', `${PORTALS.teacher}/teacher/children/${CHILD}/irr`, null],
]);

await run('parent-smm2', 'parent', 'parent10@uchqun.uz', [
  ['chat', `${PORTALS.teacher}/chat`, null],
  ['media', `${PORTALS.teacher}/media`, null],
  ['rating', `${PORTALS.teacher}/rating`, null],
  ['attendance', `${PORTALS.teacher}/attendance`, null],
  ['journal', `${PORTALS.teacher}/journal`, null],
], /Ota-ona|Parent|Родител/i);

save('p3a-discover.json', out);
await b.close();
console.log('P3a DONE');
