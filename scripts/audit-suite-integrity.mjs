#!/usr/bin/env node
/**
 * Campaign III P4 — suite integrity audit.
 *
 * D-59 was one variant of a family: a suite that reports success while not
 * having tested what it claims. This finds the other variants across every suite
 * in the repository.
 *
 *   SKIPPED    .skip / xit / xdescribe / it.todo — declared and never run
 *   FOCUSED    .only — silently disables every OTHER test in the file
 *   EMPTY      a test body with no expect() and no assertion of any kind
 *   CONDITIONAL a test that returns early behind an if, so it passes by not running
 *
 * Reported, not judged automatically: some are legitimate. The point is that
 * none of them were visible anywhere before.
 *
 * Usage: node scripts/audit-suite-integrity.mjs [--json]
 * Exit 0 always — this is an inventory, not a gate. The gate is
 * scripts/verify-suite-baseline.mjs.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SUITES = [
  { name: 'backend', dir: 'backend/__tests__', exclude: /integration/ },
  { name: 'backend-integration', dir: 'backend/__tests__/integration' },
  { name: 'admin', dir: 'admin/src' },
  { name: 'teacher', dir: 'teacher/src' },
  { name: 'reception', dir: 'reception/src' },
  { name: 'government', dir: 'government/src' },
  { name: 'playwright', dir: 'tests' },
];

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

const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Extract each test body: it('name', async () => { ... }) */
function extractTests(src) {
  const out = [];
  const re = /\b(it|test)(\.\w+)*\s*\(\s*(['"`])([\s\S]*?)\3\s*,/g;
  let m;
  while ((m = re.exec(src))) {
    const start = src.indexOf('{', m.index + m[0].length);
    if (start === -1) continue;
    let depth = 0; let i = start;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    out.push({
      name: m[4].slice(0, 70),
      modifier: (m[2] || '').replace('.', ''),
      body: src.slice(start, i + 1),
      line: src.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}

const findings = { skipped: [], focused: [], empty: [], conditional: [] };
const perSuite = {};

for (const suite of SUITES) {
  const files = walk(path.join(ROOT, suite.dir))
    .filter((f) => !suite.exclude || !suite.exclude.test(path.relative(ROOT, f).replace(/\\/g, '/')));
  perSuite[suite.name] = { files: files.length, tests: 0 };

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const raw = fs.readFileSync(file, 'utf8');
    const src = strip(raw);

    // file-level skips
    for (const m of src.matchAll(/\bdescribe\.(skip|only)\s*\(\s*(['"`])([\s\S]*?)\2/g)) {
      const kind = m[1] === 'only' ? 'focused' : 'skipped';
      findings[kind].push({ file: rel, line: src.slice(0, m.index).split('\n').length,
        what: `describe.${m[1]}`, name: m[3].slice(0, 70) });
    }
    for (const m of src.matchAll(/\bxdescribe\s*\(\s*(['"`])([\s\S]*?)\1/g)) {
      findings.skipped.push({ file: rel, line: src.slice(0, m.index).split('\n').length,
        what: 'xdescribe', name: m[2].slice(0, 70) });
    }
    for (const m of src.matchAll(/\b(xit|xtest)\s*\(\s*(['"`])([\s\S]*?)\2/g)) {
      findings.skipped.push({ file: rel, line: src.slice(0, m.index).split('\n').length,
        what: m[1], name: m[3].slice(0, 70) });
    }

    // Local helpers in THIS file that themselves assert. A test calling one of
    // them IS asserting; counting only inline expect() reports every
    // helper-based test as empty. accountDomain.test.js is the real case: ten
    // tests route through an expectError() helper that calls
    // expect(err).toHaveProperty(...). Same shape as the R15 gate's
    // localGuards, and for the same reason — the naive version fires on correct
    // code.
    const assertingHelpers = [
      ...src.matchAll(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]{0,1500}?)\n\}/g),
      ...src.matchAll(/const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]{0,1500}?)\n\s*\};/g),
    ]
      .filter((m) => /\bexpect\s*\(|\bassert\b|toThrow/.test(m[2]))
      .map((m) => m[1]);
    const helperCall = assertingHelpers.length
      ? new RegExp(`\\b(?:${assertingHelpers.join('|')})\\s*\\(`)
      : null;

    const tests = extractTests(src);
    perSuite[suite.name].tests += tests.length;

    for (const t of tests) {
      if (t.modifier === 'skip' || t.modifier === 'todo') {
        findings.skipped.push({ file: rel, line: t.line, what: `it.${t.modifier}`, name: t.name });
        continue;
      }
      if (t.modifier === 'only') {
        findings.focused.push({ file: rel, line: t.line, what: 'it.only', name: t.name });
      }
      // testing-library's getBy*/findBy* THROW when the query fails, so
      // `await waitFor(() => screen.getByText(...))` is an assertion — the test
      // fails if the text never appears. Counting only expect() called six admin
      // crash-guard tests empty when they are the opposite: they are the
      // regression tests for a real crash (ADMIN-OGOHLANTIRISHLAR-CRASH).
      const asserts = /\bexpect\s*\(|\bassert\b|\.toHaveBeenCalled|toMatchSnapshot|\btoThrow\b/.test(t.body)
        || /\b(getBy|findBy|getAllBy|findAllBy)[A-Z]\w*\s*\(/.test(t.body)
        || /\bwaitFor(Selector)?\s*\(/.test(t.body)
        || (helperCall !== null && helperCall.test(t.body));
      if (!asserts) {
        findings.empty.push({ file: rel, line: t.line, what: 'no assertion', name: t.name });
      }
      // early return before any expect — passes by not running
      const firstExpect = t.body.search(/\bexpect\s*\(/);
      // Only a return at the TEST BODY's own level counts. An `if (url === …)
      // return Promise.resolve(…)` inside a mock implementation is a router,
      // not an early exit, and flagging it called six correct AdminIRR tests
      // conditional. Depth is measured from the body's opening brace, and any
      // nested function/arrow puts us deeper than 1.
      const topLevelReturn = (() => {
        let depth = 0;
        for (let k = 0; k < t.body.length; k++) {
          const ch = t.body[k];
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          else if (depth === 1 && t.body.startsWith('return', k) && /\W/.test(t.body[k - 1] ?? ' ')) {
            // is it guarded by an if on the same statement?
            const before = t.body.slice(Math.max(0, k - 200), k);
            if (/\bif\s*\([^)]*\)\s*\{?\s*$/.test(before)) return { index: k };
          }
        }
        return null;
      })();
      const earlyReturn = topLevelReturn;
      if (asserts && earlyReturn && earlyReturn.index < firstExpect) {
        findings.conditional.push({ file: rel, line: t.line, what: 'conditional early return', name: t.name });
      }
    }
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ perSuite, findings }, null, 1));
  process.exit(0);
}

console.log('Suite integrity audit\n');
console.log('  suite                 files  tests');
for (const [name, s] of Object.entries(perSuite)) {
  console.log(`  ${name.padEnd(20)} ${String(s.files).padStart(5)}  ${String(s.tests).padStart(5)}`);
}

const section = (title, rows) => {
  console.log(`\n  ${title}: ${rows.length}`);
  for (const r of rows) console.log(`    ${r.file}:${r.line}  ${r.what} — ${r.name}`);
};

section('SKIPPED (declared, never run)', findings.skipped);
section('FOCUSED (.only — disables every other test in the file)', findings.focused);
section('EMPTY (no assertion of any kind)', findings.empty);
section('CONDITIONAL (returns before asserting)', findings.conditional);

const total = Object.values(findings).reduce((a, r) => a + r.length, 0);
console.log(`\n  total: ${total}\n`);
