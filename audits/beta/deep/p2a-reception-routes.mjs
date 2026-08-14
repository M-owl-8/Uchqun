// P2a — reception portal: every route cold, every visible control dumped,
// empty state vs full state, one validation failure per form.
// Account: qabul@tmm3.uz — the volume school (61 children, 6 groups, 8 teachers).
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P2');
const B = PORTALS.reception;
const TAG = 'reception-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2a', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);

const li = await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);
rec('login', li);
if (!li.ok) { console.log('LOGIN FAILED'); await c.close(); await browser.close(); process.exit(1); }

// ── R1..R13: cold load + control dump ───────────────────────────────────────
const ROUTES = [
  ['R2', '/reception', 'dashboard'],
  ['R4', '/reception/parents', 'parents'],
  ['R5', '/reception/parents/new', 'parent-wizard-step1'],
  ['R6', '/reception/teachers', 'teachers'],
  ['R7', '/reception/groups', 'groups'],
  ['R8', '/reception/documents', 'documents'],
  ['R9', '/reception/settings', 'settings'],
  ['R10', '/reception/profile', 'profile'],
  ['R11', '/reception/wizard/complete', 'wizard-complete-direct'],
  ['R3', '/reception/change-password', 'change-password'],
  ['R13', '/reception/zzz-nonexistent', 'notfound'],
];
const dumps = {};
for (const [id, route, action] of ROUTES) {
  const f = await goto(P, p, B + route, TAG, `${id}-${action}`, { full: true });
  dumps[id] = { route, shot: f, ...(await p.evaluate(DUMP)), head: (await text(p)).slice(0, 260) };
  console.log(id, route, '→', f, `btn=${dumps[id].buttons.length} in=${dumps[id].inputs.length} link=${dumps[id].links.length}`);
}
save(P, 'p2a-route-dumps.json', dumps);

// ── Parents: full state, search hit, search miss (empty state), pagination ───
{
  await goto(P, p, `${B}/reception/parents`, TAG, 'parents-full-state', { full: true });
  const body0 = await text(p);
  const search = p.locator('input[type="text"], input[type="search"]').first();
  await search.fill('Karimov');
  await p.waitForTimeout(2500);
  const hit = await shot(P, p, TAG, 'parents-search-hit', { full: true });
  const bodyHit = await text(p);
  await search.fill('zzzzqqqq');
  await p.waitForTimeout(2500);
  const miss = await shot(P, p, TAG, 'parents-search-EMPTY-STATE', { full: true });
  const bodyMiss = await text(p);
  await search.fill('');
  await p.waitForTimeout(2000);
  // pagination: find the last page control
  const pag = await p.evaluate(() => [...document.querySelectorAll('button')]
    .map((b) => (b.innerText || '').trim()).filter((t) => /^\d+$|Keyingi|Oldingi|»|›/.test(t)));
  let lastPage = null;
  if (pag.length) {
    const nums = pag.filter((x) => /^\d+$/.test(x)).map(Number);
    if (nums.length) {
      await p.locator('button', { hasText: new RegExp(`^${Math.max(...nums)}$`) }).first().click().catch(() => {});
      await p.waitForTimeout(2500);
      lastPage = await shot(P, p, TAG, 'parents-last-page', { full: true });
    }
  }
  rec('parents-states', {
    fullShot: 'see index', searchHit: hit, emptyState: miss, lastPage,
    paginationControls: pag,
    fullCount: (body0.match(/\((\d+)\)/) || [])[1] ?? null,
    hitHasKarimov: bodyHit.includes('Karimov'),
    missShowsEmpty: /topilmadi|yo'q|Hech|bo'sh/i.test(bodyMiss),
    missBody: bodyMiss.slice(0, 400),
  });
}

