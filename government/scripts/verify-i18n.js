#!/usr/bin/env node
/* eslint-env node */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/locales');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_metadata') continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function hasKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return false;
    cur = cur[part];
  }
  return true;
}

const uz = JSON.parse(readFileSync(join(localesDir, 'uz/common.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(localesDir, 'en/common.json'), 'utf8'));
const ru = JSON.parse(readFileSync(join(localesDir, 'ru/common.json'), 'utf8'));

const uzKeys = flattenKeys(uz);
const missing = [];

for (const key of uzKeys) {
  if (!hasKey(en, key)) missing.push(`en/common.json: missing key "${key}"`);
  if (!hasKey(ru, key)) missing.push(`ru/common.json: missing key "${key}"`);
}

if (missing.length > 0) {
  console.error(`\n[verify-i18n] ${missing.length} missing key(s):\n`);
  for (const m of missing) console.error(`  ✗ ${m}`);
  console.error('');
  process.exit(1);
} else {
  console.log(`[verify-i18n] All ${uzKeys.length} keys present in en and ru. ✓`);
}
