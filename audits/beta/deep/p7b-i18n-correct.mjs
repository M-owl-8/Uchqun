// P7b — corrected i18n analysis. The teacher app merges TWO catalogues
// (teacher/src/locales + teacher/src/parent/locales, i18n.js:59-62); P7a
// loaded only the first and over-reported. Also resolve every other portal's
// real catalogue set before judging.
import fs from 'fs';
const P = 'audits/beta/deep/P7'; fs.mkdirSync(`${P}/logs`, { recursive: true });
const out = {};
const flat = (o, pre = '', acc = new Set()) => { for (const [k, v] of Object.entries(o || {})) { const key = pre ? `${pre}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, acc); else acc.add(key); } return acc; };
const load = (paths) => { const s = new Set(); for (const p of paths) if (fs.existsSync(p)) for (const k of flat(JSON.parse(fs.readFileSync(p, 'utf8')))) s.add(k); return s; };
const walk = (d, acc = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = `${d}/${e.name}`; if (e.isDirectory()) { if (!/node_modules|__tests__|locales/.test(f)) walk(f, acc); } else if (/\.jsx?$/.test(e.name)) acc.push(f); } return acc; };

const CATALOGUES = {
  teacher: (l) => [`teacher/src/locales/${l}/common.json`, `teacher/src/parent/locales/${l}/common.json`],
  admin: (l) => [`admin/src/locales/${l}/common.json`],
  reception: (l) => [`reception/src/locales/${l}/common.json`],
  government: (l) => [`government/src/locales/${l}/common.json`],
};

console.log('=== CATALOGUE SIZES (all namespaces merged) ===');
const matrix = {};
for (const [portal, paths] of Object.entries(CATALOGUES)) {
  const sets = Object.fromEntries(['uz', 'ru', 'en'].map((l) => [l, load(paths(l))]));
  matrix[portal] = {
    counts: Object.fromEntries(Object.entries(sets).map(([l, s]) => [l, s.size])),
    ruMissingVsUz: [...sets.uz].filter((k) => !sets.ru.has(k)).length,
    enMissingVsUz: [...sets.uz].filter((k) => !sets.en.has(k)).length,
    ruMissingSample: [...sets.uz].filter((k) => !sets.ru.has(k)).slice(0, 5),
    enMissingSample: [...sets.uz].filter((k) => !sets.en.has(k)).slice(0, 5),
  };
  console.log(portal.padEnd(12), JSON.stringify(matrix[portal].counts), 'ru missing:', matrix[portal].ruMissingVsUz, 'en missing:', matrix[portal].enMissingVsUz);
}
out.catalogueMatrix = matrix;

console.log('\n=== KEYS CALLED IN CODE BUT ABSENT FROM THE MERGED uz CATALOGUE ===');
const impact = {};
for (const [portal, paths] of Object.entries(CATALOGUES)) {
  const uz = load(paths('uz'));
  let withDefault = 0; const raw = [];
  for (const f of walk(`${portal}/src`)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'\s*(,\s*\{[\s\S]{0,200}?\})?\s*\)/g)) {
      if (uz.has(m[1])) continue;
      if (m[2] && /defaultValue/.test(m[2])) withDefault++;
      else raw.push(`${m[1]}  (${f.replace(portal + '/src/', '')})`);
    }
  }
  impact[portal] = { rendersEnglishDefault: withDefault, rendersRawKey: raw.length, rawKeys: raw };
  console.log(`${portal}: English defaultValue = ${withDefault} | RAW KEY on screen = ${raw.length}`);
  raw.slice(0, 12).forEach((s) => console.log('     raw:', s));
}
out.impact = impact;
fs.writeFileSync(`${P}/logs/p7b.json`, JSON.stringify(out, null, 1));
