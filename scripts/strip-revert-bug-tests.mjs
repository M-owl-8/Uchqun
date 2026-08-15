#!/usr/bin/env node
/**
 * Campaign III P4.6 — remove the [REVERT-TEST: BUG] tests.
 *
 * 29 tests across 12 backend files define a LOCAL COPY of previously-buggy code
 * and assert that the bug happens:
 *
 *     const buggyResolveWarning = async (req, res) => { …BUG… };
 *     await buggyResolveWarning(req, res);
 *     expect(update).toHaveBeenCalled(); // BUG: resolved cross-region
 *
 * They never touch the production controller, so they cannot fail when it
 * regresses and cannot fail when it is fixed. Proven empirically: with the real
 * guard at aiWarningController.js:271 disabled,
 *
 *     Tests: 1 failed, 1 passed
 *
 * — the [REVERT-TEST: FIXED] test caught it; the [REVERT-TEST: BUG] test PASSED
 * while production was broken.
 *
 * Every one has a [REVERT-TEST: FIXED] counterpart that DOES call the real
 * controller (29 BUG, 30 FIXED). The documentation value — what the bug looked
 * like — is preserved as a comment; the unfalsifiable test is removed.
 *
 * Usage: node scripts/strip-revert-bug-tests.mjs [--dry]
 */
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve('backend/__tests__');

const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, acc);
    else if (f.endsWith('.test.js')) acc.push(f);
  }
  return acc;
};

let removed = 0;
const touched = [];

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!/REVERT-TEST:? BUG/.test(src)) continue;

  let out = src;
  let changedHere = 0;

  for (;;) {
    const m = /[ \t]*it\(\s*(['"`])\[REVERT-TEST:? BUG\]\s*([\s\S]*?)\1\s*,/.exec(out);
    if (!m) break;

    const title = m[2].replace(/\s+/g, ' ').trim();
    const start = m.index;
    // walk to the end of the it(...) call
    let i = out.indexOf('(', start + out.slice(start).indexOf('it'));
    let depth = 0;
    for (; i < out.length; i++) {
      if (out[i] === '(') depth++;
      else if (out[i] === ')') { depth--; if (depth === 0) break; }
    }
    // include a trailing ); and newline
    let end = i + 1;
    while (end < out.length && /[;\r\n]/.test(out[end])) { end++; if (out[end - 1] === '\n') break; }

    const indent = (out.slice(0, start).match(/[ \t]*$/) || [''])[0];
    const note =
      `${indent}// Historical bug, documented rather than asserted (P4.6):\n`
      + `${indent}//   ${title}\n`
      + `${indent}// The former [REVERT-TEST: BUG] case here reimplemented the buggy code\n`
      + `${indent}// locally and asserted the bug, so it could not fail when the real\n`
      + `${indent}// controller regressed. The [REVERT-TEST: FIXED] case below exercises\n`
      + `${indent}// the real controller and is what actually guards this.\n`;

    out = out.slice(0, start) + note + out.slice(end);
    changedHere++;
    removed++;
  }

  if (changedHere) {
    touched.push(`${path.relative(process.cwd(), file).replace(/\\/g, '/')}  (${changedHere})`);
    if (!DRY) fs.writeFileSync(file, out, 'utf8');
  }
}

console.log(`${DRY ? '[dry run] ' : ''}removed ${removed} [REVERT-TEST: BUG] tests from ${touched.length} files\n`);
for (const t of touched) console.log(`  ${t}`);
