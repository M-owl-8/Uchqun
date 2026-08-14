// P1 — probe: verify prod portals reachable and seeded smm2-chain accounts log in.
import { newBrowser, ctx, login, text, save, ev, PW } from './lib.mjs';

const TARGETS = [
  { portal: 'government', tag: 'gov-republic', email: 'gov.republic@uchqun.uz' },
  { portal: 'government', tag: 'gov-region-samarqand', email: 'gov.samarqand@uchqun.uz' },
  { portal: 'admin', tag: 'admin-smm2', email: 'admin4@uchqun.uz' },
  { portal: 'reception', tag: 'reception-smm2', email: 'reception4@uchqun.uz' },
  { portal: 'teacher', tag: 'teacher-smm2', email: 'teacher7@uchqun.uz' },
  { portal: 'parent', tag: 'parent-smm2', email: 'parent10@uchqun.uz', tab: /Ota-ona|Parent|Родител/i },
];

const b = await newBrowser(true);
const out = [];
for (const t of TARGETS) {
  const { c, p } = await ctx(b, t.tag);
  let r = { ok: false, landing: '', shot: '' };
  try {
    r = await login(p, t.portal, t.email, PW, t.tag, { tab: t.tab });
  } catch (e) {
    ev({ kind: 'probe-error', tag: t.tag, err: e.message });
  }
  const body = await text(p);
  out.push({ ...t, tab: undefined, ok: r.ok, landing: r.landing, shot: r.shot, bodyHead: body.slice(0, 900) });
  console.log(`${t.tag.padEnd(24)} ok=${r.ok} landing=${r.landing}`);
  await c.close();
}
save('p1-probe.json', out);
await b.close();
console.log('P1 DONE');
