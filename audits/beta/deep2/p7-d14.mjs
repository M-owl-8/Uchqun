// D-14 — re-measure the font 404 on the deployed build, all four portals.
import { newBrowser, PORTALS } from './lib.mjs';
const b = await newBrowser(true);
for (const name of ['government', 'admin', 'teacher', 'reception']) {
  const c = await b.newContext(); const p = await c.newPage();
  const bad = [];
  p.on('response', (r) => { if (r.status() >= 400 && /font|gstatic|googleapis/.test(r.url())) bad.push(`${r.status()} ${r.url().slice(0, 130)}`); });
  try { await p.goto(PORTALS[name], { waitUntil: 'networkidle', timeout: 45000 }); } catch {}
  await p.waitForTimeout(2500);
  console.log(name, JSON.stringify({ fontFailures: bad.length, sample: bad.slice(0, 2) }));
  await c.close();
}
await b.close();
