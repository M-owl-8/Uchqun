// P7a — no browser needed: frontend locale key-parity matrix, console
// aggregation across P1-P6, and the scope of the existing i18n verifier.
import fs from 'fs';
const P = 'audits/beta/deep/P7'; fs.mkdirSync(`${P}/logs`, { recursive: true });
const out = {};

// ── locale key parity, per portal ─────────────────────────────────────────
const flat = (o, pre = '', acc = new Set()) => { for (const [k, v] of Object.entries(o || {})) { const key = pre ? `${pre}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, acc); else acc.add(key); } return acc; };
const matrix = {};
for (const portal of ['teacher', 'admin', 'reception', 'government']) {
  const sets = {};
  for (const loc of ['uz', 'ru', 'en']) {
    const f = `${portal}/src/locales/${loc}/common.json`;
    sets[loc] = fs.existsSync(f) ? flat(JSON.parse(fs.readFileSync(f, 'utf8'))) : null;
  }
  const uz = sets.uz;
  matrix[portal] = {
    counts: Object.fromEntries(Object.entries(sets).map(([l, s]) => [l, s ? s.size : null])),
    missingVsUz: Object.fromEntries(Object.entries(sets).filter(([l]) => l !== 'uz').map(([l, s]) => [l, s && uz ? [...uz].filter((k) => !s.has(k)).length : null])),
    extraVsUz: Object.fromEntries(Object.entries(sets).filter(([l]) => l !== 'uz').map(([l, s]) => [l, s && uz ? [...s].filter((k) => !uz.has(k)).length : null])),
    sampleMissingRu: uz && sets.ru ? [...uz].filter((k) => !sets.ru.has(k)).slice(0, 6) : [],
    sampleMissingEn: uz && sets.en ? [...uz].filter((k) => !sets.en.has(k)).slice(0, 6) : [],
  };
}
out.localeMatrix = matrix;
console.log('=== LOCALE KEY PARITY ===');
for (const [p, m] of Object.entries(matrix)) console.log(p.padEnd(12), JSON.stringify(m.counts), 'missing vs uz:', JSON.stringify(m.missingVsUz), 'extra:', JSON.stringify(m.extraVsUz));

// ── keys referenced in code but absent from uz ────────────────────────────
const walk = (d, acc = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = `${d}/${e.name}`; if (e.isDirectory()) { if (!/node_modules|__tests__|locales/.test(f)) walk(f, acc); } else if (/\.jsx?$/.test(e.name)) acc.push(f); } return acc; };
const missingKeys = {};
for (const portal of ['teacher', 'admin', 'reception', 'government']) {
  const uz = flat(JSON.parse(fs.readFileSync(`${portal}/src/locales/uz/common.json`, 'utf8')));
  const miss = new Set();
  for (const f of walk(`${portal}/src`)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) if (!uz.has(m[1])) miss.add(`${m[1]}  (${f.replace(portal + '/src/', '')})`);
  }
  missingKeys[portal] = [...miss];
}
out.keysUsedButMissing = missingKeys;
console.log('\n=== KEYS CALLED IN CODE BUT ABSENT FROM uz/common.json ===');
for (const [p, ks] of Object.entries(missingKeys)) { console.log(`${p}: ${ks.length}`); ks.slice(0, 10).forEach((k) => console.log('   ', k)); }

// ── console aggregation across every phase ────────────────────────────────
const agg = {};
for (const ph of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']) {
  const f = `audits/beta/deep/${ph}/logs/console.jsonl`;
  if (!fs.existsSync(f)) { agg[ph] = { file: 'absent' }; continue; }
  const rows = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const byType = {}; const msgs = {};
  for (const r of rows) {
    byType[r.type || r.kind || '?'] = (byType[r.type || r.kind || '?'] || 0) + 1;
    if ((r.type || '') === 'error' || /error/i.test(r.kind || '')) {
      const key = String(r.text || r.message || '').split('\n')[0].slice(0, 110);
      msgs[key] = (msgs[key] || 0) + 1;
    }
  }
  agg[ph] = { total: rows.length, byType, distinctErrors: Object.keys(msgs).length, topErrors: Object.entries(msgs).sort((a, b) => b[1] - a[1]).slice(0, 6) };
}
out.consoleAggregate = agg;
console.log('\n=== CONSOLE AGGREGATE ===');
for (const [ph, a] of Object.entries(agg)) console.log(ph, JSON.stringify(a).slice(0, 400));

fs.writeFileSync(`${P}/logs/p7a.json`, JSON.stringify(out, null, 1));

// ── of the missing keys, which render English and which render the raw key? ──
const classify = {};
for (const portal of ['teacher', 'admin', 'reception', 'government']) {
  const uz = flat(JSON.parse(fs.readFileSync(`${portal}/src/locales/uz/common.json`, 'utf8')));
  let withDefault = 0, rawKey = 0; const rawSamples = [];
  for (const f of walk(`${portal}/src`)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'\s*(,\s*\{[^)]*\})?\s*\)/g)) {
      if (uz.has(m[1])) continue;
      if (m[2] && /defaultValue/.test(m[2])) withDefault++;
      else { rawKey++; if (rawSamples.length < 8) rawSamples.push(`${m[1]}  (${f.replace(portal + '/src/', '')})`); }
    }
  }
  classify[portal] = { rendersEnglishDefault: withDefault, rendersRawKey: rawKey, rawSamples };
}
out.missingKeyImpact = classify;
console.log('\n=== IMPACT OF MISSING KEYS ===');
for (const [p, c] of Object.entries(classify)) {
  console.log(`${p}: renders English defaultValue = ${c.rendersEnglishDefault} | renders RAW KEY = ${c.rendersRawKey}`);
  c.rawSamples.forEach((s) => console.log('     raw:', s));
}
fs.writeFileSync(`${P}/logs/p7a.json`, JSON.stringify(out, null, 1));
