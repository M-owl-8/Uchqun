import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 200); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
await goto(P, p, `${B}/teacher/men?tab=reflection`, TAG, 'journal-structure', { full: true });
out.structure = await p.evaluate(() => ({
  checkboxes: [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.offsetParent).map((e) => ({ name: e.name, checked: e.checked, label: (e.closest('label')?.innerText || e.parentElement?.innerText || '').trim().slice(0, 40) })),
  buttons: [...document.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => ({ t: e.innerText.trim().slice(0, 30), disabled: e.disabled })),
}));
console.log(JSON.stringify(out.structure, null, 1).slice(0, 2200));
// select the first two CHILD checkboxes (those whose label is a person name)
const sel = await p.evaluate(() => { const cb = [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.offsetParent && /[A-Z][a-z]+\s+[A-Z]/.test((e.closest('label')?.innerText || e.parentElement?.innerText || ''))); cb.slice(0, 2).forEach((e) => { if (!e.checked) e.click(); }); return cb.length; });
await p.evaluate(() => { const t = [...document.querySelectorAll('textarea')].filter((e) => e.offsetParent)[0]; if (t) { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'QA-P3L: bugungi mashgulotda ikki bola yangi konikmani sinab kordi.'); t.dispatchEvent(new Event('input', { bubbles: true })); } });
await p.waitForTimeout(1200);
out.selected = sel;
out.filled = await shot(P, p, TAG, 'journal-children-selected', { full: true });
out.sendState = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /natish/.test(x.innerText)); return b ? { label: b.innerText.trim(), disabled: b.disabled } : null; });
console.log('selected', sel, 'send', JSON.stringify(out.sendState));
net.length = 0;
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /natish/.test(x.innerText)); if (b && !b.disabled) b.click(); });
await p.waitForTimeout(6000);
out.net = [...net];
out.after = await shot(P, p, TAG, 'journal-send-result', { full: true });
out.toast = ((await text(p)).match(/(muvaffaqiyat[^\n]*|yuborildi[^\n]*|xato[^\n]*)/i) || [])[0] ?? null;
console.log('net', JSON.stringify(out.net), 'toast', out.toast);
ev(P, { kind: 'p3l', v: { selected: sel, net: out.net.length } });
save(P, 'p3l.json', out); await c.close(); await browser.close();
