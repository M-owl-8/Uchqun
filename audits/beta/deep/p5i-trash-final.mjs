// P5i — delete -> Trash -> restore on a seed reception. Delete is an icon-only
// button carrying title="O'chirish" (ReceptionManagement.jsx:517), so target the
// title attribute, not innerText.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P5'); const B = PORTALS.admin; const TAG = 'admin-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5i', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 560)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 260); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
const dialogs = []; p.on('dialog', async (d) => { dialogs.push({ type: d.type(), message: d.message().slice(0, 140) }); await d.accept(); });
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

await goto(P, p, `${B}/admin/receptions`, TAG, 'trash-cycle-start', { full: true });
const titles = await p.evaluate(() => [...document.querySelectorAll('button[title]')].map((b) => b.getAttribute('title')));
const namesBefore = await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+(ova|ov)\b/g) || []));
rec('before', { buttonTitles: [...new Set(titles)], namesBefore, shot: await shot(P, p, TAG, 'receptions-before-delete', { full: true }) });

since(); dialogs.length = 0;
await p.locator('button[title*="chirish" i]').first().click();
await p.waitForTimeout(3500);
const dlgShot = await shot(P, p, TAG, 'reception-delete-confirm', { full: true });
const modalBtns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.innerText.trim()).map((b) => b.innerText.trim().slice(0, 26)));
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Ha|Tasdiqlash|Ha, o.chirish|O.chirish)$/i.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
await p.waitForTimeout(6000);
rec('deleted', { dialogs: [...dialogs], dlgShot, modalBtns, net: since(), namesAfter: await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+(ova|ov)\b/g) || [])), shot: await shot(P, p, TAG, 'receptions-after-delete', { full: true }) });

await goto(P, p, `${B}/admin/trash`, TAG, 'trash-after-delete', { full: true });
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Qabulxona/.test(x.innerText)); if (b) b.click(); });
await p.waitForTimeout(4000);
const tb = (await text(p)).replace(/\n/g, ' | ');
const rTitles = await p.evaluate(() => [...document.querySelectorAll('button[title]')].map((b) => b.getAttribute('title')));
const rTexts = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.innerText.trim()).map((b) => b.innerText.trim().slice(0, 24)));
rec('trash-listing', { buttonTitles: [...new Set(rTitles)], buttonTexts: rTexts, empty: /yozuvlar yo'q/.test(tb), tail: tb.slice(-380), shot: await shot(P, p, TAG, 'trash-receptions-tab', { full: true }) });

since(); dialogs.length = 0;
const clicked = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && (/Tikla|Restore|Qaytar/i.test(x.innerText) || /tikla/i.test(x.getAttribute('title') || ''))); if (b.length) { b[0].click(); return b[0].innerText.trim() || b[0].getAttribute('title'); } return null; });
await p.waitForTimeout(3000);
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Ha|Tasdiqlash|Tiklash)$/i.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
await p.waitForTimeout(6000);
rec('restore', { clicked, dialogs: [...dialogs], net: since(), shot: await shot(P, p, TAG, 'trash-after-restore', { full: true }) });

await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-after-restore', { full: true });
rec('verified', { namesAfter: await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+(ova|ov)\b/g) || [])), shot: await shot(P, p, TAG, 'receptions-restored', { full: true }) });
save(P, 'p5i.json', out); await c.close(); await browser.close(); console.log('P5i DONE');
