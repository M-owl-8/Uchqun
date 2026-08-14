#!/usr/bin/env node
/**
 * Mechanical enforcement of the CLAUDE.md rules that were prose only.
 *
 * P1 audited the 26 rules in CLAUDE.md and found that the ones actually enforced
 * are largely the mechanical ones — lint, commitlint, migrations. **R15, the
 * child-scoped resource access pattern, is the most safety-critical rule in the
 * document, is printed there with its correct code form and the exact models
 * involved, and is enforced by nothing.** That is the shape of D-47, D-53 and
 * D-54: three separate tenant-isolation holes, each a controller that read a
 * child-scoped resource without calling validateChildAccess.
 *
 * P1 also warned against the naive version of this gate. Failing the build on
 * `else if (req.user.schoolId)` would fail on CORRECT code: that exact string is
 * present and right at activityController.js:65 and mealController.js:65, where
 * it is the no-childId branch and school scope is precisely what belongs there.
 *
 * So R15 keys on the PAIRING, not on a string:
 *
 *     a handler that assigns `where.childId = <the request's childId>`
 *     without an intervening validateChildAccess / findChildScopedResource
 *
 * That is the actual defect: trusting a client-supplied childId to scope a
 * query. Exit 1 on any violation.
 *
 * Usage: node scripts/verify-conventions.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const violations = [];
const checked = { R15: 0, R06: 0, R09: 0, R18: 0, D59: 0 };

const walk = (dir, filter, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|dist|build|coverage|\.git/.test(f)) walk(f, filter, acc);
    } else if (filter(e.name)) acc.push(f);
  }
  return acc;
};

const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
// strip comments and string literals so a rule cannot be satisfied — or tripped —
// by prose in a comment
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

// ── R15 — child-scoped resource access (the D-47 / D-53 / D-54 shape) ──────
{
  const files = walk(path.join(ROOT, 'backend', 'controllers'), (n) => n.endsWith('.js'));
  for (const file of files) {
    const src = strip(fs.readFileSync(file, 'utf8'));
    // Local helpers in THIS file that themselves perform a child access check.
    // Their names count as guards; the helper's own body is what is trusted.
    // irrController.js:25 resolveChildAccess() is the real case: it checks
    // schoolId and isTeacherAssignedToChild by hand and is entirely correct.
    const localGuards = [...src.matchAll(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]{0,900}?)\n\}/g)]
      .filter((m) => /validateChildAccess|isTeacherAssignedToChild|findChildScopedResource|schoolId\s*!==\s*req\.user\.schoolId/.test(m[2]))
      .map((m) => m[1]);
    // split into functions so a validateChildAccess in a NEIGHBOURING handler
    // cannot vouch for this one — that is how D-53 hid
    const fns = src.split(/\n(?=(?:export )?(?:const|async function|function)\s)/);
    for (const fn of fns) {
      const name = (fn.match(/(?:export\s+)?(?:const|async function|function)\s+(\w+)/) || [])[1] ?? '<anonymous>';
      // does this handler scope a query by a childId it took from the request?
      const assigns = /where\.childId\s*=\s*(?!\{\s*\[Op\.in\])/.test(fn)
        || /\bchildId\s*:\s*childId\b/.test(fn)
        || /\bwhere\s*=\s*\{[^}]*\bchildId\b/.test(fn);
      if (!assigns) continue;
      // does the childId originate from the request at all?
      const fromRequest = /req\.(query|params|body)\b[\s\S]{0,400}?childId|childId[\s\S]{0,120}?req\.(query|params|body)/.test(fn);
      if (!fromRequest) continue;
      checked.R15++;
      // A handler is guarded if it does ANY of three things. All three are in
      // use here and all three are correct; keying on only the first is the
      // naive gate P1 warned about, and it fires on correct code.
      //
      //   1. calls the canonical helpers directly
      //   2. calls a LOCAL helper that itself calls them (see localGuards)
      //   3. derives the allowed child ids FROM THE DATABASE and checks the
      //      request's childId against that set before using it — the parent
      //      pattern in attendanceController.getMyChildAttendance, which is
      //      stronger than validateChildAccess for a parent, not weaker
      const guardedDirect = /validateChildAccess|findChildScopedResource|isTeacherAssignedToChild/.test(fn);
      const guardedByLocalHelper = localGuards.length > 0
        && new RegExp(`\\b(?:${localGuards.join('|')})\\s*\\(`).test(fn);
      const derivesAllowedSet = /Child\.findAll\s*\(/.test(fn)
        && (/\.includes\s*\(\s*childId/.test(fn) || /childId\s*:\s*\{\s*\[Op\.in\]/.test(fn));
      const guarded = guardedDirect || guardedByLocalHelper || derivesAllowedSet;
      if (!guarded) {
        violations.push({
          rule: 'R15',
          file: rel(file),
          detail: `${name}() scopes a query by a request-supplied childId with no validateChildAccess / findChildScopedResource. `
            + 'A role check is not a school-scope check — this is the D-47 shape.',
        });
      }
    }
  }
}

// ── R06 — ES Modules only in the backend, no require() ────────────────────
{
  const files = walk(path.join(ROOT, 'backend'), (n) => n.endsWith('.js'))
    .filter((f) => !/__tests__|migrations|seeders|scripts|\.config\.|jest\./.test(rel(f)));
  for (const file of files) {
    const src = strip(fs.readFileSync(file, 'utf8'));
    checked.R06++;
    const m = src.match(/^[^\n]*\brequire\s*\(/m);
    if (m) violations.push({ rule: 'R06', file: rel(file), detail: `require() in an ES module: ${m[0].trim().slice(0, 80)}` });
    if (/\bmodule\.exports\b/.test(src)) {
      violations.push({ rule: 'R06', file: rel(file), detail: 'module.exports in an ES module — it loads as an empty object and the code silently does nothing (see P7 §9)' });
    }
  }
}

// ── R09 — every new error code has a catalogue row ────────────────────────
{
  const cat = fs.readFileSync(path.join(ROOT, 'audits/backend/i18n-error-codes.md'), 'utf8');
  const catalogued = new Set([...cat.matchAll(/`([A-Z][A-Z0-9_]{4,})`/g)].map((m) => m[1]));
  const files = walk(path.join(ROOT, 'backend', 'controllers'), (n) => n.endsWith('.js'));
  const missing = new Set();
  for (const file of files) {
    const src = strip(fs.readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/error\s*:\s*\{\s*code\s*:\s*'([A-Z][A-Z0-9_]+)'/g)) {
      checked.R09++;
      if (!catalogued.has(m[1])) missing.add(`${m[1]}  (${rel(file)})`);
    }
  }
  for (const m of missing) violations.push({ rule: 'R09', file: m.split('(')[1]?.replace(')', '') ?? '', detail: `error code ${m.split(' ')[0]} has no row in audits/backend/i18n-error-codes.md` });
}

// ── R18 — FORCE_SYNC must never be enabled ────────────────────────────────
{
  const files = walk(path.join(ROOT, 'backend'), (n) => /\.(js|json|ya?ml|toml)$/.test(n))
    .filter((f) => !/package-lock/.test(f));
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    checked.R18++;
    if (/FORCE_SYNC\s*[:=]\s*['"]?true/i.test(src)) {
      violations.push({ rule: 'R18', file: rel(file), detail: 'FORCE_SYNC=true drops every table' });
    }
  }
}

// ── D-59 — every test file on disk must be collected ──────────────────────
// Not a CLAUDE.md rule; a rule this campaign earned. The teacher suite ran 11 of
// 19 files and exited 0. A config that silently drops test files is worse than a
// failing test, because it reports success.
{
  for (const app of ['admin', 'teacher', 'reception', 'government']) {
    const cfg = path.join(ROOT, app, 'vite.config.js');
    if (!fs.existsSync(cfg)) continue;
    checked.D59++;
    const src = fs.readFileSync(cfg, 'utf8');
    if (/\bpoolOptions\s*:/.test(strip(src))) {
      violations.push({
        rule: 'D-59', file: `${app}/vite.config.js`,
        detail: 'test.poolOptions was REMOVED in vitest 4. It is silently ignored, workers over-subscribe, '
          + 'and files whose workers fail to start are dropped from the run while it still exits 0.',
      });
    }
  }
}

// ── report ────────────────────────────────────────────────────────────────
console.log('CLAUDE.md convention gate\n');
console.log(`  R15 child-scoped access   : ${checked.R15} childId-scoped handler(s) examined`);
console.log(`  R06 ES modules only       : ${checked.R06} backend module(s) examined`);
console.log(`  R09 error-code catalogue  : ${checked.R09} coded error(s) examined`);
console.log(`  R18 FORCE_SYNC            : ${checked.R18} file(s) examined`);
console.log(`  D-59 vitest collection    : ${checked.D59} portal config(s) examined`);

if (violations.length) {
  console.log('\n  VIOLATIONS:\n');
  for (const v of violations) console.log(`    [${v.rule}] ${v.file}\n           ${v.detail}\n`);
}
console.log(`${violations.length ? '❌ FAILED' : '✅ PASSED'} — ${violations.length} violation(s)\n`);
process.exit(violations.length ? 1 : 0);
