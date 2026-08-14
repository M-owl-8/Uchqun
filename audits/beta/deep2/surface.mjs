// P3.2 — the attack surface enumerated FROM CODE, not from the old suite.
// Every route that accepts an entity id, by path param or by query param, with
// the middleware chain that guards it.
import fs from 'fs';
import { spawnSync } from 'child_process';

const g = (a) => (spawnSync('git', a, { encoding: 'utf8', shell: false }).stdout || '').trim();
const routeFiles = g(['ls-files', 'backend/routes/']).split('\n').filter((f) => f.endsWith('.js'));

const rows = [];
for (const f of routeFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]([^\n]*)/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    const [, method, path, rest] = m;
    const pathIds = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((x) => x[1]);
    rows.push({
      file: f, line, method: method.toUpperCase(), path, pathIds,
      middleware: rest.replace(/\).*$/, '').replace(/,\s*$/, '').trim().slice(0, 110),
    });
  }
}

// which handlers read an id-bearing query param — the D-47 evasion vector
const ctrlFiles = g(['ls-files', 'backend/controllers/']).split('\n').filter((f) => f.endsWith('.js'));
const queryIds = {};
for (const f of ctrlFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/const\s*\{([^}]*)\}\s*=\s*req\.query/g)) {
    for (const name of m[1].split(',').map((s) => s.trim().split(':')[0].trim())) {
      if (/Id$/.test(name)) (queryIds[f] = queryIds[f] || new Set()).add(name);
    }
  }
  for (const m of src.matchAll(/req\.query\.([A-Za-z0-9_]*Id)\b/g)) {
    (queryIds[f] = queryIds[f] || new Set()).add(m[1]);
  }
}

const withPathId = rows.filter((r) => r.pathIds.length);
const byMethod = {};
withPathId.forEach((r) => { byMethod[r.method] = (byMethod[r.method] || 0) + 1; });

console.log(`route files                : ${routeFiles.length}`);
console.log(`route declarations         : ${rows.length}`);
console.log(`routes taking a path id    : ${withPathId.length}`);
console.log(`path-id routes by method   : ${JSON.stringify(byMethod)}`);
console.log(`controllers reading an *Id query param : ${Object.keys(queryIds).length}`);
console.log('\n=== id-bearing query params by controller (the D-47 vector) ===');
for (const [f, s] of Object.entries(queryIds)) {
  console.log('  ', f.replace('backend/controllers/', '').padEnd(46), [...s].join(', '));
}
fs.writeFileSync('audits/beta/deep2/surface.json', JSON.stringify({
  rows, withPathId, queryIds: Object.fromEntries(Object.entries(queryIds).map(([k, v]) => [k, [...v]])),
}, null, 1));
