// P5m — the admin surfaces the route sweep only rendered: therapy, IRR,
// documents queue, government messages, profile/settings forms, activity feed,
// communications, school profile, ratings, groups.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P5');
const B = PORTALS.admin;
const TAG = 'admin-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5m', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 380)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const net = [];
p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 220); } catch { /* noop */ } net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

const fillAll = () => p.evaluate(() => {
  const set = (el, v) => { const pr = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(pr.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const seen = [];
  for (const e of [...document.querySelectorAll('input,select,textarea')].filter((x) => x.offsetParent && x.type !== 'file' && x.type !== 'checkbox')) {
    if (e.tagName === 'SELECT') { const o = [...e.options].map((x) => x.value).filter(Boolean); if (o.length) set(e, o[0]); }
    else if (e.type === 'date') set(e, '2026-08-14');
    else if (e.type === 'number') set(e, '3');
    else if (e.type === 'email') set(e, 'sim.tekshiruv@tmm3.uz');
    else if (e.type === 'tel') set(e, '+998901000199');
    else set(e, 'QA-P5M tekshiruv');
    seen.push(`${e.tagName}:${e.type || 'text'}`);
  }
  return seen;
});

// ── therapy management ────────────────────────────────────────────────────
await T('therapy', async () => {
  await goto(P, p, `${B}/admin/therapy`, TAG, 'therapy-admin', { full: true });
  const d = await p.evaluate(DUMP);
  const open = p.locator('button').filter({ hasText: /Yaratish|Qo'shish|Yangi/i });
  let modal = null; let netAfter = null;
  if (await open.count()) {
    await open.first().click(); await p.waitForTimeout(2600);
    modal = await shot(P, p, TAG, 'therapy-admin-modal', { full: true });
    await fillAll(); await p.waitForTimeout(600);
    since();
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /Saqlash|Yaratish/.test(x.innerText) && !x.disabled); if (b.length) b[b.length - 1].click(); });
    await p.waitForTimeout(5000);
    netAfter = since();
  }
  rec('therapy', { buttons: d.buttons.slice(0, 14), modal, net: netAfter, after: await shot(P, p, TAG, 'therapy-admin-result', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|xato[^\n]*|Validation[^\n]*)/i) || [])[0] ?? null });
});

// ── admin IRR ─────────────────────────────────────────────────────────────
await T('irr', async () => {
  await goto(P, p, `${B}/admin/irr`, TAG, 'admin-irr-list', { full: true });
  const d = await p.evaluate(DUMP);
  const body = (await text(p)).replace(/\n/g, ' | ');
  const first = p.locator('button, a').filter({ hasText: /Ko'rish|Tafsilot|Ochish/i });
  let opened = null;
  if (await first.count()) { await first.first().click(); await p.waitForTimeout(4000); opened = await shot(P, p, TAG, 'admin-irr-opened', { full: true }); }
  rec('irr', { buttons: d.buttons.slice(0, 12), body: body.slice(0, 300), opened });
});

// ── documents approval queue ──────────────────────────────────────────────
await T('documents', async () => {
  await goto(P, p, `${B}/admin/documents`, TAG, 'documents-queue', { full: true });
  const d = await p.evaluate(DUMP);
  const body = (await text(p)).replace(/\n/g, ' | ');
  rec('documents', { buttons: d.buttons, inputs: d.inputs, body: body.slice(0, 340), shot: await shot(P, p, TAG, 'documents-queue-state', { full: true }) });
});

// ── government messages ───────────────────────────────────────────────────
await T('gov-messages', async () => {
  await goto(P, p, `${B}/admin/messages`, TAG, 'gov-messages', { full: true });
  const d = await p.evaluate(DUMP);
  const body = (await text(p)).replace(/\n/g, ' | ');
  const first = p.locator('button').filter({ hasText: /QA-P3O|Javob|Ko'rish|Ochish/i });
  let opened = null;
  if (await first.count()) { await first.first().click(); await p.waitForTimeout(3500); opened = await shot(P, p, TAG, 'gov-message-opened', { full: true }); }
  rec('gov-messages', { buttons: d.buttons, body: body.slice(0, 340), opened, threadBody: opened ? (await text(p)).replace(/\n/g, ' | ').slice(-300) : null });
});

// ── profile + settings forms ──────────────────────────────────────────────
await T('profile', async () => {
  await goto(P, p, `${B}/admin/profile`, TAG, 'admin-profile', { full: true });
  const d = await p.evaluate(DUMP);
  rec('profile', { buttons: d.buttons, inputs: d.inputs, shot: await shot(P, p, TAG, 'admin-profile-state', { full: true }) });
});
await T('settings', async () => {
  await goto(P, p, `${B}/admin/settings`, TAG, 'admin-settings', { full: true });
  const d = await p.evaluate(DUMP);
  // wrong current password must be rejected
  const pw = p.locator('input[type="password"]');
  let pwNet = null;
  if (await pw.count() >= 2) {
    await pw.nth(0).fill('WrongPassword@1');
    for (let i = 1; i < await pw.count(); i++) await pw.nth(i).fill('NewPass@2026x');
    since();
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /Parolni/.test(x.innerText)); if (b) b.click(); });
    await p.waitForTimeout(4500);
    pwNet = since();
  }
  rec('settings', { buttons: d.buttons, inputs: d.inputs, passwordNet: pwNet, shot: await shot(P, p, TAG, 'admin-settings-password-rejected', { full: true }) });
});

// ── activity feed, communications, school profile, ratings, groups ────────
for (const [route, label] of [['/admin/activity', 'activity-feed'], ['/admin/communications', 'communications'], ['/admin/school', 'school-profile'], ['/admin/school-ratings', 'school-ratings'], ['/admin/groups', 'groups'], ['/admin/ai-warnings', 'ai-warnings'], ['/admin/teachers', 'teachers']]) {
  await T(label, async () => {
    const f = await goto(P, p, B + route, TAG, label, { full: true });
    const d = await p.evaluate(DUMP);
    rec(label, { shot: f, buttons: d.buttons.slice(0, 14), inputs: d.inputs.slice(0, 8), body: (await text(p)).replace(/\n/g, ' | ').slice(200, 520) });
  });
}

save(P, 'p5m.json', out);
await c.close();
await browser.close();
console.log('P5m DONE');
