// P3i — the teacher surface P3a–P3h did not reach: therapy, media, the parent
// journal composer, monitoring bulk-fill, monthly milestones, settings forms.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P3');
const B = PORTALS.teacher;
const TAG = 'teacher-tmm3';
const CH = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3i', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 460)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const net = [];
p.on('response', async (r) => {
  if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return;
  let b = ''; try { b = (await r.text()).slice(0, 200); } catch { /* noop */ }
  net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b });
});
const since = () => { const n = [...net]; net.length = 0; return n; };

await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);

const fillAll = (dateVal) => p.evaluate((d) => {
  const set = (el, v) => {
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const seen = [];
  for (const e of [...document.querySelectorAll('input,select,textarea')].filter((x) => x.offsetParent && x.type !== 'file')) {
    if (e.tagName === 'SELECT') { const o = [...e.options].map((x) => x.value).filter(Boolean); if (o.length) set(e, o[0]); }
    else if (e.type === 'date') set(e, d);
    else if (e.type === 'time') set(e, '10:00');
    else if (e.type === 'number') set(e, '30');
    else if (e.type === 'checkbox' || e.type === 'radio') { if (!e.checked) e.click(); }
    else set(e, 'QA-P3I tekshiruv yozuvi');
    seen.push(`${e.tagName}:${e.type || ''}`);
  }
  return seen;
}, dateVal);

// ── THERAPY: assign + record a session ────────────────────────────────────
await T('therapy', async () => {
  await goto(P, p, `${B}/teacher/reja?tab=therapy`, TAG, 'therapy-tab', { full: true });
  const d = await p.evaluate(DUMP);
  rec('therapy-tab-controls', { buttons: d.buttons.slice(0, 16), inputs: d.inputs.length });
  const open = p.locator('button', { hasText: /Terapiya|Qo'sh|Biriktir|Yangi/i });
  if (await open.count()) {
    await open.first().click(); await p.waitForTimeout(2600);
    const modal = await shot(P, p, TAG, 'therapy-modal-open', { full: true });
    const fields = await fillAll('2026-08-14');
    const filled = await shot(P, p, TAG, 'therapy-modal-filled', { full: true });
    since();
    const sub = p.locator('button[type="submit"]:visible');
    const subLabels = await sub.evaluateAll((e) => e.map((b) => b.innerText.trim()));
    if (await sub.count()) { await sub.first().click(); await p.waitForTimeout(5000); }
    rec('therapy-create', { modal, fields, filled, subLabels, net: since(), after: await shot(P, p, TAG, 'therapy-create-result', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|xato[^\n]*|majburiy[^\n]*)/i) || [])[0] ?? null });
  } else rec('therapy-create', { openable: false, buttons: d.buttons.slice(0, 16) });
});

// ── MEDIA: the modal, and the X-01 file field ─────────────────────────────
await T('media', async () => {
  await goto(P, p, `${B}/teacher/media`, TAG, 'media-page', { full: true });
  const d = await p.evaluate(DUMP);
  const open = p.locator('button', { hasText: /Yuklash|Qo'sh|Media|Yangi/i });
  let modal = null; let fileInputs = 0; let fields = null;
  if (await open.count()) {
    await open.first().click(); await p.waitForTimeout(2600);
    modal = await shot(P, p, TAG, 'X-01-media-upload-modal', { defect: 'X-01', full: true });
    fileInputs = await p.locator('input[type="file"]').count();
    fields = await p.evaluate(() => [...document.querySelectorAll('input,select,textarea')].filter((e) => e.offsetParent || e.type === 'file')
      .map((e) => `${e.tagName}:${e.type}${e.required ? ':required' : ''}`));
  }
  rec('media', { pageButtons: d.buttons.slice(0, 12), modal, fileInputs, fields, note: 'file upload is the X-01 gate — no binary is uploaded to production storage in this campaign' });
});

// ── PARENT JOURNAL COMPOSER ───────────────────────────────────────────────
await T('journal', async () => {
  await goto(P, p, `${B}/teacher/children/${CH}`, TAG, 'child-detail-for-journal', { full: true });
  const d = await p.evaluate(DUMP);
  const open = p.locator('button', { hasText: /Kundalik|Jurnal|Ota-ona|Yozuv/i });
  if (await open.count()) {
    await open.first().click(); await p.waitForTimeout(2600);
    const modal = await shot(P, p, TAG, 'parent-journal-composer', { full: true });
    const fields = await fillAll('2026-08-14');
    const filled = await shot(P, p, TAG, 'parent-journal-filled', { full: true });
    since();
    const sub = p.locator('button', { hasText: /Yubor|Saqla|Joyla/i });
    if (await sub.count()) { await sub.first().click(); await p.waitForTimeout(5000); }
    rec('journal', { modal, fields, filled, net: since(), after: await shot(P, p, TAG, 'parent-journal-result', { full: true }) });
  } else rec('journal', { openable: false, buttons: d.buttons.slice(0, 16) });
});

// ── MONITORING: bulk fill + weekly tab ────────────────────────────────────
await T('bulkfill', async () => {
  await goto(P, p, `${B}/teacher/monitoring`, TAG, 'monitoring-for-bulkfill', { full: true });
  const bulk = p.locator('button').filter({ hasText: /Hammasini birga/ });
  if (await bulk.count()) {
    await bulk.first().click(); await p.waitForTimeout(2600);
    const modal = await shot(P, p, TAG, 'monitoring-bulk-fill-modal', { full: true });
    const opts = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => /^[0-5]/.test(x.innerText.trim())); b.slice(0, 8).forEach((x) => x.click()); return b.length; });
    since();
    const sub = p.locator('button', { hasText: /Saqla|Qo'lla|Tasdiq/i });
    if (await sub.count()) { await sub.first().click(); await p.waitForTimeout(4500); }
    rec('bulkfill', { modal, optionButtons: opts, net: since(), after: await shot(P, p, TAG, 'monitoring-bulk-fill-result', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|xato[^\n]*)/i) || [])[0] ?? null });
  } else rec('bulkfill', { openable: false });
  for (const tab of ['Kunlik', 'Haftalik']) {
    const t = p.locator('button', { hasText: new RegExp(`^${tab}$`) });
    if (await t.count()) { await t.first().click(); await p.waitForTimeout(3000); rec(`monitoring-tab-${tab}`, { shot: await shot(P, p, TAG, `monitoring-tab-${tab}`, { full: true }), head: (await text(p)).slice(0, 160) }); }
  }
});

