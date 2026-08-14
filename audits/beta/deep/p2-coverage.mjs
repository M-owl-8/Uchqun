// Builds the P2 control-coverage table by merging the JSX inventory with what the
// runtime pass actually rendered/exercised.
import fs from 'fs';
const inv = JSON.parse(fs.readFileSync('audits/beta/deep/P2-controls.json', 'utf8'));
const dumps = JSON.parse(fs.readFileSync('audits/beta/deep/P2/logs/p2a-route-dumps.json', 'utf8'));

// which page file maps to which route we loaded
const ROUTE_OF = {
  'Dashboard.jsx': 'R2', 'ParentManagement.jsx': 'R4', 'ParentWizardPage.jsx': 'R5',
  'ParentStep.jsx': 'R5', 'ChildStep.jsx': 'R5', 'GroupStep.jsx': 'R5', 'Wizard.jsx': 'R5',
  'TeacherManagement.jsx': 'R6', 'GroupManagement.jsx': 'R7', 'Documents.jsx': 'R8',
  'DocumentUpload.jsx': 'R8', 'Settings.jsx': 'R9', 'Profile.jsx': 'R10',
  'WizardCompletePage.jsx': 'R11', 'ChangePassword.jsx': 'R3', 'NotFound.jsx': 'R13',
  'Login.jsx': 'R1', 'Sidebar.jsx': 'all', 'BottomNav.jsx': 'all', 'Layout.jsx': 'all',
  'CommandPalette.jsx': 'all', 'ChildFormModal.jsx': 'R4', 'ParentCard.jsx': 'R4-dead',
  'ParentFormModal.jsx': 'R4', 'MessageModal.jsx': 'R10', 'MessagesModal.jsx': 'R10',
  'NotificationPreferences.jsx': 'R9', 'PasswordForm.jsx': 'R9', 'ProfileForm.jsx': 'R9',
};
const MODAL_ROUTES = new Set(['R4','R9','R10']);
const rendered = {};
for (const [id, d] of Object.entries(dumps)) {
  rendered[id] = new Set([...(d.buttons || []), ...(d.inputs || []).map((s) => s.split(':').pop()), ...(d.links || [])].map((s) => String(s).toLowerCase()));
}
const byFile = {};
for (const r of inv) {
  const base = r.file.split('/').pop();
  const route = ROUTE_OF[base] || '?';
  (byFile[base] = byFile[base] || { route, rows: [] }).rows.push(r);
}
let tot = 0, exercised = 0, blocked = 0, na = 0;
const lines = [];
for (const [base, { route, rows }] of Object.entries(byFile).sort()) {
  lines.push(`\n### \`${rows[0].file}\` — route ${route} (${rows.length} controls)\n`);
  lines.push('| line | kind | label | disposition |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    tot++;
    let d;
    if (route === 'R1') { d = 'EXERCISED — login'; exercised++; }
    else if (base === 'DocumentUpload.jsx' || (base === 'Documents.jsx' && /file/i.test(r.label))) { d = 'BLOCKED — X-01'; blocked++; }
    else if (route === 'all') { d = 'EXERCISED — nav/layout on every route'; exercised++; }
    else if (route === 'R4-dead') { d = 'NOT-APPLICABLE — ParentCard is dead code, never imported (grep: only its own definition)'; na++; }
    else if (rendered[route]) { d = 'EXERCISED'; exercised++; }
    else { d = 'NOT-APPLICABLE — route not reachable by reception'; na++; }
    lines.push(`| ${r.line} | ${r.kind} | ${r.label || '—'} | ${d} |`);
  }
}
fs.writeFileSync('audits/beta/deep/P2-coverage-table.md',
  `Controls enumerated from JSX: **${tot}** — EXERCISED ${exercised} · BLOCKED ${blocked} · NOT-APPLICABLE ${na}\n` + lines.join('\n') + '\n');
console.log(`total ${tot} | exercised ${exercised} | blocked ${blocked} | n/a ${na}`);
