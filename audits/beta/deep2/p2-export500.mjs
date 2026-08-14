import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, pwFor } from './lib.mjs';
const P = phase('P2'); const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, 'parent3');
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await login(P, p, 'parent', 'otaona13@tmm3.uz', pwFor('otaona13@tmm3.uz'), 'parent3', { tab: /Ota-ona|Parent/i });
await goto(P, p, `${PORTALS.teacher}/settings`, 'parent3', 'export-500-context');
out.result = await p.evaluate(async () => {
  const x = await fetch('/api/v1/parent/me/export', { credentials: 'include' });
  return { status: x.status, headers: { ct: x.headers.get('content-type') }, body: (await x.text()).slice(0, 400) };
});
out.shot = await shot(P, p, 'parent3', 'D-51-parent-data-export-500', { defect: 'D-51' });
out.consoleErrors = errs.slice(0, 4);
console.log(JSON.stringify(out, null, 1).slice(0, 900));
ev(P, { kind: 'p2', step: 'export-500', v: out.result });
save(P, 'p2-export500.json', out); await c.close(); await browser.close();
