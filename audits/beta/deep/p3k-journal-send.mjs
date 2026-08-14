import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3k', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 800)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 200); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
await goto(P, p, `${B}/teacher/men?tab=reflection`, TAG, 'journal-send-open', { full: true });
// select two children, write a note, then use the real send control
const picked = await p.evaluate(() => { const cb = [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.offsetParent); cb.slice(0, 2).forEach((e) => { if (!e.checked) e.click(); }); return cb.length; });
await p.evaluate(() => { const t = [...document.querySelectorAll('textarea')].filter((e) => e.offsetParent)[0]; if (t) { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'QA-P3K: bugungi mashg‘ulotda ikki bola yangi ko‘nikmani sinab ko‘rdi.'); t.dispatchEvent(new Event('input', { bubbles: true })); } });
await p.waitForTimeout(900);
const filled = await shot(P, p, TAG, 'journal-two-children-selected', { full: true });
const label = await p.locator('button', { hasText: /Jo.natish/ }).first().innerText();
net.length = 0;
await p.locator('button', { hasText: /Jo.natish/ }).first().click();
await p.waitForTimeout(5500);
rec('journal-send', { checkboxes: picked, sendLabel: label, filled, net: [...net], after: await shot(P, p, TAG, 'journal-send-result', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|yuborildi[^\n]*|xato[^\n]*)/i) || [])[0] ?? null });
// draft path
net.length = 0;
await p.locator('button', { hasText: /Qoralama/ }).first().click().catch(() => {});
await p.waitForTimeout(4000);
rec('journal-draft', { net: [...net], shot: await shot(P, p, TAG, 'journal-draft-saved', { full: true }) });
save(P, 'p3k.json', out); await c.close(); await browser.close();
