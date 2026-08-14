import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW, DESKTOP } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const TAG = 'parent-desktop'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG, DESKTOP);
await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
await goto(P, p, `${B}/child`, TAG, 'D-38-my-messages-button-state');
out.buttonState = await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((e) => /Mening murojaatlarim/.test(e.innerText || ''));
  if (!b) return null;
  const cs = getComputedStyle(b);
  return { text: b.innerText.trim(), disabled: b.disabled, pointerEvents: cs.pointerEvents, opacity: cs.opacity, cursor: cs.cursor };
});
out.api = await p.evaluate(async () => {
  const g = async (u) => { const r = await fetch(u, { credentials: 'include' }); const t = await r.text(); return { u, s: r.status, len: t.length, b: t.slice(0, 220) }; };
  return [await g('/api/v1/parent/my-messages'), await g('/api/v1/parent/messages'), await g('/api/v1/parent/message-to-government')];
});
out.shot = await shot(P, p, TAG, 'D-38-my-messages-button-inert', { defect: 'D-38', full: true });
console.log('button:', JSON.stringify(out.buttonState));
console.log('api:', JSON.stringify(out.api, null, 1).slice(0, 900));
ev(P, { kind: 'p4i', v: out }); save(P, 'p4i.json', out); await c.close(); await browser.close();
