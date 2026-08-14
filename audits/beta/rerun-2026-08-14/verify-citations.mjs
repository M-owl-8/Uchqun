// L3 self-audit for this run's report.
// Filenames are resolved against BOTH screenshot sets, because §2 (the P0 citation
// audit) legitimately quotes filenames from the 2026-08-14 run's directory.
import fs from 'fs';

const RERUN = 'C:/work/Uchqun/audits/beta/rerun-2026-08-14';
const PRIOR = 'C:/work/Uchqun/audits/beta/fullrun-2026-08-14';
const report = fs.readFileSync(`${RERUN}/FIX-SEED-REWITNESS-2026-08-14.md`, 'utf8');

const rerunFiles = new Set(fs.readdirSync(`${RERUN}/screenshots`).filter((f) => f.endsWith('.png')));
const priorFiles = new Set(fs.readdirSync(`${PRIOR}/screenshots`).filter((f) => f.endsWith('.png')));
const rerunOrd = new Map([...rerunFiles].map((f) => [f.slice(0, 3), f]));

const HTTP_CODES = new Set(['400', '401', '403', '404', '409', '500', '502', '207', '201']);

const badName = [];
let names = 0;
for (const m of report.matchAll(/`?(\d{3}_[A-Za-z0-9._-]+\.png)`?/g)) {
  names++;
  const f = m[1];
  if (rerunFiles.has(f)) continue;
  if (priorFiles.has(f)) continue;                 // §2 quotes the prior run's index
  if (/^(011_gov-republic_landing|013_gov-region-samarqand_landing|015_admin-smm2_landing|017_reception-smm2_landing|019_teacher-smm2_landing|021_parent-smm2_landing)\.png$/.test(f)) continue; // the six proven-fabricated names, quoted as evidence
  badName.push(f);
}

const badOrd = [];
let ords = 0;
for (const m of report.replace(/`?\d{3}_[A-Za-z0-9._-]+\.png`?/g, '').matchAll(/`(\d{3})`/g)) {
  ords++;
  if (HTTP_CODES.has(m[1])) continue;
  if (!rerunOrd.has(m[1])) badOrd.push(m[1]);
}

console.log('exact filename citations:', names, '| unresolvable:', badName.length, badName);
console.log('bare ordinal citations  :', ords, '| unresolvable:', badOrd.length, badOrd);
console.log('rerun screenshots on disk:', rerunFiles.size);
const idx = fs.readFileSync(`${RERUN}/screenshot-index.md`, 'utf8').trim().split('\n').length - 2;
console.log('index rows:', idx);
