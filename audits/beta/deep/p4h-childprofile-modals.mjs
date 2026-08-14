import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW, DESKTOP } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const TAG = 'parent-desktop'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4h', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG, DESKTOP);
await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
await goto(P, p, `${B}/child`, TAG, 'childprofile-full', { full: true });
const d = await p.evaluate(DUMP);
rec('childprofile-controls', { buttons: d.buttons, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 300) });
// MessagesModal — reachable only when the parent already has messages (we sent one in P4f)
const msgBtn = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /Xabarlar|Mening xabar|xabarim/i.test(e.innerText || '')); if (b) { b.click(); return b.innerText.trim().slice(0, 30); } return null; });
await p.waitForTimeout(2800);
rec('messages-modal', { trigger: msgBtn, shot: await shot(P, p, TAG, 'parent-messages-modal', { full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 260) });
await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
// EmotionalMonitoringSection + LogoutModal
const emo = await p.evaluate(() => { const e = [...document.querySelectorAll('*')].find((x) => /Emotsional|kayfiyat/i.test(x.textContent || '') && x.children.length < 6); return e ? (e.textContent || '').trim().slice(0, 90) : null; });
rec('emotional-section', emo);
const lo = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /Chiqish|logout/i.test(e.innerText || '')); if (b) { b.click(); return b.innerText.trim(); } return null; });
await p.waitForTimeout(2500);
rec('logout-modal', { trigger: lo, shot: await shot(P, p, TAG, 'parent-logout-modal', { full: true }), url: new URL(p.url()).pathname, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 200) });
save(P, 'p4h.json', out); await c.close(); await browser.close(); console.log('P4h DONE');
