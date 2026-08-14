// P7e — the cross-tenant read leak, proven with full response bodies and the
// school ids of every record returned.
import { phase, newBrowser, ctx, login, shot, save, ev, PW, API } from './lib.mjs';
const P = phase('P7'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7e', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 1100)); };
const FOREIGN_CHILD = '5eed7fed-b5ea-4db5-8ab7-b60720996a30'; // amm1, Andijon
const browser = await newBrowser(true);
for (const [tag, portal, email] of [['admin-tmm3', 'admin', 'direktor@tmm3.uz'], ['reception-tmm3', 'reception', 'qabul@tmm3.uz']]) {
  const { c, p } = await ctx(P, browser, tag);
  await login(P, p, portal, email, PW, tag);
  const res = await p.evaluate(async ([api, child]) => {
    const o = {};
    for (const [label, path] of [['activities', `/activities?childId=${child}`], ['meals', `/meals?childId=${child}`], ['media', `/media?childId=${child}`]]) {
      const r = await fetch(api + path, { credentials: 'include' });
      const t = await r.text();
      let parsed = null; try { parsed = JSON.parse(t); } catch {}
      const list = Array.isArray(parsed) ? parsed : (parsed?.data ?? []);
      o[label] = {
        status: r.status, bytes: t.length,
        records: Array.isArray(list) ? list.length : null,
        childIds: Array.isArray(list) ? [...new Set(list.map((x) => x.childId))] : null,
        sample: Array.isArray(list) && list.length ? JSON.stringify(list[0]).slice(0, 300) : t.slice(0, 160),
      };
    }
    // and the caller's own identity, for the record
    const me = await (await fetch(`${api}/auth/me`, { credentials: 'include' })).json();
    o._caller = { email: me?.user?.email ?? me?.email, role: me?.user?.role ?? me?.role, schoolId: me?.user?.schoolId ?? me?.schoolId };
    return o;
  }, [API, FOREIGN_CHILD]);
  rec(`proof-${tag}`, res);
  await shot(P, p, tag, `D-47-cross-tenant-read-${tag}`, { defect: 'D-47' });
  await c.close();
}
save(P, 'p7e.json', out); await browser.close(); console.log('P7e DONE');
