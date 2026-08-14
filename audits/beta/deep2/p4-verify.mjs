// P4.3 — D-51 verified working, and D-48 re-diagnosed with logs available.
import { phase, newBrowser, ctx, login, goto, shot, save, ev, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P4'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4v', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 420)); };
const browser = await newBrowser(true);

// D-51 — the export must now succeed and return real data
{
  const { c, p } = await ctx(P, browser, 'parent');
  await login(P, p, 'parent', 'otaona15@tmm3.uz', pwFor('otaona15@tmm3.uz'), 'parent', { tab: /Ota-ona|Parent/i });
  await goto(P, p, `${PORTALS.teacher}/settings`, 'parent', 'export-verify-context');
  const r = await p.evaluate(async () => {
    const x = await fetch('/api/v1/parent/me/export', { credentials: 'include' });
    const t = await x.text();
    let parsed = null; try { parsed = JSON.parse(t); } catch {}
    return { status: x.status, bytes: t.length, disposition: x.headers.get('content-disposition'),
      topKeys: parsed ? Object.keys(parsed) : null, children: parsed?.children?.length ?? null,
      head: t.slice(0, 180) };
  });
  rec('D-51-after', { ...r, shot: await shot(P, p, 'parent', 'D-51-FIXED-export-200', { defect: 'D-51' }) });
  await c.close();
}

// D-48 — lock an account, try the documented unlock, capture correlation ids
{
  const { c, p } = await ctx(P, browser, 'd48');
  await goto(P, p, `${PORTALS.admin}/login`, 'd48', 'd48-context');
  const lock = await p.evaluate(async ([api, email]) => {
    const res = [];
    for (let i = 1; i <= 22; i++) {
      const x = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'WrongOnPurpose@' + i }) });
      res.push({ i, s: x.status, cid: x.headers.get('x-correlation-id') });
      if (x.status === 429) break;
    }
    return res;
  }, [API, 'k.yusupova@tmm3.uz']);
  rec('d48-lock', { attempts: lock.length, lockedAt: lock.findIndex(r => r.s === 429) + 1 || null, lastCid: lock.at(-1)?.cid });
  await c.close();
}
{
  const { c, p } = await ctx(P, browser, 'd48-admin');
  await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), 'd48-admin');
  const seq = await p.evaluate(async ([api, email]) => {
    const one = async (path, method, body) => { const x = await fetch(api + path, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { path, s: x.status, cid: x.headers.get('x-correlation-id'), b: (await x.text()).slice(0, 160) }; };
    return [
      await one('/auth/unlock-account', 'POST', { email }),
      await one('/auth/login', 'POST', { email, password: 'Uchqun@2026' }),
    ];
  }, [API, 'k.yusupova@tmm3.uz']);
  rec('d48-unlock-then-login', seq);
  await c.close();
}
save(P, 'p4-verify.json', out); await browser.close();