// ── Teachers: search, create-modal validation failure, cancel ───────────────
{
  await goto(P, p, `${B}/reception/teachers`, TAG, 'teachers-full-state', { full: true });
  const s = p.locator('input[type="text"]').first();
  await s.fill('zzzzqqqq'); await p.waitForTimeout(2200);
  const empty = await shot(P, p, TAG, 'teachers-search-EMPTY-STATE', { full: true });
  const emptyBody = await text(p);
  await s.fill(''); await p.waitForTimeout(1500);

  await p.locator('button', { hasText: "Tarbiyachi qo'shish" }).first().click();
  await p.waitForTimeout(2200);
  const modal = await shot(P, p, TAG, 'teachers-create-modal-open');
  // VALIDATION FAILURE: submit completely empty
  await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
  await p.waitForTimeout(1600);
  const invalid = await shot(P, p, TAG, 'teachers-create-VALIDATION-empty');
  const vBody = await text(p);
  // VALIDATION FAILURE 2: valid name, deliberately weak password
  const texts = p.locator('input[type="text"]:visible');
  let i = 0;
  for (let k = 0; k < await texts.count(); k++) {
    const ph = (await texts.nth(k).getAttribute('placeholder')) || '';
    if (/qidir/i.test(ph)) continue;
    if (i === 0) await texts.nth(k).fill('Aziza');
    else if (i === 1) await texts.nth(k).fill('Nazarova');
    else await texts.nth(k).fill('a.nazarova');
    i++;
  }
  await p.locator('input[type="password"]:visible').first().fill('123');
  await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
  await p.waitForTimeout(1800);
  const weak = await shot(P, p, TAG, 'teachers-create-VALIDATION-weak-password');
  const wBody = await text(p);
  // cancel
  await p.locator('button', { hasText: /Bekor qilish/ }).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  const cancelled = await shot(P, p, TAG, 'teachers-create-cancelled');
  rec('teachers-validation', {
    emptyState: empty, emptyStateText: emptyBody.slice(-260),
    modal, invalidEmpty: invalid, invalidWeak: weak, cancelled,
    emptyMsg: (vBody.match(/[^\n]*(majburiy|to'ldiring|kiriting|required|Validation)[^\n]*/i) || [])[0] ?? null,
    weakMsg: (wBody.match(/[^\n]*(parol|password|8)[^\n]*/i) || [])[0] ?? null,
  });
}

// ── Groups: create-form validation failure ──────────────────────────────────
{
  await goto(P, p, `${B}/reception/groups`, TAG, 'groups-full-state', { full: true });
  const before = await text(p);
  const add = p.locator('button', { hasText: /Guruh qo'shish|Yangi guruh|\+/ });
  let opened = null; let invalid = null; let msg = null;
  if (await add.count()) {
    await add.first().click(); await p.waitForTimeout(2000);
    opened = await shot(P, p, TAG, 'groups-create-form-open', { full: true });
    const sub = p.locator('button[type="submit"]');
    if (await sub.count()) {
      await sub.first().click(); await p.waitForTimeout(1600);
      invalid = await shot(P, p, TAG, 'groups-create-VALIDATION-empty', { full: true });
      msg = ((await text(p)).match(/[^\n]*(majburiy|to'ldiring|kiriting|required|Validation)[^\n]*/i) || [])[0] ?? null;
    }
  }
  rec('groups', { addButtons: await add.count(), opened, invalid, msg, head: before.slice(0, 300) });
}

// ── Documents: type select + upload (X-01) ──────────────────────────────────
{
  await goto(P, p, `${B}/reception/documents`, TAG, 'documents-before-upload', { full: true });
  const sel = p.locator('select').first();
  const opts = await sel.locator('option').allTextContents();
  await sel.selectOption({ index: 3 }).catch(() => {});
  await p.waitForTimeout(600);
  const typed = await shot(P, p, TAG, 'documents-type-selected');
  await p.locator('input[type="file"]').first().setInputFiles('C:/work/Uchqun/audits/beta/fullrun-2026-08-14/sim-document.pdf');
  await p.waitForTimeout(3000);
  const err = await shot(P, p, TAG, 'documents-upload-X01-error', { defect: 'X-01', full: true });
  rec('documents', { typeOptions: opts, typed, err, body: (await text(p)).slice(0, 300) });
}

// ── Profile + Settings: exercise the controls ───────────────────────────────
{
  await goto(P, p, `${B}/reception/profile`, TAG, 'profile', { full: true });
  const pd = await p.evaluate(DUMP);
  let saved = null;
  const edit = p.locator('button', { hasText: /Tahrirlash|O'zgartirish|Saqlash/ });
  if (await edit.count()) { await edit.first().click(); await p.waitForTimeout(1500); saved = await shot(P, p, TAG, 'profile-edit-open', { full: true }); }
  await goto(P, p, `${B}/reception/settings`, TAG, 'settings', { full: true });
  const sd = await p.evaluate(DUMP);
  const toggles = p.locator('input[type="checkbox"]');
  let toggled = null;
  if (await toggles.count()) {
    await toggles.first().click(); await p.waitForTimeout(800);
    toggled = await shot(P, p, TAG, 'settings-toggle-flipped', { full: true });
    await toggles.first().click(); await p.waitForTimeout(500);
  }
  rec('profile-settings', { profileControls: pd, settingsControls: sd, profileEdit: saved, toggled });
}

save(P, 'p2a.json', out);
await c.close();
await browser.close();
console.log('P2a DONE');
