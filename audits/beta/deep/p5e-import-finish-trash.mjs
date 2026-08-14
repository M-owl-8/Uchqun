// P5e — finish the import at the confirm step, verify the rows landed, then
// exercise delete -> Trash -> restore on one of the imported children.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
import path from 'path';

const P = phase('P5');
const B = PORTALS.admin;
const TAG = 'admin-tmm3';
const F = (n) => path.resolve('audits/beta/deep/fixtures', n);
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5e', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const net = [];
p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 400); } catch { /* noop */ } net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };

await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

// ── finish the import ─────────────────────────────────────────────────────
await T('import-finish', async () => {
  await goto(P, p, `${B}/admin/import`, TAG, 'import-finish-entry', { full: true });
  for (let i = 0; i < 6; i++) {
    if (await p.locator('input[type="file"]').count()) break;
    const back = p.locator('button', { hasText: /^Orqaga$|^Bekor qilish$/ });
    if (!(await back.count())) break;
    await back.first().click(); await p.waitForTimeout(1800);
  }
  await p.locator('input[type="file"]').first().setInputFiles(F('import-valid.csv'));
  await p.waitForTimeout(1500);
  await p.locator('button', { hasText: /Tekshirish/ }).first().click();
  await p.waitForTimeout(9000);
  await p.locator('button', { hasText: /davom etish/i }).first().click();
  await p.waitForTimeout(3500);
  const confirmShot = await shot(P, p, TAG, 'import-confirm-step', { full: true });
  const confirmText = (await text(p)).replace(/\n/g, ' | ').slice(-200);
  since();
  await p.locator('button', { hasText: /^Boshlash$/ }).first().click();
  await p.waitForTimeout(5000);
  const startNet = since();
  const polls = [];
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(4000); polls.push((await text(p)).replace(/\n/g, ' | ').slice(-220)); }
  rec('import-finish', { confirmShot, confirmText, startNet, polls: polls.slice(-2), final: await shot(P, p, TAG, 'import-completed', { full: true }) });
});

// ── did the children land, and are they visible in the admin list? ────────
await T('verify-imported', async () => {
  await goto(P, p, `${B}/admin/parents`, TAG, 'parents-after-import', { full: true });
  const search = p.locator('input[type="text"], input[type="search"]').first();
  if (await search.count()) { await search.fill('SIM-'); await p.waitForTimeout(3500); }
  const body = (await text(p)).replace(/\n/g, ' | ');
  rec('verify-imported', {
    shot: await shot(P, p, TAG, 'parents-search-SIM', { full: true }),
    simMentions: (body.match(/SIM-[A-Za-z]+/g) || []).slice(0, 8),
    body: body.slice(0, 400),
  });
});

// ── delete -> Trash -> restore ────────────────────────────────────────────
await T('trash-cycle', async () => {
  await goto(P, p, `${B}/admin/trash`, TAG, 'trash-before', { full: true });
  const beforeBody = (await text(p)).replace(/\n/g, ' | ');
  const d = await p.evaluate(DUMP);
  rec('trash-before', { shot: await shot(P, p, TAG, 'trash-initial-state', { full: true }), buttons: d.buttons, body: beforeBody.slice(0, 320) });

  // delete a SIM- child from the parents/children surface
  await goto(P, p, `${B}/admin/parents`, TAG, 'trash-find-target', { full: true });
  const search = p.locator('input[type="text"], input[type="search"]').first();
  if (await search.count()) { await search.fill('SIM-Malika'); await p.waitForTimeout(3500); }
  const found = (await text(p)).includes('SIM-Malika');
  const del = p.locator('button[title], button').filter({ hasText: /O'chir|Olib tashla/i });
  const delByTitle = p.locator('button[title*="chir" i]');
  since();
  let clicked = null;
  if (await delByTitle.count()) { await delByTitle.first().click(); clicked = 'title'; }
  else if (await del.count()) { await del.first().click(); clicked = 'text'; }
  await p.waitForTimeout(2500);
  const confirmShot = await shot(P, p, TAG, 'trash-delete-confirm', { full: true });
  const conf = p.locator('button').filter({ hasText: /^(Ha|Tasdiqlash|O'chirish)$/ });
  if (await conf.count()) { await conf.first().click(); await p.waitForTimeout(4000); }
  rec('delete-attempt', { found, clicked, confirmShot, net: since(), after: await shot(P, p, TAG, 'trash-after-delete', { full: true }) });

  await goto(P, p, `${B}/admin/trash`, TAG, 'trash-after-delete-view', { full: true });
  const trashBody = (await text(p)).replace(/\n/g, ' | ');
  const restore = p.locator('button').filter({ hasText: /Tiklash|Qayta tikla|Restore/i });
  const restoreCount = await restore.count();
  since();
  if (restoreCount) { await restore.first().click(); await p.waitForTimeout(4000); }
  rec('trash-and-restore', {
    trashListed: trashBody.includes('SIM-Malika'),
    trashBody: trashBody.slice(0, 400),
    restoreButtons: restoreCount,
    net: since(),
    afterRestore: await shot(P, p, TAG, 'trash-after-restore', { full: true }),
  });

  await goto(P, p, `${B}/admin/parents`, TAG, 'verify-restored', { full: true });
  const s2 = p.locator('input[type="text"], input[type="search"]').first();
  if (await s2.count()) { await s2.fill('SIM-Malika'); await p.waitForTimeout(3500); }
  rec('verify-restored', { visible: (await text(p)).includes('SIM-Malika'), shot: await shot(P, p, TAG, 'restored-child-visible', { full: true }) });
});

save(P, 'p5e.json', out);
await c.close();
await browser.close();
console.log('P5e DONE');
