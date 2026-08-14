import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 240); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
await goto(P, p, `${B}/teacher/men?tab=reflection`, TAG, 'journal-final-open', { full: true });
const state = () => p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /natish/.test(x.innerText)); return b ? { label: b.innerText.trim(), disabled: b.disabled } : null; });
// subject (text input inside the composer) + body (composer textarea)
const subj = p.locator("input:not([type])").first();
await subj.click(); await subj.type('Bugungi mashgulot', { delay: 12 });
const bodies = p.locator('textarea');
const bt = bodies.nth(await bodies.count() - 1);
await bt.click(); await bt.type('QA-P3N: ikki bola yangi konikmani sinab kordi, uyda ham takrorlash foydali boladi.', { delay: 8 });
await p.waitForTimeout(900);
out.picked = await p.evaluate(() => { const cb = [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.offsetParent && /[A-Z][a-z]+\s+[A-Z]/.test((e.closest('label')?.innerText || e.parentElement?.innerText || ''))); cb.slice(0, 2).forEach((e) => { if (!e.checked) e.click(); }); return cb.length; });
await p.waitForTimeout(1200);
out.ready = await state();
out.shotReady = await shot(P, p, TAG, 'journal-subject-body-children-ready', { full: true });
console.log('ready', JSON.stringify(out.ready));
net.length = 0;
if (out.ready && !out.ready.disabled) { await p.locator('button', { hasText: /natish/ }).first().click(); await p.waitForTimeout(7000); }
out.net = [...net];
out.after = await shot(P, p, TAG, 'journal-sent-to-two-parents', { full: true });
out.toast = ((await text(p)).match(/(muvaffaqiyat[^\n]*|yuborildi[^\n]*|xato[^\n]*)/i) || [])[0] ?? null;
console.log('net', JSON.stringify(out.net)); console.log('toast', out.toast);
ev(P, { kind: 'p3n', v: { ready: out.ready, net: out.net } });
save(P, 'p3n.json', out); await c.close(); await browser.close();
