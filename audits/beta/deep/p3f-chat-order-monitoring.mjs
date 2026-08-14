// P3f — chat ordering scoped to the message pane only, scrollback, and the
// monitoring/IRR saves that P3e failed to reach.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3f', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 700)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);

await T('chat-order', async () => {
  await goto(P, p, `${B}/teacher/xabar?tab=chat`, TAG, 'chat-order-list');
  await p.locator('button', { hasText: /Ergasheva/ }).first().click();
  await p.waitForTimeout(4000);
  // the message pane is the scrollable column; find it, then read bubbles in DOM order
  const pane = await p.evaluate(() => {
    const el = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && d.clientHeight > 200)
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    if (!el) return null;
    el.dataset.qaPane = '1';
    return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop };
  });
  const bubbles = await p.evaluate(() => {
    const pane = document.querySelector('[data-qa-pane="1"]'); if (!pane) return [];
    return [...pane.querySelectorAll('div')].map((d) => (d.innerText || '').trim())
      .filter((t) => /\n\d{2}:\d{2}$/.test(t)).map((t) => { const L = t.split('\n'); return { time: L[L.length - 1], body: L[0].slice(0, 46) }; });
  });
  const times = bubbles.map((b) => b.time);
  rec('chat-pane', { pane, bubbleCount: bubbles.length, times, first: bubbles[0], last: bubbles[bubbles.length - 1] });
  const atBottom = await p.evaluate(() => { const e = document.querySelector('[data-qa-pane="1"]'); return e ? e.scrollHeight - e.scrollTop - e.clientHeight < 60 : null; });
  const bottomShot = await shot(P, p, TAG, 'chat-opens-at-latest-message');
  await p.evaluate(() => { const e = document.querySelector('[data-qa-pane="1"]'); if (e) e.scrollTop = 0; });
  await p.waitForTimeout(2500);
  const topShot = await shot(P, p, TAG, 'chat-scrollback-to-oldest');
  const topText = await p.evaluate(() => { const e = document.querySelector('[data-qa-pane="1"]'); return e ? (e.innerText || '').slice(0, 220) : null; });
  rec('chat-scrollback', { opensAtBottom: atBottom, bottomShot, topShot, topText });
});

await T('monitoring-save', async () => {
  await goto(P, p, `${B}/teacher/monitoring`, TAG, 'monitoring-before-save', { full: true });
  const btns = await p.locator('button').evaluateAll((e) => e.map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 20));
  await p.locator('button', { hasText: /Baholash/ }).first().click();
  await p.waitForTimeout(2600);
  const modal = await shot(P, p, TAG, 'monitoring-rating-modal', { full: true });
  const clicked = await p.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter((b) => /^[0-5]\b/.test((b.innerText || '').trim()));
    bs.slice(0, 6).forEach((b) => b.click()); return bs.length;
  });
  await p.waitForTimeout(900);
  const filled = await shot(P, p, TAG, 'monitoring-rating-filled', { full: true });
  const saved = await p.locator('button', { hasText: /Saqla/ }).count();
  if (saved) { await p.locator('button', { hasText: /Saqla/ }).first().click(); await p.waitForTimeout(4000); }
  rec('monitoring-save', { btns, optionButtons: clicked, modal, filled, saveBtns: saved, after: await shot(P, p, TAG, 'monitoring-rating-result', { full: true }), body: (await text(p)).slice(0, 200) });
});

await T('irr-save', async () => {
  await goto(P, p, `${B}/teacher/children/5eed0c9a-fe3e-4031-8f5c-aac195c36b31/irr`, TAG, 'irr-before-save', { full: true });
  const n = await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter((b) => /^[0-4] /.test((b.innerText || '').trim())); bs.slice(0, 10).forEach((b) => b.click()); return bs.length; });
  await p.waitForTimeout(800);
  const filled = await shot(P, p, TAG, 'irr-filled', { full: true });
  await p.locator('button', { hasText: /^Saqlash$/ }).first().click();
  await p.waitForTimeout(4500);
  rec('irr-save', { optionButtons: n, filled, after: await shot(P, p, TAG, 'irr-save-result', { full: true }), body: (await text(p)).slice(0, 220) });
});

save(P, 'p3f.json', out);
await c.close(); await browser.close(); console.log('P3f DONE');
