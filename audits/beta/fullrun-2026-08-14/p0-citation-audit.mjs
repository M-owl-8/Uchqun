// P0 — citation audit. Verifies every screenshot reference in the 2026-08-14
// report against screenshot-index.md. Two classes of citation:
//   (a) exact filename  `NNN_role_action.png`  -> must match the index byte-for-byte
//   (b) bare ordinal    `NNN`                  -> resolved to its real filename so a
//                                                 reader can check role/action fit
import fs from 'fs';

const DIR = 'C:/work/Uchqun/audits/beta/fullrun-2026-08-14';
// §13 CORRECTIONS deliberately quotes the wrong filenames as evidence — exclude it,
// otherwise the audit flags its own record of the correction.
const full = fs.readFileSync(`${DIR}/FULL-COVERAGE-RUN-2026-08-14.md`, 'utf8');
const cut = full.indexOf('## 13. CORRECTIONS');
const report = cut > 0 ? full.slice(0, cut) : full;
const files = fs.readdirSync(`${DIR}/screenshots`).filter(f => f.endsWith('.png'));
const byOrdinal = new Map();
for (const f of files) byOrdinal.set(f.slice(0, 3), f);
const exact = new Set(files);

const lines = report.split('\n');
const rowsExact = [];
const rowsOrdinal = [];

lines.forEach((line, i) => {
  for (const m of line.matchAll(/`?(\d{3}_[A-Za-z0-9._-]+\.png)`?/g)) {
    rowsExact.push({ line: i + 1, cited: m[1], exists: exact.has(m[1]), actual: byOrdinal.get(m[1].slice(0, 3)) || '(no such ordinal)' });
  }
});

// bare ordinals: `NNN` in backticks, excluding those already matched as filenames
lines.forEach((line, i) => {
  const stripped = line.replace(/`?\d{3}_[A-Za-z0-9._-]+\.png`?/g, '');
  for (const m of stripped.matchAll(/`(\d{3})`/g)) {
    const o = m[1];
    rowsOrdinal.push({ line: i + 1, cited: o, exists: byOrdinal.has(o), actual: byOrdinal.get(o) || '(MISSING)' });
  }
});

const badExact = rowsExact.filter(r => !r.exists);
const badOrdinal = rowsOrdinal.filter(r => !r.exists);

console.log('=== A. EXACT FILENAME CITATIONS ===');
console.log('total', rowsExact.length, '| bad', badExact.length);
console.log('| line | cited filename | exists | correct filename at that ordinal |');
console.log('|---|---|---|---|');
for (const r of rowsExact) console.log(`| ${r.line} | ${r.cited} | ${r.exists ? 'y' : '**n**'} | ${r.actual} |`);

console.log('\n=== B. BARE ORDINAL CITATIONS (resolved) ===');
console.log('total', rowsOrdinal.length, '| unresolvable', badOrdinal.length);
const uniq = [...new Map(rowsOrdinal.map(r => [r.cited, r])).values()].sort((a, b) => a.cited.localeCompare(b.cited));
for (const r of uniq) console.log(`${r.cited} -> ${r.actual}`);

fs.writeFileSync(`${DIR}/p0-citation-audit.json`, JSON.stringify({ rowsExact, rowsOrdinal }, null, 1));
