// P4g — the privacy-consent withdrawal actually exercised. Settings.jsx:131 uses
// window.confirm(), which Playwright auto-dismisses; accept it explicitly.
// Reversible: consent is re-granted through the modal at the end.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, acceptParentConsent, PORTALS, PW, DESKTOP } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const TAG = 'parent-desktop'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4g', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 460)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG, DESKTOP);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 190); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const dialogs = [];
p.on('dialog', async (d) => { dialogs.push({ type: d.type(), message: d.message().slice(0, 160) }); await d.accept(); });

await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
await goto(P, p, `${B}/settings`, TAG, 'consent-flow-before', { full: true });
const before = (await text(p)).match(/Rozi bo'lingan sana:[^\n]*/)?.[0] ?? null;
net.length = 0;
await p.locator('button', { hasText: /Rozilikni bekor qilish/ }).first().click();
await p.waitForTimeout(4000);
rec('withdraw', { consentLineBefore: before, dialogs: [...dialogs], net: [...net], shot: await shot(P, p, TAG, 'consent-withdrawn', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|bekor[^\n]*|xato[^\n]*)/i) || [])[0] ?? null });
await p.waitForTimeout(3500);
rec('after-withdraw-url', { url: new URL(p.url()).pathname, shot: await shot(P, p, TAG, 'consent-withdrawn-redirect', { full: true }) });

// log back in — the consent modal must be presented again
const li = await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
await p.waitForTimeout(2500);
const modalPresent = await p.locator('[aria-labelledby="privacy-consent-title"]').count();
rec('reprompt', { loginOk: li.ok, modalPresent, shot: await shot(P, p, TAG, 'PrivacyConsentModal-represented-at-login', { full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 260) });

// re-grant so the tenant is left as found
net.length = 0;
const re = await acceptParentConsent(P, p, TAG);
await p.waitForTimeout(2500);
await goto(P, p, `${B}/settings`, TAG, 'consent-restored', { full: true });
const after = (await text(p)).match(/Rozi bo'lingan sana:[^\n]*/)?.[0] ?? null;
rec('re-granted', { reaccept: re, net: [...net], consentLineAfter: after, restored: !!after });
save(P, 'p4g.json', out); await c.close(); await browser.close(); console.log('P4g DONE');
