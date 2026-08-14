import { phase, newBrowser, ctx, login, goto, PORTALS, pwFor, API } from './lib.mjs';
const P = phase('P7');
const b = await newBrowser(true);
const { c, p } = await ctx(P, b, 'diag');
await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), 'diag');
await goto(P, p, `${PORTALS.reception}/reception/parents`, 'diag', 'diag');
console.log(JSON.stringify(await p.evaluate(async (api) => {
  const ls = Object.keys(localStorage).map((k) => [k, (localStorage.getItem(k) || '').slice(0, 90)]);
  const abs = await fetch(api + '/auth/me', { credentials: 'include' });
  return { localStorageKeys: ls, absoluteApiStatus: abs.status, absoluteApiBody: (await abs.text()).slice(0, 150) };
}, API), null, 1));
await c.close(); await b.close();
