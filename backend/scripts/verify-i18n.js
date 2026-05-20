#!/usr/bin/env node
/**
 * Verifies that all codes in audits/backend/i18n-error-codes.md have
 * corresponding entries in each language file under backend/i18n/.
 * Reports missing or extra keys. Exits with code 1 on any mismatch.
 * Run from the project root: node backend/scripts/verify-i18n.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'audits/backend/i18n-error-codes.md');
const I18N_DIR = path.join(PROJECT_ROOT, 'backend/i18n');
const LANG_FILES = ['ru.json', 'uz-latn.json', 'uz-cyrl.json'];

function extractCodesFromCatalog() {
  const content = fs.readFileSync(CATALOG_PATH, 'utf-8');
  const codes = new Set();
  // Match backtick-wrapped UPPER_SNAKE_CASE tokens (error codes only)
  const re = /`([A-Z][A-Z0-9_]{2,})`/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    codes.add(match[1]);
  }
  return codes;
}

function loadLanguageFile(filename) {
  const filepath = path.join(I18N_DIR, filename);
  const raw = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(raw);
  const keys = new Set(Object.keys(data).filter((k) => k !== '_metadata'));
  return keys;
}

const catalogCodes = extractCodesFromCatalog();
console.log(`Catalog codes found: ${catalogCodes.size}`);

let anyMismatch = false;

for (const filename of LANG_FILES) {
  const langKeys = loadLanguageFile(filename);
  const missing = [...catalogCodes].filter((c) => !langKeys.has(c));
  const extra = [...langKeys].filter((c) => !catalogCodes.has(c));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${filename}: ${langKeys.size} keys — all match catalog`);
  } else {
    anyMismatch = true;
    if (missing.length > 0) {
      console.error(`❌ ${filename}: MISSING ${missing.length} key(s):`);
      missing.forEach((c) => console.error(`   - ${c}`));
    }
    if (extra.length > 0) {
      console.error(`❌ ${filename}: EXTRA ${extra.length} key(s) not in catalog:`);
      extra.forEach((c) => console.error(`   + ${c}`));
    }
  }
}

if (anyMismatch) {
  console.error('\nVerification FAILED — fix mismatches before committing.');
  process.exit(1);
} else {
  console.log('\nVerification PASSED — all language files match the catalog.');
  process.exit(0);
}
