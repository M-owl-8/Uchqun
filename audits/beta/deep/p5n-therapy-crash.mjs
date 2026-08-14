import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';
const P = phase('P5'); const B = PORTALS.admin; const TAG = 'admin-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5n', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 900)); };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const errors = []; const net = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.split('\n')[0].slice(0, 300)));
p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url())) return; let b = ''; try { b = (await r.text()).slice(0, 260); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);
errors.length = 0; net.length = 0;
const f = await goto(P, p, `${B}/admin/therapy`, TAG, 'D-43-admin-therapy-crash', { defect: 'D-43', full: true, wait: 8000 });
const body = (await text(p)).replace(/\n/g, ' | ');
rec('therapy-crash', { shot: f, body: body.slice(-420), consoleErrors: errors.slice(0, 6), api: net.filter((n) => /therap/i.test(n.u)) });
// does Try Again recover?
const ta = p.locator('button', { hasText: /Try Again/ });
if (await ta.count()) { errors.length = 0; await ta.first().click(); await p.waitForTimeout(6000); }
rec('after-try-again', { body: (await text(p)).replace(/\n/g, ' | ').slice(-300), errors: errors.slice(0, 4), shot: await shot(P, p, TAG, 'D-43-admin-therapy-after-retry', { defect: 'D-43', full: true }) });
// compare: the same endpoint from the teacher portal worked in P3
rec('therapy-api-direct', await p.evaluate(async () => { const r = await fetch('https://uchqun-production-b484.up.railway.app/api/v1/therapy', { credentials: 'include' }); const t = await r.text(); return { s: r.status, len: t.length, head: t.slice(0, 200) }; }));
save(P, 'p5n.json', out); await c.close(); await browser.close(); console.log('P5n DONE');
