// P3e — the collision witness (C7), one creation of each teacher artefact,
// and the long chat thread with a parent logged in at the same time.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P3');
const B = PORTALS.teacher;
const TAG = 'teacher-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3e', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 320)); };
const T = async (label, fn) => { try { await fn(); } catch (e) { rec(`${label}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);

// ── C7: the collision, seen on the teacher's own screen ────────────────────
await T('collision', async () => {
  await goto(P, p, `${B}/teacher/attendance`, TAG, 'collision-open');
  await p.locator('input[type="date"]').first().fill('2026-08-11');
  await p.waitForTimeout(2800);
  const card = p.locator('button[aria-label^="Gulnoza Ergasheva:"]').first();
  const aria = await card.getAttribute('aria-label');
  const f = await shot(P, p, TAG, 'D-27-teacher-sees-receptions-value', { defect: 'D-27', full: true });
  rec('C7-collision-witness', {
    date: '2026-08-11', ariaOnTeacherScreen: aria, shot: f,
    note: 'teacher set sick, then absent; reception then POSTed present. DB status=present, markedBy still tarbiyachi1@tmm3.uz',
  });
});

// ── one creation of each teacher artefact ─────────────────────────────────
await T('activity', async () => {
  await goto(P, p, `${B}/teacher/reja?tab=activities`, TAG, 'create-activity-open');
  await p.locator('button', { hasText: /Individual reja qo'shish/ }).first().click();
  await p.waitForTimeout(2200);
  const before = await shot(P, p, TAG, 'create-activity-modal', { full: true });
  const sel = p.locator('select:visible');
  for (let i = 0; i < await sel.count(); i++) {
    const vals = await sel.nth(i).locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    if (vals.length) await sel.nth(i).selectOption(vals[0]);
  }
  const ti = p.locator('input[type="text"]:visible');
  if (await ti.count()) await ti.first().fill('Ertalabki doira — kengaytirilgan');
  const ta = p.locator('textarea:visible');
  if (await ta.count()) await ta.first().fill('Guruh bilan salomlashish va kun tartibini ko‘rib chiqish.');
  const num = p.locator('input[type="number"]:visible');
  if (await num.count()) await num.first().fill('25');
  const filled = await shot(P, p, TAG, 'create-activity-filled', { full: true });
  await p.locator('button[type="submit"]:visible').first().click().catch(() => {});
  await p.waitForTimeout(4000);
  rec('create-activity', { before, filled, after: await shot(P, p, TAG, 'create-activity-result', { full: true }), body: (await text(p)).slice(0, 250) });
});

await T('meal', async () => {
  await goto(P, p, `${B}/teacher/reja?tab=meals`, TAG, 'create-meal-open');
  await p.locator('button', { hasText: /Taom qo'shish/ }).first().click();
  await p.waitForTimeout(2200);
  const sel = p.locator('select:visible');
  for (let i = 0; i < await sel.count(); i++) {
    const vals = await sel.nth(i).locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    if (vals.length) await sel.nth(i).selectOption(vals[0]);
  }
  const ti = p.locator('input[type="text"]:visible');
  if (await ti.count()) await ti.first().fill('Sabzavotli sho‘rva');
  const filled = await shot(P, p, TAG, 'create-meal-filled', { full: true });
  await p.locator('button[type="submit"]:visible').first().click().catch(() => {});
  await p.waitForTimeout(4000);
  rec('create-meal', { filled, after: await shot(P, p, TAG, 'create-meal-result', { full: true }) });
});

await T('monitoring', async () => {
  await goto(P, p, `${B}/teacher/monitoring`, TAG, 'monitoring-open', { full: true });
  const d = await p.evaluate(DUMP);
  const add = p.locator('button', { hasText: /Saqlash|Qo'shish|To'ldirish/ });
  let f = null;
  if (await add.count()) { await add.first().click(); await p.waitForTimeout(2500); f = await shot(P, p, TAG, 'monitoring-action', { full: true }); }
  rec('monitoring', { controls: d.buttons.slice(0, 14), acted: f });
});

await T('reflection', async () => {
  await goto(P, p, `${B}/teacher/men?tab=reflection`, TAG, 'reflection-open', { full: true });
  const ta = p.locator('textarea:visible');
  if (await ta.count()) await ta.first().fill('Bugun guruh bilan ertalabki doira yaxshi o‘tdi, ikki bola yangi mashqni o‘zlashtirdi.');
  const filled = await shot(P, p, TAG, 'reflection-filled', { full: true });
  const send = p.locator('button', { hasText: /Jo'natish|Saqlash|Qoralama/ });
  if (await send.count()) { await send.first().click(); await p.waitForTimeout(3500); }
  rec('reflection', { filled, after: await shot(P, p, TAG, 'reflection-result', { full: true }) });
});

await T('irr', async () => {
  await goto(P, p, `${B}/teacher/children/5eed0c9a-fe3e-4031-8f5c-aac195c36b31/irr`, TAG, 'irr-open', { full: true });
  const d = await p.evaluate(DUMP);
  rec('irr', { controls: d.buttons.slice(0, 12), inputs: d.inputs.length, head: (await text(p)).slice(0, 260) });
});

// ── chat: long thread ordering + scrollback + live parent ─────────────────
await T('chat', async () => {
  await goto(P, p, `${B}/teacher/xabar?tab=chat`, TAG, 'chat-list', { full: true });
  const convs = await p.locator('button').evaluateAll((els) => els.map((e) => (e.innerText || '').trim().split('\n')[0]).filter((x) => x && x.length < 40));
  // open the first parent conversation
  await p.locator('button', { hasText: /Ergasheva|Rahimova|Toshmatova|Qodirova/ }).first().click();
  await p.waitForTimeout(3500);
  const opened = await shot(P, p, TAG, 'chat-thread-top', { full: true });
  const msgs = await p.evaluate(() => [...document.querySelectorAll('button,div')]
    .map((e) => (e.innerText || '').trim())
    .filter((t) => t.length > 25 && t.length < 200 && /[a-z]/.test(t)).slice(0, 40));
  const order = await p.evaluate(() => {
    const times = [...document.querySelectorAll('div')].map((d) => (d.innerText || '').trim()).filter((t) => /^\d{2}:\d{2}$/.test(t));
    return times;
  });
  rec('chat-thread', { conversations: convs.length, opened, visibleMessageBlocks: msgs.length, timestamps: order.slice(0, 25) });

  // parent logs in at the same time, teacher sends, parent reloads
  const { c: c2, p: p2 } = await ctx(P, browser, 'parent-live');
  await login(P, p2, 'parent', 'otaona11@tmm3.uz', PW, 'parent-live', { tab: /Ota-ona|Parent/i });
  await goto(P, p2, `${B}/chat`, 'parent-live', 'parent-chat-before-live-message', { full: true });
  const msg = `Kuzatuv: bugun ${new Date().toISOString().slice(11, 16)} da yangi mashq boshlandi.`;
  await p.locator('textarea').last().fill(msg);
  await p.locator('button[aria-label="Yuborish"]').first().click();
  await p.waitForTimeout(4000);
  const teacherSent = await shot(P, p, TAG, 'chat-teacher-sent-while-parent-online', { full: true });
  await p2.waitForTimeout(3000);
  const parentLive = await shot(P, p2, 'parent-live', 'parent-chat-live-no-reload', { full: true });
  const arrivedLive = (await text(p2)).includes(msg.slice(0, 24));
  await p2.reload({ waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(5000);
  const parentReloaded = await shot(P, p2, 'parent-live', 'parent-chat-after-reload', { full: true });
  const arrivedAfterReload = (await text(p2)).includes(msg.slice(0, 24));
  rec('chat-live-delivery', { msg, teacherSent, parentLive, arrivedLive, parentReloaded, arrivedAfterReload });
  await c2.close();
});

save(P, 'p3e.json', out);
await c.close();
await browser.close();
console.log('P3e DONE');
