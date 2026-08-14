// P4.2 — the minimum bar: reproduce a known server error and retrieve its stack
// trace from the log sink BY REQUEST ID.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, pwFor } from './lib.mjs';
const P = phase('P4'); const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, 'parent');
await login(P, p, 'parent', 'otaona14@tmm3.uz', pwFor('otaona14@tmm3.uz'), 'parent', { tab: /Ota-ona|Parent/i });
await goto(P, p, `${PORTALS.teacher}/settings`, 'parent', 'trace-context');
out.request = await p.evaluate(async () => {
  const x = await fetch('/api/v1/parent/me/export', { credentials: 'include' });
  return { status: x.status, correlationHeader: x.headers.get('x-correlation-id'), body: (await x.text()).slice(0, 300) };
});
out.shot = await shot(P, p, 'parent', 'D-51-500-with-correlation-id');
console.log(JSON.stringify(out.request, null, 1));
ev(P, { kind: 'p4', step: 'trigger-500', v: out.request });
save(P, 'p4-trace.json', out);
await c.close(); await browser.close();
