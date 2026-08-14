import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
await goto(P, p, `${B}/teacher/xabar?tab=chat`, TAG, 'chat-strict-list');
await p.locator('button', { hasText: /Ergasheva/ }).first().click();
await p.waitForTimeout(4500);
const seq = await p.evaluate(() => {
  const pane = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && d.clientHeight > 200)
    .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
  if (!pane) return null;
  const seen = new Set(); const rows = [];
  for (const d of pane.querySelectorAll('div')) {
    const t = (d.innerText || '').trim(); const L = t.split('\n');
    if (!/^\d{2}:\d{2}$/.test(L[L.length - 1])) continue;
    const key = t.slice(0, 90); if (seen.has(key)) continue; seen.add(key);
    rows.push({ date: /^M\d{2} \d{1,2}$/.test(L[0]) ? L[0] : null, time: L[L.length - 1], text: (L.find((x) => x.length > 20) || '').slice(0, 40) });
  }
  return rows;
});
const f = await shot(P, p, TAG, 'chat-order-strict', { full: true });
// carry the last seen date label forward, then check monotonicity
let cur = null; const norm = seq.map((r) => { if (r.date) cur = r.date; return { ...r, day: cur }; });
const key = (r) => { const m = (r.day || '').match(/M(\d{2}) (\d{1,2})/); return `${m ? m[1] : '??'}-${String(m ? m[2] : 0).padStart(2, '0')} ${r.time}`; };
const keys = norm.map(key);
const bad = keys.map((k, i) => (i && k < keys[i - 1] ? { i, prev: keys[i - 1], cur: k } : null)).filter(Boolean);
out.messages = norm.length; out.sequence = keys; out.outOfOrder = bad; out.shot = f;
ev(P, { kind: 'p3g', v: { messages: norm.length, outOfOrder: bad.length } });
console.log('messages', norm.length); console.log(JSON.stringify(keys)); console.log('OUT-OF-ORDER', JSON.stringify(bad));
save(P, 'p3g.json', out); await c.close(); await browser.close();