// ── MONTHLY MILESTONES (inside IRR) ───────────────────────────────────────
await T('milestones', async () => {
  await goto(P, p, `${B}/teacher/children/${CH}/irr`, TAG, 'irr-for-milestones', { full: true });
  const tabs = await p.locator('button').evaluateAll((e) => e.map((b) => b.innerText.trim()).filter((t) => t && t.length < 30));
  const ms = p.locator('button', { hasText: /Oylik|Milestone|Bosqich|Maqsad/i });
  let s = null;
  if (await ms.count()) { await ms.first().click(); await p.waitForTimeout(3000); s = await shot(P, p, TAG, 'irr-monthly-milestones', { full: true }); }
  rec('milestones', { tabs: tabs.slice(0, 20), shot: s });
});

// ── SETTINGS: profile form, password form, notification prefs ─────────────
await T('settings', async () => {
  for (const [tab, label] of [['profile', 'men-profile'], ['settings', 'men-settings']]) {
    await goto(P, p, `${B}/teacher/men?tab=${tab}`, TAG, `settings-${label}`, { full: true });
    const d = await p.evaluate(DUMP);
    rec(`settings-${tab}`, { buttons: d.buttons.slice(0, 14), inputs: d.inputs.slice(0, 14) });
  }
  // notification preference toggle — flip one and confirm it persists a request
  const toggles = p.locator('input[type="checkbox"]');
  const n = await toggles.count();
  if (n) {
    const beforeState = await toggles.first().isChecked();
    since();
    await toggles.first().click({ force: true });
    await p.waitForTimeout(3500);
    rec('notification-toggle', { count: n, beforeState, afterState: await toggles.first().isChecked(), net: since(), shot: await shot(P, p, TAG, 'notification-preference-toggled', { full: true }) });
  }
  // password form: wrong current password must be rejected
  await goto(P, p, `${B}/teacher/change-password`, TAG, 'password-form', { full: true });
  const pw = p.locator('input[type="password"]');
  const pc = await pw.count();
  if (pc >= 2) {
    await pw.nth(0).fill('WrongPassword@1');
    for (let i = 1; i < pc; i++) await pw.nth(i).fill('NewPass@2026x');
    const filled = await shot(P, p, TAG, 'password-wrong-current-filled', { full: true });
    since();
    await p.locator('button[type="submit"], button', { hasText: /O'zgartir|Saqla/i }).first().click().catch(() => {});
    await p.waitForTimeout(4000);
    rec('password-wrong-current', { inputs: pc, filled, net: since(), after: await shot(P, p, TAG, 'password-wrong-current-rejected', { full: true }), msg: ((await text(p)).match(/(noto'g'ri[^\n]*|xato[^\n]*|joriy[^\n]*)/i) || [])[0] ?? null });
  }
});

save(P, 'p3i.json', out);
await c.close();
await browser.close();
console.log('P3i DONE');
