#!/usr/bin/env node
/**
 * Frontend i18n gate — the check D-49 showed was missing.
 *
 * backend/scripts/verify-i18n.js validates the BACKEND ERROR CATALOGUE
 * (audits/backend/i18n-error-codes.md against backend/i18n/*.json). It passed
 * 252/252 during the DEEP HARDENING campaign while the UI shipped:
 *
 *   - 8 call sites rendering a raw dotted key on screen (e.g. the logout
 *     button reading literally "logout" in the teacher and parent portals)
 *   - 59 call sites falling back to an English defaultValue in an Uzbek UI
 *
 * because that verifier never reads a frontend locale file or a t() call site.
 * This one does.
 *
 * Exit codes:
 *   0  no t() call site renders a raw key
 *   1  at least one raw key would reach a user  (hard failure)
 *
 * English defaultValue fallbacks are REPORTED but do not fail the build: they
 * degrade to readable English rather than to a dotted identifier, and closing
 * them is translation work, not a code fix. The count is printed so it cannot
 * quietly grow.
 *
 * Usage: node scripts/verify-frontend-i18n.mjs [--strict]
 *        --strict also fails on English defaultValue fallbacks.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');

// Each portal maps to every catalogue its i18n.js actually merges.
// teacher/src/i18n.js:59-62 merges the portal and parent catalogues — missing
// that is what made the first P7 analysis over-report by a factor of 27.
// The merge chain, read from the code rather than assumed
// (Campaign II P6.1 — the first version of this gate omitted shared/, and its
// counts were therefore computed against an incomplete catalogue):
//
//   shared/utils/mergeLocales.js:11    mergeLocales(shared, portal)
//   admin/src/i18n.js:11-15            mergeLocales(shared<L>, portal<L>)
//   reception, government              same shape
//   teacher/src/i18n.js:18-20          const <L> = mergeLocales(shared<L>, portal<L>)
//   teacher/src/i18n.js:59-62          mergeDeep(<L>, <L>Parent)   <- THREE catalogues
const PORTALS = {
  teacher: (l) => [`shared/locales/${l}.json`, `teacher/src/locales/${l}/common.json`, `teacher/src/parent/locales/${l}/common.json`],
  admin: (l) => [`shared/locales/${l}.json`, `admin/src/locales/${l}/common.json`],
  reception: (l) => [`shared/locales/${l}.json`, `reception/src/locales/${l}/common.json`],
  government: (l) => [`shared/locales/${l}.json`, `government/src/locales/${l}/common.json`],
};
const LOCALES = ['uz', 'ru', 'en'];

const flatten = (obj, prefix = '', acc = new Set()) => {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, acc);
    else acc.add(key);
  }
  return acc;
};

const loadCatalogue = (files) => {
  const set = new Set();
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const k of flatten(JSON.parse(fs.readFileSync(p, 'utf8')))) set.add(k);
  }
  return set;
};

const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|__tests__|locales|dist|build/.test(f)) walk(f, acc);
    } else if (/\.jsx?$/.test(e.name)) acc.push(f);
  }
  return acc;
};

let rawKeyTotal = 0;
let defaultValueTotal = 0;
const rawFindings = [];
const parityFindings = [];

for (const [portal, files] of Object.entries(PORTALS)) {
  const catalogues = Object.fromEntries(LOCALES.map((l) => [l, loadCatalogue(files(l))]));
  const uz = catalogues.uz;

  // 1. every t('key') call site must resolve in the primary catalogue
  for (const file of walk(path.join(ROOT, portal, 'src'))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'\s*(,\s*\{[\s\S]{0,300}?\})?\s*\)/g)) {
      const key = m[1];
      if (uz.has(key)) continue;
      const hasDefault = m[2] && /defaultValue/.test(m[2]);
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      if (hasDefault) { defaultValueTotal++; parityFindings.push(`${portal}: ${key}  ${rel}`); }
      else { rawKeyTotal++; rawFindings.push(`${portal}: ${key}  ${rel}`); }
    }
  }

  // 2. locale parity within the portal
  for (const loc of LOCALES.filter((l) => l !== 'uz')) {
    const missing = [...uz].filter((k) => !catalogues[loc].has(k));
    if (missing.length) parityFindings.push(`${portal}/${loc}: ${missing.length} key(s) present in uz but missing here`);
  }
}

console.log('Frontend i18n gate\n');
console.log(`  raw keys that would reach a user : ${rawKeyTotal}`);
console.log(`  English defaultValue fallbacks   : ${defaultValueTotal}`);
if (rawFindings.length) {
  console.log('\n  RAW KEYS (hard failure — a user sees the dotted identifier):');
  rawFindings.forEach((f) => console.log(`    ${f}`));
}
if (parityFindings.length) {
  console.log(`\n  Reported, not failing${STRICT ? ' — but --strict is on' : ''}:`);
  parityFindings.slice(0, 60).forEach((f) => console.log(`    ${f}`));
  if (parityFindings.length > 60) console.log(`    … and ${parityFindings.length - 60} more`);
}

const failed = rawKeyTotal > 0 || (STRICT && defaultValueTotal > 0);
console.log(`\n${failed ? '❌ FAILED' : '✅ PASSED'} — ${rawKeyTotal} raw key(s), ${defaultValueTotal} English fallback(s)\n`);
process.exit(failed ? 1 : 0);
