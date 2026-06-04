/**
 * check-locale-completeness.mjs
 * Extracts every t() key used in admin/src and diffs against uz/ru/en catalogs.
 * Exit 1 if any catalog gaps found.
 *
 * Usage: node scripts/check-locale-completeness.mjs [--quiet]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

// ── File walker ───────────────────────────────────────────────────────────────

function walkFiles(dir, exts, excludeDirs = []) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return results; }
  for (const entry of entries) {
    if (excludeDirs.includes(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      results.push(...walkFiles(full, exts, excludeDirs));
    } else if (exts.includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

// ── Key extractor ─────────────────────────────────────────────────────────────
// Matches: t('key'), t("key"), t('key', {...}), i18n.t('key')
// Skips template literals and dynamic keys.

function extractKeys(src) {
  const keys = new Set();
  const re = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // Skip purely numeric keys, single-segment keys that are common non-translation calls
    if (m[1] && m[1].includes('.')) {
      keys.add(m[1]);
    }
  }
  return keys;
}

// ── Key resolver ──────────────────────────────────────────────────────────────
// i18next resolves 'a.b.c' → catalog.a.b.c

function resolveKey(catalog, keyPath) {
  const parts = keyPath.split('.');
  let curr = catalog;
  for (const part of parts) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  if (typeof curr === 'object' && curr !== null) return undefined; // object ≠ string value
  return curr;
}

// ── mergeLocales (mirrors runtime behaviour) ──────────────────────────────────

function mergeLocales(shared, portal) {
  const result = { ...shared };
  for (const key of Object.keys(portal)) {
    if (
      result[key] != null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key]) &&
      typeof portal[key] === 'object' &&
      !Array.isArray(portal[key])
    ) {
      result[key] = { ...result[key], ...portal[key] };
    } else {
      result[key] = portal[key];
    }
  }
  return result;
}

// ── Load catalogs ─────────────────────────────────────────────────────────────

const LANGS = ['uz', 'en', 'ru'];
const catalogs = {};

for (const lang of LANGS) {
  const sharedPath = join(ROOT, 'shared', 'locales', `${lang}.json`);
  const portalPath = join(ROOT, 'admin', 'src', 'locales', lang, 'common.json');
  const shared = JSON.parse(readFileSync(sharedPath, 'utf8'));
  const portal = JSON.parse(readFileSync(portalPath, 'utf8'));
  catalogs[lang] = mergeLocales(shared, portal);
}

// ── Walk admin/src ────────────────────────────────────────────────────────────

const srcDir = join(ROOT, 'admin', 'src');
const files = walkFiles(srcDir, ['.jsx', '.js', '.tsx', '.ts'], ['__tests__', 'node_modules']);

const allKeys = new Set();
const keyOrigins = {}; // key → [file, ...]

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const key of extractKeys(src)) {
    allKeys.add(key);
    if (!keyOrigins[key]) keyOrigins[key] = [];
    const rel = file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
    if (!keyOrigins[key].includes(rel)) keyOrigins[key].push(rel);
  }
}

// ── Check each language ───────────────────────────────────────────────────────

const missing = {};
for (const lang of LANGS) {
  missing[lang] = [];
  for (const key of allKeys) {
    const val = resolveKey(catalogs[lang], key);
    if (val === undefined || val === null) {
      missing[lang].push(key);
    }
  }
  missing[lang].sort();
}

// ── Suspicious UZ==RU ─────────────────────────────────────────────────────────

const uzRuSuspect = [];
for (const key of allKeys) {
  const uzVal = resolveKey(catalogs.uz, key);
  const ruVal = resolveKey(catalogs.ru, key);
  if (
    uzVal && ruVal &&
    typeof uzVal === 'string' && typeof ruVal === 'string' &&
    uzVal === ruVal &&
    uzVal.length > 3 &&
    !/^\d+$/.test(uzVal) &&
    !/^[A-Z0-9_]+$/.test(uzVal) // skip error code constants
  ) {
    uzRuSuspect.push({ key, value: uzVal });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log('\n=== LOCALE COMPLETENESS CHECK (admin portal) ===\n');
console.log(`Source files scanned: ${files.length}`);
console.log(`Unique t() keys found: ${allKeys.size}`);

let anyMissing = false;

for (const lang of LANGS) {
  const count = missing[lang].length;
  if (count === 0) {
    console.log(`\n✅ ${lang.toUpperCase()}: all keys present`);
  } else {
    anyMissing = true;
    console.log(`\n❌ ${lang.toUpperCase()}: ${count} missing keys:`);
    for (const key of missing[lang]) {
      if (!QUIET) {
        const uzVal = resolveKey(catalogs.uz, key);
        console.log(`   ${key}${uzVal ? `  [UZ: "${uzVal}"]` : ''}`);
      } else {
        console.log(`   ${key}`);
      }
    }
  }
}

if (uzRuSuspect.length > 0) {
  console.log(`\n⚠️  UZ==RU SUSPECT (${uzRuSuspect.length} keys — likely UZ copied into RU):`);
  const show = QUIET ? uzRuSuspect.slice(0, 5) : uzRuSuspect.slice(0, 30);
  for (const { key, value } of show) {
    console.log(`   ${key}: "${value}"`);
  }
  if (uzRuSuspect.length > show.length) {
    console.log(`   ... and ${uzRuSuspect.length - show.length} more`);
  }
}

if (anyMissing) {
  console.log('\n❌ FAIL — catalog gaps found. Add all missing keys before merging.\n');
  process.exit(1);
} else {
  console.log('\n✅ PASS — all keys present in all three catalogs.\n');
}
