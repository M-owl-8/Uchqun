// P6.2 — locale x app x key completeness, over the catalogues each portal
// ACTUALLY merges (P6.1, from code).
import fs from 'fs';
const PORTALS = {
  teacher: (l) => [`shared/locales/${l}.json`, `teacher/src/locales/${l}/common.json`, `teacher/src/parent/locales/${l}/common.json`],
  admin: (l) => [`shared/locales/${l}.json`, `admin/src/locales/${l}/common.json`],
  reception: (l) => [`shared/locales/${l}.json`, `reception/src/locales/${l}/common.json`],
  government: (l) => [`shared/locales/${l}.json`, `government/src/locales/${l}/common.json`],
};
const L = ['uz', 'ru', 'en'];
const flat = (o, p = '', a = new Set()) => { for (const [k, v] of Object.entries(o || {})) { const key = p ? `${p}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, a); else a.add(key); } return a; };
const load = (fs_) => { const s = new Set(); for (const f of fs_) { try { for (const k of flat(JSON.parse(fs.readFileSync(f, 'utf8')))) s.add(k); } catch {} } return s; };

const out = {};
console.log('| portal | uz | ru | en | missing in ru | missing in en | extra in ru | extra in en |');
console.log('|---|---|---|---|---|---|---|---|');
for (const [portal, f] of Object.entries(PORTALS)) {
  const c = Object.fromEntries(L.map((l) => [l, load(f(l))]));
  const mru = [...c.uz].filter((k) => !c.ru.has(k));
  const men = [...c.uz].filter((k) => !c.en.has(k));
  const xru = [...c.ru].filter((k) => !c.uz.has(k));
  const xen = [...c.en].filter((k) => !c.uz.has(k));
  out[portal] = { counts: { uz: c.uz.size, ru: c.ru.size, en: c.en.size }, missingRu: mru, missingEn: men, extraRu: xru, extraEn: xen };
  console.log(`| ${portal} | ${c.uz.size} | ${c.ru.size} | ${c.en.size} | ${mru.length} | ${men.length} | ${xru.length} | ${xen.length} |`);
}
console.log('\n=== every missing key, listed ===');
for (const [p, v] of Object.entries(out)) {
  if (v.missingRu.length) console.log(`${p} / ru missing: ${v.missingRu.join(', ')}`);
  if (v.missingEn.length) console.log(`${p} / en missing: ${v.missingEn.join(', ')}`);
}
console.log('\n=== fallbackLng per portal (a missing uz key falls back to…) ===');
for (const p of Object.keys(PORTALS)) {
  const src = fs.readFileSync(`${p}/src/i18n.js`, 'utf8');
  const m = src.match(/fallbackLng:\s*'([a-z]+)'/);
  console.log(`  ${p.padEnd(12)} ${m ? m[1] : '?'}`);
}
fs.writeFileSync('audits/beta/deep2/p6-matrix.json', JSON.stringify(out, null, 1));
