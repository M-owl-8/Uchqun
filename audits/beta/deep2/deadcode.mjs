// P1.6 — unreferenced modules, undocumented env vars, migration hygiene.
// Pure-Node corpus scan: read every tracked text file once and test membership.
// (An earlier version shelled out to `git grep -E` with \s, which POSIX ERE does
// not support; it matched nothing and reported 635 "unreferenced" modules
// including ones this campaign had exercised by hand. Do not reintroduce that.)
import { spawnSync } from 'child_process';
import fs from 'fs';
const g = (a) => (spawnSync('git', a, { encoding: 'utf8', shell: false }).stdout || '').trim();
const files = g(['ls-files']).split('\n').filter(Boolean);

const TEXT = /\.(jsx?|mjs|cjs|ts|tsx|json|md|yml|yaml|html|css)$/;
const corpus = new Map();
for (const f of files) {
  if (!TEXT.test(f) || f.includes('node_modules')) continue;
  try { corpus.set(f, fs.readFileSync(f, 'utf8')); } catch { /* binary */ }
}

const modules = files.filter(f =>
  /^(admin|teacher|reception|government|shared|backend)\/.*\.(jsx?|mjs)$/.test(f)
  && !/node_modules|__tests__|\.test\.|\.spec\./.test(f));

const ENTRY = /(^|\/)(index|main|App|server|vite\.config|tailwind\.config|postcss\.config|eslint\.config|jest\.config|vitest\.config)\.(jsx?|mjs|cjs)$/;
const unref = [];
for (const f of modules) {
  if (ENTRY.test(f)) continue;
  const base = f.split('/').pop().replace(/\.(jsx?|mjs)$/, '');
  let referenced = false;
  for (const [other, text] of corpus) {
    if (other === f) continue;
    if (text.includes(base)) { referenced = true; break; }
  }
  if (!referenced) unref.push(f);
}

const envInCode = new Set();
for (const [f, text] of corpus) {
  if (!/^backend\//.test(f) || !/\.js$/.test(f)) continue;
  for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) envInCode.add(m[1]);
}
// two example files exist (backend/env.example and backend/.env.example);
// a variable documented in either one counts as documented.
// read directly: the corpus only holds files whose extension matches TEXT,
// and ".example" does not — which silently made every variable look undocumented.
const readIf = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const example = readIf('backend/env.example') + readIf('backend/.env.example');
const undocumented = [...envInCode].filter(v => !example.includes(v)).sort();

const migs = files.filter(f => /^backend\/migrations\/.*\.js$/.test(f)).map(f => f.split('/').pop());
const stamps = {};
migs.forEach(m => { const t = m.slice(0, 14); (stamps[t] = stamps[t] || []).push(m); });
const dupStamps = Object.entries(stamps).filter(([, v]) => v.length > 1);

console.log(`modules scanned      : ${modules.length}`);
console.log(`unreferenced modules : ${unref.length}`);
unref.forEach(f => console.log('   ', f));
console.log(`\nenv vars used in backend code but absent from backend/env.example : ${undocumented.length}`);
console.log('   ', undocumented.join(', '));
console.log(`\nmigrations: ${migs.length}   duplicate timestamps: ${dupStamps.length}`);
dupStamps.forEach(([t, v]) => console.log('   ', t, '->', v.join('  |  ')));
fs.writeFileSync('audits/beta/deep2/deadcode.json', JSON.stringify({ scanned: modules.length, unref, undocumented, dupStamps }, null, 1));
