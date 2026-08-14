// P2.1 — every logAudit call site, what it passes as entityId, and whether that
// can survive the uuid column. D-27's fix passed "childId:date", Postgres rejected
// it, logAudit swallowed the error, and the row silently never existed.
import { spawnSync } from 'child_process';
import fs from 'fs';
const g = (a) => (spawnSync('git', a, { encoding: 'utf8', shell: false }).stdout || '').trim();
const files = g(['grep', '-l', 'logAudit', '--', 'backend/']).split('\n').filter(f => f && !/__tests__|auditLogger\.js/.test(f));

const UUIDISH = /^(req\.(user|params|body|query)\.[A-Za-z0-9_.]*[Ii]d|[A-Za-z_][A-Za-z0-9_]*\.id|[A-Za-z_][A-Za-z0-9_]*Id|id)$/;
const sites = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((l, i) => {
    if (!/logAudit\s*\(/.test(l)) return;
    const block = lines.slice(i, i + 16).join('\n');
    const pick = (k) => { const m = block.match(new RegExp(`${k}:\s*([^,\n]+)`)); return m ? m[1].trim().replace(/[,}]$/, '') : null; };
    const entityId = pick('entityId');
    let risk = 'ok';
    if (entityId === null) risk = 'entityId omitted (defaults null — allowed)';
    else if (/`/.test(entityId)) risk = 'TEMPLATE LITERAL — cannot be a uuid unless it is exactly one interpolation';
    else if (!UUIDISH.test(entityId)) risk = 'not obviously a uuid expression — verify';
    sites.push({ file: f, line: i + 1, action: pick('action'), entity: pick('entity'), entityId, risk });
  });
}
fs.writeFileSync('audits/beta/deep2/auditsites.json', JSON.stringify(sites, null, 1));
console.log(`logAudit call sites: ${sites.length}  across ${files.length} files\n`);
for (const s of sites) {
  const flag = s.risk === 'ok' ? '   ' : ' !!';
  console.log(`${flag} ${s.file}:${s.line}`);
  console.log(`      action=${s.action}  entity=${s.entity}  entityId=${s.entityId}`);
  if (s.risk !== 'ok') console.log(`      RISK: ${s.risk}`);
}
const bad = sites.filter(s => s.risk !== 'ok' && !/omitted/.test(s.risk));
console.log(`\nsites needing verification: ${bad.length}`);
