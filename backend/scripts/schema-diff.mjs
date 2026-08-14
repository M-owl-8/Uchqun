#!/usr/bin/env node
/**
 * Schema diff — Campaign III P2.
 *
 * Compares two canonical dumps produced by schema-dump.mjs and fails on any
 * difference.
 *
 * Why this exists: D-65 established that seven tables and eleven columns —
 * including children.schoolId, the column validateChildAccess compares against,
 * and users.isActive / users.documentsApproved, the reception access gate —
 * existed only because Sequelize sync() once created them. Campaign II made the
 * migrations RUN against an empty database. Nothing established that what they
 * PRODUCE matches production, and "it did not crash" is not the same claim.
 *
 * Every difference is a defect, to be fixed in the migrations. Never by hand in
 * production: a hand-fix makes the two agree while leaving the migration set
 * unable to reach the agreed state, which is the original defect wearing a
 * result.
 *
 * Usage:
 *   node backend/scripts/schema-diff.mjs <expected.txt> <actual.txt>
 * Exit 0 when identical, 1 otherwise.
 */
import fs from 'fs';

const [expectedPath, actualPath] = process.argv.slice(2);
if (!expectedPath || !actualPath) {
  console.error('usage: schema-diff.mjs <expected.txt> <actual.txt>');
  process.exit(2);
}

const read = (p) => fs.readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);

const expected = read(expectedPath);
const actual = read(actualPath);

const expectedSet = new Set(expected);
const actualSet = new Set(actual);

const missing = expected.filter((l) => !actualSet.has(l)); // in production, absent from fresh
const extra = actual.filter((l) => !expectedSet.has(l));   // in fresh, absent from production

// A column present in both but differing in type/nullability/default appears
// once in each list. Pair those by their identity prefix so the report reads as
// a change rather than as an unrelated add and remove.
const identity = (line) => {
  const [kind, rest] = [line.slice(0, 3), line.slice(4)];
  const parts = rest.split('|');
  if (kind === 'COL') return `COL ${parts[0]}|${parts[1]}`;
  if (kind === 'IDX') return `IDX ${parts[0]}|${parts[1]}`;
  if (kind === 'CON') return `CON ${parts[0]}|${parts[1]}`;
  if (kind === 'ENU') return `ENU ${parts[0]}|${parts[1]}`;
  if (kind === 'SEQ') return `SEQ ${parts[0]}`;
  return line;
};

const missingById = new Map(missing.map((l) => [identity(l), l]));
const extraById = new Map(extra.map((l) => [identity(l), l]));

const changed = [];
for (const [id, prodLine] of missingById) {
  if (extraById.has(id)) {
    changed.push({ id, production: prodLine, fresh: extraById.get(id) });
    missingById.delete(id);
    extraById.delete(id);
  }
}

const onlyProduction = [...missingById.values()];
const onlyFresh = [...extraById.values()];
const total = changed.length + onlyProduction.length + onlyFresh.length;

console.log('Schema diff — production vs migrate-fresh\n');
console.log(`  production objects : ${expected.length}  (${expectedPath})`);
console.log(`  fresh objects      : ${actual.length}  (${actualPath})`);
console.log(`  differences        : ${total}\n`);

const section = (title, rows, render) => {
  if (!rows.length) return;
  console.log(`  ${title} (${rows.length}):`);
  for (const r of rows) console.log(render(r));
  console.log('');
};

section('IN PRODUCTION, MISSING FROM MIGRATIONS', onlyProduction, (l) => `    - ${l}`);
section('BUILT BY MIGRATIONS, ABSENT FROM PRODUCTION', onlyFresh, (l) => `    + ${l}`);
section('DIFFERENT IN EACH', changed,
  (c) => `    ~ ${c.id}\n        production: ${c.production}\n        fresh     : ${c.fresh}`);

if (total === 0) {
  console.log('✅ IDENTICAL — the migration set reproduces production exactly.\n');
  process.exit(0);
}
console.log('❌ DIVERGED — every line above is a defect. Fix it in the migrations,');
console.log('   never by hand in production.\n');
process.exit(1);
