/**
 * Static control enumerator (L1 evidence source for the coverage tables).
 *
 * Walks a portal's page/component tree and lists every interactive element with
 * file:line and its nearest label/placeholder/text, so the runtime pass can
 * disposition each one instead of claiming "the page loaded".
 *
 * Usage: node enumerate-controls.mjs <srcDir> [outJson]
 */
import fs from 'fs';
import path from 'path';

const [, , SRC, OUT] = process.argv;
if (!SRC) { console.error('usage: enumerate-controls.mjs <srcDir> [out.json]'); process.exit(2); }

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|__tests__|locales/.test(p)) walk(p); }
    else if (/\.jsx?$/.test(e.name)) files.push(p);
  }
})(SRC);

const KINDS = [
  ['button', /<button\b/i],
  ['link', /<Link\b|<a\s[^>]*href=/i],
  ['input', /<input\b/i],
  ['select', /<select\b/i],
  ['textarea', /<textarea\b/i],
  ['form', /<form\b/i],
  ['onClick-div', /<(div|span|li|tr|td)\b[^>]*onClick=/i],
];

const rows = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const [kind, re] of KINDS) {
      if (!re.test(line)) continue;
      // nearest human label: t('...'), placeholder, aria-label, or literal text on the next 3 lines
      const ctx = lines.slice(i, i + 4).join(' ');
      const label =
        (ctx.match(/aria-label=\{?t\(['"]([^'"]+)/) || [])[1] ||
        (ctx.match(/aria-label="([^"]+)"/) || [])[1] ||
        (ctx.match(/placeholder=\{?t\(['"]([^'"]+)/) || [])[1] ||
        (ctx.match(/placeholder="([^"]+)"/) || [])[1] ||
        (ctx.match(/\{t\(['"]([^'"]+)['"]/) || [])[1] ||
        (ctx.match(/>\s*([A-Za-zÀ-ÿ‘’'".,\- ]{3,40}?)\s*</) || [])[1] ||
        (ctx.match(/type="(\w+)"/) || [])[1] || '';
      rows.push({
        file: path.relative(process.cwd(), f).replace(/\\/g, '/'),
        line: i + 1, kind, label: label.trim().slice(0, 48),
      });
      break;
    }
  });
}

const byFile = {};
for (const r of rows) (byFile[r.file] = byFile[r.file] || []).push(r);

console.log(`files scanned: ${files.length}`);
console.log(`controls found: ${rows.length}`);
for (const [f, rs] of Object.entries(byFile).sort()) {
  console.log(`\n## ${f}  (${rs.length})`);
  for (const r of rs) console.log(`  ${String(r.line).padStart(4)}  ${r.kind.padEnd(11)} ${r.label}`);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
