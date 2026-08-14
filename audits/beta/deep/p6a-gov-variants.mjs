// P6a — the government portal swept once per account variant, so the four
// scopes are compared side by side rather than assumed equivalent.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P6');
const B = PORTALS.government;
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p6a', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); };

const VARIANTS = [
  ['republic', 'gov.republic@uchqun.uz', 'republic / main — no region'],
  ['toshkent', 'gov.toshkent@uchqun.uz', 'region / main — Toshkent (…0001)'],
  ['samarqand', 'gov.samarqand@uchqun.uz', 'region / main — Samarqand (…0002)'],
  ['secondary', 'men@davlat.uz', 'republic / secondary — govAccessGrants set'],
];

const ROUTES = [
  ['G1', '/government', 'dashboard'],
  ['G2', '/government/schools', 'schools'],
  ['G3', '/government/students', 'students'],
  ['G4', '/government/teachers', 'teachers'],
  ['G5', '/government/parents', 'parents'],
  ['G6', '/government/ratings', 'ratings'],
  ['G7', '/government/platform', 'platform'],
  ['G8', '/government/warnings', 'warnings'],
  ['G9', '/government/audit-log', 'audit-log'],
  ['G10', '/government/profile', 'profile'],
  ['G11', '/government/settings', 'settings'],
  ['G12', '/government/change-password', 'change-password'],
  ['G13', '/government/zzz-nonexistent', 'notfound'],
];

const browser = await newBrowser(true);

for (const [tag, email, note] of VARIANTS) {
  const TAG = `gov-${tag}`;
  const { c, p } = await ctx(P, browser, TAG);
  const li = await login(P, p, 'government', email, PW, TAG);
  rec(`login-${tag}`, { email, note, ...li });
  if (!li.ok) { await c.close(); continue; }
  const dumps = {};
  for (const [id, r, action] of ROUTES) {
    const f = await goto(P, p, B + r, TAG, `${id}-${action}`, { full: true });
    const d = await p.evaluate(DUMP);
    const body = (await text(p)).replace(/\n/g, ' | ');
    dumps[id] = {
      route: r, shot: f, buttons: d.buttons.length, inputs: d.inputs.length,
      // which regions and schools does this account see named on screen?
      regionsNamed: [...new Set((body.match(/(Toshkent|Samarqand|Andijon|Buxoro|Farg'ona|Namangan|Navoiy|Qashqadaryo|Sirdaryo|Surxondaryo|Xorazm|Jizzax|Qoraqalpog'iston)[^|]{0,14}/g) || []).map((s) => s.trim()))].slice(0, 12),
      schoolsNamed: [...new Set((body.match(/\d-sonli[^|]{0,30}/g) || []).map((s) => s.trim()))].slice(0, 12),
      head: body.slice(150, 460),
    };
    console.log(tag, id, r, '→', f, `regions=${dumps[id].regionsNamed.length} schools=${dumps[id].schoolsNamed.length}`);
  }
  save(P, `p6a-routes-${tag}.json`, dumps);
  rec(`scope-${tag}`, {
    dashboardRegions: dumps.G1?.regionsNamed, schoolsPageRegions: dumps.G2?.regionsNamed,
    schoolsPageSchools: dumps.G2?.schoolsNamed, studentsRegions: dumps.G3?.regionsNamed,
  });
  await c.close();
}

save(P, 'p6a.json', out);
await browser.close();
console.log('P6a DONE');
