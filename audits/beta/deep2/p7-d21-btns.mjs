import { phase, newBrowser, ctx, login, goto, PORTALS, pwFor, DESKTOP } from './lib.mjs';
const P = phase('P7');
const b = await newBrowser(true);
const { c, p } = await ctx(P, b, 'd21x', DESKTOP);
await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), 'd21x');
await goto(P, p, `${PORTALS.reception}/reception/teachers`, 'd21x', 'd21x');
console.log(JSON.stringify(await p.evaluate(() =>
  [...document.querySelectorAll('button')].filter((e) => e.offsetParent)
    .map((e, i) => ({ i, text: e.innerText.trim().slice(0, 30), cls: e.className.slice(0, 45) }))
), null, 1));
await c.close(); await b.close();
