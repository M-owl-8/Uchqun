// P3d — parent week walk with the correct previous-week control.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'parent-otaona11'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3d', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 600)); };
const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
await goto(P, p, `${B}/attendance`, TAG, 'week-walk-start');
const controls = await p.evaluate(() => [...document.querySelectorAll('button')].map((b) => ({ aria: b.getAttribute('aria-label'), text: (b.innerText || '').trim().slice(0, 20) })));
rec('controls', controls);
await p.locator('button', { hasText: /^Hafta$/ }).first().click();
await p.waitForTimeout(3500);
const weeks = [];
for (let i = 0; i < 4; i++) {
  const body = await text(p);
  const header = (body.match(/\d{4}-\d{2}-\d{2}\s*–\s*\d{4}-\d{2}-\d{2}/) || [])[0] ?? null;
  const cells = (body.match(/M\d{2} \d{1,2}\n[^\n]*/g) || []).map((s) => s.replace('\n', '='));
  const f = await shot(P, p, TAG, `D-03-week-${i}-${(header || 'blank').slice(0, 10)}`, { defect: 'D-03', full: true });
  weeks.push({ header, cells, shot: f, blank: body.length < 400 });
  console.log('week', i, header, JSON.stringify(cells));
  const prev = p.locator('button[aria-label="Oldingi kun"]');
  if (await prev.count()) { await prev.first().click(); } else {
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('svg') && !x.innerText.trim()); if (b) b.click(); });
  }
  await p.waitForTimeout(3200);
}
rec('week-walk', weeks);
save(P, 'p3d.json', out);
await c.close(); await browser.close();
console.log('P3d DONE');
