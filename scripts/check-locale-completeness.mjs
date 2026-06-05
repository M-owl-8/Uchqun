/**
 * check-locale-completeness.mjs
 * Extracts every t() key used in a portal's src and diffs against uz/ru/en catalogs.
 * Exit 1 if any catalog gaps found.
 *
 * Usage:
 *   node scripts/check-locale-completeness.mjs [--portal=admin|reception] [--quiet]
 *   node scripts/check-locale-completeness.mjs --all [--quiet]
 *
 * Defaults to --portal=admin for backwards compatibility.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');
const RUN_ALL = process.argv.includes('--all');

const portalArg = process.argv.find(a => a.startsWith('--portal='));
const PORTAL = portalArg ? portalArg.split('=')[1] : 'admin';

// Portals that have been onboarded to locale completeness checking
const ONBOARDED_PORTALS = ['admin', 'reception', 'teacher'];

// ── Portal config ─────────────────────────────────────────────────────────────

function getPortalConfig(portal) {
  const configs = {
    admin: {
      srcDir: join(ROOT, 'admin', 'src'),
      localePath: (lang) => join(ROOT, 'admin', 'src', 'locales', lang, 'common.json'),
    },
    reception: {
      srcDir: join(ROOT, 'reception', 'src'),
      localePath: (lang) => join(ROOT, 'reception', 'src', 'locales', lang, 'common.json'),
    },
    teacher: {
      srcDir: join(ROOT, 'teacher', 'src'),
      localePath: (lang) => join(ROOT, 'teacher', 'src', 'locales', lang, 'common.json'),
      // Teacher app also merges parent locales at runtime; include them so keys from parent pages resolve.
      extraLocalePaths: [(lang) => join(ROOT, 'teacher', 'src', 'parent', 'locales', lang, 'common.json')],
    },
  };
  const cfg = configs[portal];
  if (!cfg) {
    console.error(`Unknown portal: "${portal}". Onboarded portals: ${ONBOARDED_PORTALS.join(', ')}`);
    process.exit(1);
  }
  return cfg;
}

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
    if (m[1] && m[1].includes('.')) {
      keys.add(m[1]);
    }
  }
  return keys;
}

// ── Key resolver ──────────────────────────────────────────────────────────────
// Mirrors i18next v23 plural-key lookup: if the bare key is absent, accept any
// plural-suffix variant (_one, _other, _few, _many, _zero, _two) as proof of
// presence.  This handles keys declared only as "key_one"/"key_other" etc.

function resolveKey(catalog, keyPath) {
  const parts = keyPath.split('.');
  let curr = catalog;
  for (const part of parts) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  if (typeof curr === 'object' && curr !== null) return undefined;
  // Bare key found (string, number, bool) — return it.
  if (curr !== undefined) return curr;

  // Bare key absent — check plural-suffix variants on the parent object.
  const parentParts = parts.slice(0, -1);
  const leafKey = parts[parts.length - 1];
  let parent = catalog;
  for (const part of parentParts) {
    if (parent == null || typeof parent !== 'object') return undefined;
    parent = parent[part];
  }
  if (parent == null || typeof parent !== 'object') return undefined;
  const PLURAL_SUFFIXES = ['_one', '_other', '_few', '_many', '_zero', '_two'];
  for (const suffix of PLURAL_SUFFIXES) {
    const v = parent[leafKey + suffix];
    if (v !== undefined && typeof v !== 'object') return v;
  }
  return undefined;
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

// ── Run check for a single portal ─────────────────────────────────────────────

function runPortalCheck(portal) {
  const cfg = getPortalConfig(portal);
  const LANGS = ['uz', 'en', 'ru'];
  const catalogs = {};

  for (const lang of LANGS) {
    const sharedPath = join(ROOT, 'shared', 'locales', `${lang}.json`);
    const portalPath = cfg.localePath(lang);
    const shared = JSON.parse(readFileSync(sharedPath, 'utf8'));
    const portalLocale = JSON.parse(readFileSync(portalPath, 'utf8'));
    catalogs[lang] = mergeLocales(shared, portalLocale);
    if (cfg.extraLocalePaths) {
      for (const extraPath of cfg.extraLocalePaths) {
        const extraLocale = JSON.parse(readFileSync(extraPath(lang), 'utf8'));
        catalogs[lang] = mergeLocales(catalogs[lang], extraLocale);
      }
    }
  }

  const files = walkFiles(cfg.srcDir, ['.jsx', '.js', '.tsx', '.ts'], ['__tests__', 'node_modules']);

  const allKeys = new Set();
  const keyOrigins = {};

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const key of extractKeys(src)) {
      allKeys.add(key);
      if (!keyOrigins[key]) keyOrigins[key] = [];
      const rel = file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
      if (!keyOrigins[key].includes(rel)) keyOrigins[key].push(rel);
    }
  }

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
      !/^[A-Z0-9_]+$/.test(uzVal)
    ) {
      uzRuSuspect.push({ key, value: uzVal });
    }
  }

  console.log(`\n=== LOCALE COMPLETENESS CHECK (${portal} portal) ===\n`);
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
    console.log(`\n❌ FAIL — catalog gaps found in ${portal} portal. Add all missing keys before merging.\n`);
  } else {
    console.log(`\n✅ PASS — all keys present in all three catalogs (${portal} portal).\n`);
  }

  return anyMissing;
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (RUN_ALL) {
  let anyFailed = false;
  for (const portal of ONBOARDED_PORTALS) {
    const failed = runPortalCheck(portal);
    if (failed) anyFailed = true;
  }
  if (anyFailed) {
    console.log('❌ FAIL — one or more portals have catalog gaps.\n');
    process.exit(1);
  } else {
    console.log('✅ PASS — all onboarded portals have complete catalogs.\n');
  }
} else {
  const failed = runPortalCheck(PORTAL);
  if (failed) process.exit(1);
}
