#!/usr/bin/env node
/**
 * Campaign III P4.3 — the suite baseline gate.
 *
 * D-59: the teacher suite ran 11 of 19 files and exited 0. The CI check added in
 * Campaign II compared vitest's COLLECTED count against files on disk, which
 * catches a runner silently dropping files. It does not catch a file being
 * deleted, renamed out of the glob, or emptied — on-disk and collected both fall
 * together and the check stays green.
 *
 * This gate compares against a COMMITTED baseline: the exact file list and test
 * count each suite had when it was last verified. A suite that shrinks fails,
 * and the failure names the files that disappeared.
 *
 * Baseline lives in audits/suite-baseline.json and is updated deliberately, in a
 * commit, with the reason in the message. Growing a suite requires updating it;
 * that friction is the point.
 *
 * Usage:
 *   node scripts/verify-suite-baseline.mjs <suite> --tests <n>
 *   node scripts/verify-suite-baseline.mjs --update      (regenerate file lists)
 *
 * Exit 0 when the suite is at or above baseline, 1 otherwise.
 */
import fs from 'fs';
import path from 'path';

const BASELINE = path.resolve('audits/suite-baseline.json');

const SUITES = {
  backend: { dir: 'backend/__tests__', exclude: /\/integration\// },
  'backend-integration': { dir: 'backend/__tests__/integration' },
  admin: { dir: 'admin/src' },
  teacher: { dir: 'teacher/src' },
  reception: { dir: 'reception/src' },
  government: { dir: 'government/src' },
};

const TEST_FILE = /\.(test|spec)\.(js|jsx|mjs|ts|tsx)$/;

const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|dist|build|coverage/.test(f)) walk(f, acc);
    } else if (TEST_FILE.test(e.name)) acc.push(f);
  }
  return acc;
};

const filesFor = (name) => {
  const s = SUITES[name];
  return walk(path.resolve(s.dir))
    .map((f) => path.relative(process.cwd(), f).replace(/\\/g, '/'))
    .filter((f) => !s.exclude || !s.exclude.test(`/${f}/`))
    .sort();
};

const argv = process.argv.slice(2);

if (argv.includes('--update')) {
  const out = {};
  for (const name of Object.keys(SUITES)) {
    const files = filesFor(name);
    const prev = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8'))[name] : null;
    out[name] = { tests: prev?.tests ?? 0, files };
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify(out, null, 1)}\n`);
  console.log('baseline file lists regenerated. Test counts preserved — set them with --tests.');
  for (const [k, v] of Object.entries(out)) console.log(`  ${k.padEnd(20)} ${v.files.length} files, tests baseline ${v.tests}`);
  process.exit(0);
}

const suite = argv[0];
if (!suite || !SUITES[suite]) {
  console.error(`usage: verify-suite-baseline.mjs <${Object.keys(SUITES).join('|')}> --tests <n>`);
  process.exit(2);
}

const testsIdx = argv.indexOf('--tests');
const observedTests = testsIdx === -1 ? null : Number(argv[testsIdx + 1]);

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))[suite];
if (!baseline) { console.error(`no baseline for ${suite}`); process.exit(2); }

const present = filesFor(suite);
const presentSet = new Set(present);
const missing = baseline.files.filter((f) => !presentSet.has(f));
const added = present.filter((f) => !baseline.files.includes(f));

console.log(`Suite baseline — ${suite}`);
console.log(`  files   baseline ${baseline.files.length}   present ${present.length}`);
if (observedTests !== null) console.log(`  tests   baseline ${baseline.tests}   observed ${observedTests}`);

let failed = false;

if (missing.length) {
  failed = true;
  console.log(`\n  ❌ ${missing.length} test file(s) in the baseline are GONE:`);
  for (const f of missing) console.log(`       - ${f}`);
  console.log('     A suite that shrinks is a suite that stopped testing something.');
  console.log('     If the removal is intended, update audits/suite-baseline.json in the');
  console.log('     same commit and say why in the message.');
}

if (observedTests !== null && Number.isFinite(observedTests) && observedTests < baseline.tests) {
  failed = true;
  console.log(`\n  ❌ test count fell: ${observedTests} < ${baseline.tests} (baseline)`);
  console.log('     Files can be present while their tests vanish — a describe block');
  console.log('     commented out, a .skip added, an early return. This catches that.');
}

if (added.length) console.log(`\n  ℹ ${added.length} new file(s) not yet in the baseline: ${added.slice(0, 5).join(', ')}${added.length > 5 ? ' …' : ''}`);

console.log(failed ? '\n❌ FAILED\n' : '\n✅ at or above baseline\n');
process.exit(failed ? 1 : 0);
