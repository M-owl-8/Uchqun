import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 200); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
await goto(P, p, `${B}/teacher/men?tab=reflection`, TAG, 'journal-typed-open', { full: true });
const state = async () => p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /natish/.test(x.innerText)); const t = [...document.querySelectorAll('textarea')].filter((e) => e.offsetParent)[0]; return { send: b ? { label: b.innerText.trim(), disabled: b.disabled } : null, textareaLen: t ? t.value.length : null, textareas: document.querySelectorAll('textarea').length }; });
out.s0 = await state();
// type into the note with real key events
const ta = p.locator('textarea').first();
await ta.click();
await ta.type('QA-P3M: bugungi mashgulotda ikki bola yangi konikmani sinab kordi.', { delay: 12 });
await p.waitForTimeout(900);
out.s1_afterTyping = await state();
out.shotTyped = await shot(P, p, TAG, 'journal-note-typed', { full: true });
// now select two children
out.picked = await p.evaluate(() => { const cb = [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.offsetParent && /[A-Z][a-z]+\s+[A-Z]/.test((e.closest('label')?.innerText || e.parentElement?.innerText || ''))); cb.slice(0, 2).forEach((e) => { if (!e.checked) e.click(); }); return cb.length; });
await p.waitForTimeout(1200);
out.s2_afterSelect = await state();
out.shotReady = await shot(P, p, TAG, 'journal-note-typed-and-selected', { full: true });
console.log('s0', JSON.stringify(out.s0)); console.log('s1', JSON.stringify(out.s1_afterTyping)); console.log('s2', JSON.stringify(out.s2_afterSelect));
net.length = 0;
if (out.s2_afterSelect.send && !out.s2_afterSelect.send.disabled) {
  await p.locator('button', { hasText: /natish/ }).first().click();
  await p.waitForTimeout(6000);
}
out.net = [...net];
out.after = await shot(P, p, TAG, 'journal-send-outcome', { full: true });
out.toast = ((await text(p)).match(/(muvaffaqiyat[^\n]*|yuborildi[^\n]*|xato[^\n]*)/i) || [])[0] ?? null;
console.log('net', JSON.stringify(out.net), 'toast', out.toast);
ev(P, { kind: 'p3m', v: { s2: out.s2_afterSelect, net: out.net.length } });
save(P, 'p3m.json', out); await c.close(); await browser.close();
