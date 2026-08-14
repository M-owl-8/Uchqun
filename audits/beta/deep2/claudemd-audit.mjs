// P1.5 — every CLAUDE.md rule: enforced by something, or prose?
// D-47 existed because CLAUDE.md printed the correct branch form and three
// controllers ignored it. A rule nothing checks is a wish.
import { spawnSync } from 'child_process';
import fs from 'fs';

const grep = (pat, path = '.') => {
  const r = spawnSync('git', ['grep', '-l', '-E', pat, '--', path], { encoding: 'utf8', shell: false });
  return (r.stdout || '').trim().split('\n').filter(Boolean);
};

// Each rule: id, the text, and a probe that returns the enforcing artefact(s).
const RULES = [
  ['R01', 'Work on main only — no feature branches', () => fs.existsSync('.claude/hooks/enforce-main-only.sh') ? ['.claude/hooks/enforce-main-only.sh (PreToolUse hook)'] : []],
  ['R02', 'Read DEFERRED.md at session start', () => []],
  ['R03', 'Never set FORCE_SYNC=true', () => grep('FORCE_SYNC', 'backend')],
  ['R04', 'Never commit .env files or seed data with real PII', () => (fs.existsSync('.gitignore') && /(^|\n)\.env/.test(fs.readFileSync('.gitignore', 'utf8'))) ? ['.gitignore', '.github/workflows/ci.yml (gitleaks)'] : []],
  ['R05', 'All routes prefixed /api/', () => []],
  ['R06', 'All frontend HTTP via shared/services/api.js', () => []],
  ['R07', 'ES Modules only in backend — no require()', () => grep('"type":\s*"module"', 'backend/package.json')],
  ['R08', 'Sequelize migrations only — never sync schema in production', () => []],
  ['R09', 'New controllers MUST ship with tests', () => []],
  ['R10', 'Error-path fixes MUST include a test that triggers the failure', () => []],
  ['R11', 'ALL catch branches must return error-appropriate status codes', () => []],
  ['R12', 'Response shape {success,data} / {success,error:{code,detail}}', () => []],
  ['R13', 'Any PR introducing a new error code MUST add a catalog row', () => fs.existsSync('backend/scripts/verify-i18n.js') ? ['backend/scripts/verify-i18n.js (CI job i18n)'] : []],
  ['R14', 'Defense-in-depth role checks at route AND controller', () => []],
  ['R15', 'Child-scoped resources MUST call validateChildAccess', () => []],
  ['R16', 'Never call AuditLog.create() directly from controllers', () => grep('audit_log is immutable', 'backend/models/AuditLog.js')],
  ['R17', 'audit_log is append-only (3 layers)', () => {
    const a = grep('audit_log is immutable', 'backend/models/AuditLog.js');
    const b = grep('REVOKE UPDATE, DELETE ON audit_log', 'backend/migrations');
    return [...a, ...b];
  }],
  ['R18', 'Destroy on paranoid models passes {actorId, actorRole, reason}', () => []],
  ['R19', 'Bulk import two-phase, per-row atomicity', () => grep('IMPORT_ROW_', 'backend/__tests__')],
  ['R20', 'PascalCase components, camelCase services/utils', () => []],
  ['R21', 'Conventional commits', () => []],
  ['R22', 'Pre-commit: Husky -> lint-staged -> ESLint', () => fs.existsSync('.husky/pre-commit') ? ['.husky/pre-commit'] : []],
  ['R23', 'Run full suite before any PR', () => fs.existsSync('.github/workflows/ci.yml') ? ['.github/workflows/ci.yml'] : []],
  ['R24', 'Frontend: CI fails if no test files in an app', () => grep('No test files found', '.github/workflows/ci.yml')],
  ['R25', 'i18n verify: all catalog codes in every language file', () => grep('verify-i18n', '.github/workflows/ci.yml')],
];

const out = [];
for (const [id, text, probe] of RULES) {
  let hits = [];
  try { hits = probe(); } catch { hits = []; }
  out.push({ id, text, enforced: hits.length > 0, by: hits });
}
fs.writeFileSync('audits/beta/deep2/claudemd-rules.json', JSON.stringify(out, null, 1));
const e = out.filter(r => r.enforced), p = out.filter(r => !r.enforced);
console.log(`RULES: ${out.length}   ENFORCED: ${e.length}   PROSE: ${p.length}\n`);
console.log('--- ENFORCED ---');
e.forEach(r => console.log(`  ${r.id}  ${r.text.slice(0, 52).padEnd(54)} <- ${r.by.slice(0, 2).join(', ')}`));
console.log('\n--- PROSE (nothing checks these) ---');
p.forEach(r => console.log(`  ${r.id}  ${r.text}`));
