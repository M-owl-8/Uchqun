// P9 — closeout verification on the DEPLOYED build.
//
// Two jobs:
//   1. the buyer click-path, driven end to end
//   2. Campaign I's AVOID LIST, re-measured. Its closeout said "what I would not
//      show yet: the parent rating page on a phone — 21px too wide with four of
//      five criteria truncated". That claim is either now false or the fix did
//      not hold, and the only way to know is to measure it again on the build a
//      buyer would actually be shown.
import { phase, newBrowser, ctx, login, goto, shot, text, save, PORTALS, pwFor, DESKTOP, MOBILE } from './lib.mjs';

const P = phase('P9');
const out = {};
const rec = (k, v) => { out[k] = v; console.log(k, JSON.stringify(v).slice(0, 300)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const b = await newBrowser(true);

// ── the avoid list: every parent route at 390x844 ─────────────────────────
await T('avoid-list-parent-mobile', async () => {
  const TAG = 'p9-parent-mobile'; const { c, p } = await ctx(P, b, TAG, MOBILE);
  await login(P, p, 'parent', 'otaona11@tmm3.uz', pwFor('otaona11@tmm3.uz'), TAG, { tab: /Ota-ona|Parent/i });
  const routes = ['/', '/child', '/attendance', '/activities', '/meals', '/media', '/therapy',
    '/journal', '/rating', '/notifications', '/chat', '/settings', '/profile'];
  const breaks = [];
  for (const r of routes) {
    await goto(P, p, PORTALS.teacher + r, TAG, `p9-mobile-${r.replace(/\W/g, '') || 'root'}`);
    const fit = await p.evaluate(() => {
      const de = document.documentElement;
      const clipped = [...document.querySelectorAll('*')].filter((e) => {
        if (!e.offsetParent) return false;
        const cs = getComputedStyle(e);
        return cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
      }).length;
      return { sw: de.scrollWidth, cw: de.clientWidth, over: de.scrollWidth > de.clientWidth + 2, clipped };
    });
    if (fit.over || fit.clipped > 0) breaks.push({ route: r, ...fit });
  }
  rec('avoid-list-parent-mobile', {
    routesChecked: routes.length,
    breaks,
    ratingPage: await (async () => {
      await goto(P, p, `${PORTALS.teacher}/rating`, TAG, 'p9-rating-mobile', { full: true });
      return p.evaluate(() => {
        const de = document.documentElement;
        const labels = [...document.querySelectorAll('label')].filter((e) => e.offsetParent)
          .map((e) => ({ t: e.innerText.trim().slice(0, 30), truncated: e.scrollWidth > e.clientWidth + 1 }));
        return { width: de.scrollWidth, viewport: de.clientWidth,
          truncatedLabels: labels.filter((l) => l.truncated).length, labels: labels.slice(0, 6) };
      });
    })(),
    shot: await shot(P, p, TAG, 'p9-avoid-list-rating-mobile', { full: true }),
  });
  await c.close();
});

// ── the buyer click-path, all four portals ────────────────────────────────
for (const [portal, base, account, route, expect] of [
  ['government', PORTALS.government, 'gov.republic@uchqun.uz', '/government/schools', /maktab|Maktab|sonli/],
  ['admin', PORTALS.admin, 'direktor@tmm3.uz', '/admin/parents', /Ota-ona|ota-ona/i],
  ['reception', PORTALS.reception, 'qabul@tmm3.uz', '/reception/parents', /Ota-ona/i],
  ['teacher', PORTALS.teacher, 'tarbiyachi1@tmm3.uz', '/teacher/bolalar', /bola|Bola/],
]) {
  await T(`clickpath-${portal}`, async () => {
    const TAG = `p9-${portal}`; const { c, p } = await ctx(P, b, TAG, DESKTOP);
    const errs = []; const net = [];
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    p.on('response', (r) => { if (r.status() >= 500) net.push(`${r.status()} ${r.url().slice(0, 90)}`); });
    const li = await login(P, p, portal, account, pwFor(account), TAG);
    await goto(P, p, base + route, TAG, `p9-${portal}-landing`, { full: true });
    const body = await text(p);
    rec(`clickpath-${portal}`, {
      loggedIn: li?.ok ?? true,
      route, contentPresent: expect.test(body),
      bodyChars: body.length,
      serverErrors: net,
      consoleErrors: errs.length,
      shot: await shot(P, p, TAG, `p9-${portal}-clickpath`, { full: true }),
    });
    await c.close();
  });
}

save(P, 'p9-closeout.json', out);
console.log('P9 verification DONE');
await b.close();
