import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, pwFor } from './lib.mjs';
const P = phase('P7'); const out = {};
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, 'd06b');
await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), 'd06b');
await goto(P, p, `${PORTALS.reception}/reception/documents`, 'd06b', 'D-06-direct-probe');
out.result = await p.evaluate(async () => {
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8//8/AAX+Av6nNdSgAAAAAElFTkSuQmCC'), c => c.charCodeAt(0));
  const fd = new FormData();
  fd.append('file', new Blob([png], { type: 'image/png' }), 'SIM-d06.png');
  fd.append('documentType', 'identification');
  const r = await fetch('https://uchqun-production-b484.up.railway.app/api/v1/reception/documents', { method: 'POST', credentials: 'include', body: fd });
  return { status: r.status, correlationId: r.headers.get('x-correlation-id'), body: (await r.text()).slice(0, 400) };
});
console.log(JSON.stringify(out.result, null, 1));
out.shot = await shot(P, p, 'd06b', 'D-06-direct-probe-result');
ev(P, { kind: 'p7-d06b', v: out.result }); save(P, 'p7-d06b.json', out);
await c.close(); await browser.close();
