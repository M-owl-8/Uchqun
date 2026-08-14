import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3o', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 620)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 200); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
const fillAll = () => p.evaluate(() => { const set = (el, v) => { const pr = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(pr.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }; const s = []; for (const e of [...document.querySelectorAll('input,select,textarea')].filter((x) => x.offsetParent && x.type !== 'file')) { if (e.tagName === 'SELECT') { const o = [...e.options].map((x) => x.value).filter(Boolean); if (o.length) set(e, o[0]); } else if (e.type === 'date') set(e, '2026-08-14'); else if (e.type === 'time') set(e, '10:00'); else if (e.type === 'number') set(e, '30'); else if (e.type === 'checkbox') { if (!e.checked) e.click(); } else set(e, 'QA-P3O tekshiruv yozuvi'); s.push(`${e.tagName}:${e.type || 'text'}`); } return s; });
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);

// TherapyFormModal — the "Yaratish" (create) path, distinct from "Tayinlash"
await goto(P, p, `${B}/teacher/reja?tab=therapy`, TAG, 'therapy-create-open', { full: true });
await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
await p.waitForTimeout(3000);
const tModal = await shot(P, p, TAG, 'therapy-create-modal', { full: true });
const tFields = await fillAll();
const tFilled = await shot(P, p, TAG, 'therapy-create-filled', { full: true });
since();
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /Yaratish|Saqlash/.test(x.innerText) && !x.disabled); if (b.length) b[b.length - 1].click(); });
await p.waitForTimeout(6000);
rec('therapy-create-modal', { tModal, tFields, tFilled, net: since(), after: await shot(P, p, TAG, 'therapy-create-outcome', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|xato[^\n]*|majburiy[^\n]*)/i) || [])[0] ?? null });

// MessageModal / MessagesModal — "Davlatga xabar yuborish" from the profile tab
await goto(P, p, `${B}/teacher/men?tab=profile`, TAG, 'gov-message-open', { full: true });
await p.locator('button', { hasText: /Davlatga xabar/ }).first().click();
await p.waitForTimeout(3000);
const mModal = await shot(P, p, TAG, 'gov-message-modal', { full: true });
const mFields = await fillAll();
const mFilled = await shot(P, p, TAG, 'gov-message-filled', { full: true });
since();
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /Yubor|Saqla/.test(x.innerText) && !x.disabled); if (b.length) b[b.length - 1].click(); });
await p.waitForTimeout(6000);
rec('gov-message', { mModal, mFields, mFilled, net: since(), after: await shot(P, p, TAG, 'gov-message-outcome', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|yuborildi[^\n]*|xato[^\n]*)/i) || [])[0] ?? null });
save(P, 'p3o.json', out); await c.close(); await browser.close();
