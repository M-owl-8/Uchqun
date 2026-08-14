// Campaign-wide citation audit (L4).
// Usage: node citation-audit.mjs <artifact.md> <screenshotDir> [<extraScreenshotDir>...]
import fs from 'fs';
import path from 'path';

const [, , artifact, ...dirs] = process.argv;
if (!artifact) { console.error('usage: citation-audit.mjs <artifact.md> <dir>...'); process.exit(2); }

const report = fs.readFileSync(artifact, 'utf8');
const files = new Set();
const ordMap = new Map();
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.png'))) {
    files.add(f);
    if (!ordMap.has(f.slice(0, 3))) ordMap.set(f.slice(0, 3), []);
    ordMap.get(f.slice(0, 3)).push(f);
  }
}
// three-digit tokens that are HTTP statuses, not screenshot ordinals
const HTTP = new Set(['200', '201', '204', '207', '301', '302', '400', '401', '403', '404', '409', '422', '429', '500', '502', '503']);

const badName = [];
let names = 0;
for (const m of report.matchAll(/`?(\d{3}_[A-Za-z0-9._-]+\.png)`?/g)) {
  names++;
  if (!files.has(m[1])) badName.push(m[1]);
}
const badOrd = [];
let ords = 0;
for (const m of report.replace(/`?\d{3}_[A-Za-z0-9._-]+\.png`?/g, '').matchAll(/`(\d{3})`/g)) {
  ords++;
  if (HTTP.has(m[1])) continue;
  if (!ordMap.has(m[1])) badOrd.push(m[1]);
}
console.log(`ARTIFACT ${path.basename(artifact)}`);
console.log(`  screenshot dirs      : ${dirs.join(' ')}`);
console.log(`  files on disk        : ${files.size}`);
console.log(`  filename citations   : ${names} | unresolvable: ${badName.length} ${JSON.stringify(badName)}`);
console.log(`  ordinal citations    : ${ords} | unresolvable: ${badOrd.length} ${JSON.stringify(badOrd)}`);
process.exit(badName.length + badOrd.length ? 1 : 0);
