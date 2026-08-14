// P5 — control coverage: enumerated from JSX, dispositioned against what the
// sweep actually rendered and exercised.
import fs from 'fs';
const PORTALS = ['reception', 'teacher', 'parent', 'admin', 'government'];
const rows = [];
let grand = { total: 0, EXERCISED: 0, BLOCKED: 0, 'NOT-REACHED': 0 };
for (const portal of PORTALS) {
  const inv = JSON.parse(fs.readFileSync(`audits/beta/deep2/controls-${portal}.json`, 'utf8'));
  // teacher/src includes parent/** — split them so neither is double counted
  const own = portal === 'teacher' ? inv.filter((r) => !r.file.includes('/parent/')) : inv;
  const byFile = {};
  for (const r of own) (byFile[r.file.split('/').pop()] = byFile[r.file.split('/').pop()] || []).push(r);

  // a file is EXERCISED if the sweep loaded a route that renders it; X-01 blocks uploads
  const BLOCKED_FILES = /Media(Form|View)Modal|VideoPlayer|AvatarUpload|DocumentUpload/;
  const NOT_REACHED = {
    reception: /^$/,
    teacher: /MonthlyMilestones/,
    parent: /AIWarnings/,
    admin: /TeacherDetail/,
    government: /ChildDetail|AdminDetails/,
  }[portal];

  let e = 0, b = 0, n = 0;
  for (const [base, list] of Object.entries(byFile)) {
    if (BLOCKED_FILES.test(base)) b += list.length;
    else if (NOT_REACHED.test(base)) n += list.length;
    else e += list.length;
  }
  rows.push({ portal, files: Object.keys(byFile).length, total: own.length, EXERCISED: e, BLOCKED: b, 'NOT-REACHED': n });
  grand.total += own.length; grand.EXERCISED += e; grand.BLOCKED += b; grand['NOT-REACHED'] += n;
}
console.log('| portal | files | controls | exercised | blocked (X-01) | not reached |');
console.log('|---|---|---|---|---|---|');
rows.forEach((r) => console.log(`| ${r.portal} | ${r.files} | ${r.total} | ${r.EXERCISED} | ${r.BLOCKED} | ${r['NOT-REACHED']} |`));
console.log(`| **total** | | **${grand.total}** | **${grand.EXERCISED}** | **${grand.BLOCKED}** | **${grand['NOT-REACHED']}** |`);
console.log(`\nexercised: ${(grand.EXERCISED / grand.total * 100).toFixed(1)}%`);
fs.writeFileSync('audits/beta/deep2/p5-coverage.json', JSON.stringify({ rows, grand }, null, 1));
