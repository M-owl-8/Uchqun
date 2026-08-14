// P1.1 — machine-generated document inventory. Hand-listing 256 files invites
// omission; this reads git for provenance and the file itself for its claim.
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';

const files = spawnSync('git', ['ls-files', '*.md'], { encoding: 'utf8', shell: false }).stdout.trim().split('\n').filter(Boolean);
const rows = [];
for (const f of files) {
  let sha = '', date = '', subject = '';
  // spawnSync with shell:false — on Windows, cmd.exe expands %h/%ad as variables
  const r = spawnSync('git', ['log', '-1', '--date=short', '--format=%h%ad%s', '--', f], { encoding: 'utf8', shell: false });
  if (r.stdout) [sha, date, subject] = r.stdout.trim().split('');
  let head = '', status = '', claim = '';
  try {
    const src = fs.readFileSync(f, 'utf8');
    head = (src.match(/^#\s+(.+)$/m) || [])[1] || '';
    status = (src.match(/^\*\*Status:?\*\*\s*(.+)$/mi) || src.match(/^Status:\s*(.+)$/mi) || [])[1] || '';
    // a claim of authority: PASS/COMPLETE/AUTHORITATIVE/canonical/source of truth
    const m = src.match(/(COMPLETE\s*—[^\n]*|\d+\/\d+\s+PASS|source of truth|canonical|AUTHORITATIVE)/i);
    claim = m ? m[1].slice(0, 60) : '';
  } catch { /* noop */ }
  rows.push({ f, sha, date, subject: (subject || '').slice(0, 46), head: head.slice(0, 54), status: status.slice(0, 40), claim });
}
rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
fs.writeFileSync('audits/beta/deep2/inventory.json', JSON.stringify(rows, null, 1));

const bucket = {};
for (const r of rows) { const d = r.f.includes('/') ? r.f.replace(/\/[^/]*$/, '') : '(root)'; (bucket[d] = bucket[d] || []).push(r); }
console.log(`files: ${rows.length}`);
console.log(`with an authority claim: ${rows.filter(r => r.claim).length}`);
console.log(`\n=== oldest 12 (staleness candidates) ===`);
rows.slice(-12).forEach(r => console.log(r.date, r.sha.padEnd(9), r.f));
console.log(`\n=== documents claiming PASS / COMPLETE / canonical ===`);
rows.filter(r => r.claim).slice(0, 30).forEach(r => console.log(r.date, r.f.padEnd(56), '|', r.claim));
