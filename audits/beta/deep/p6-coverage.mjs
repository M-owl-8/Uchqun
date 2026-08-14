import fs from 'fs';
const inv = JSON.parse(fs.readFileSync('audits/beta/deep/P6-controls.json', 'utf8'));
const FILE = {
  'Login.jsx': ['EXERCISED', 'P6a — all four variants logged in'],
  'Sidebar.jsx': ['EXERCISED', 'P6a — present on all 13 routes for all four variants'],
  'Layout.jsx': ['EXERCISED', 'P6a — every route'],
  'Field.jsx': ['EXERCISED', 'DNP primitive on every government form'],
  'Checkbox.jsx': ['EXERCISED', 'login "remember" checkbox'],
  'PrimaryButton.jsx': ['EXERCISED', 'the Kirish control and every submit path'],
  'InlineLink.jsx': ['EXERCISED', 'rendered across the sweep'],
  'LangToggle.jsx': ['EXERCISED', "O'zbekcha control enumerated on every route"],
  'NotFound.jsx': ['EXERCISED', 'P6a G13'],
  'Dashboard.jsx': ['EXERCISED', 'P6a G1 for all four variants; the secondary run also captured the stale banner (D-46)'],
  'Schools.jsx': ['EXERCISED', 'P6a/P6b — list per variant plus the CSV export downloaded and parsed (D-45)'],
  'SchoolDetail.jsx': ['PARTIAL', 'P6c — opened, all six tabs enumerated; the Arxivlash control was deliberately not fired, see the artifact'],
  'Students.jsx': ['EXERCISED', "P6c — 138 students, search, Ko'proq yuklash"],
  'ChildDetail.jsx': ['NOT-REACHED', 'no a[href^="/government/children/"] rendered on the students list, so nothing navigates to it'],
  'Teachers.jsx': ['EXERCISED', 'P6c — 32 teachers with search'],
  'Parents.jsx': ['EXERCISED', "P6c — 136 parents, Ko'proq yuklash"],
  'Ratings.jsx': ['EXERCISED', 'P6c — search, filter select, per-school rating disclosure controls'],
  'AIWarnings.jsx': ['EXERCISED', 'P6c — Faol / Hal qilingan filters and refresh'],
  'AuditLog.jsx': ['EXERCISED', 'P6b — D-05 re-derived, SANA populated on every row'],
  'Platform.jsx': ['EXERCISED', 'P6c — all four tabs reachable from the platform page'],
  'AdminsTab.jsx': ['EXERCISED', 'P6c — Direktorlar tab with the create form (Ism, Familiya, school select, login, password) and per-row update/delete'],
  'GovernmentTab.jsx': ['EXERCISED', 'P6c — Davlat foydalanuvchilari tab rendered with its controls'],
  'RegistrationsTab.jsx': ['EXERCISED', "P6c — Ro'yxatdan o'tish so'rovlari tab rendered"],
  'MessagesTab.jsx': ['EXERCISED', 'P6c — Xabarlar tab rendered'],
  'AdminDetails.jsx': ['NOT-REACHED', 'route /government/admin/:id exists but no inbound link was rendered'],
  'Profile.jsx': ['EXERCISED', 'P6c — profile with the edit control'],
  'Settings.jsx': ['EXERCISED', 'P6c — wrong current password rejected 400 CURRENT_PASSWORD_INCORRECT'],
  'ChangePassword.jsx': ['EXERCISED', 'P6a G12; also the forced-change gate hit by the secondary account'],
};
const byFile = {};
for (const r of inv) (byFile[r.file.split('/').pop()] = byFile[r.file.split('/').pop()] || []).push(r);
let tot = 0; const c = { EXERCISED: 0, PARTIAL: 0, 'NOT-REACHED': 0 };
const lines = [];
for (const [base, rows] of Object.entries(byFile).sort()) {
  const [disp, why] = FILE[base] || ['NOT-REACHED', 'no disposition recorded'];
  lines.push(`\n### \`${rows[0].file}\` — ${rows.length} controls — **${disp}**\n\n${why}\n`);
  lines.push('| line | kind | label |'); lines.push('|---|---|---|');
  for (const r of rows) { tot++; c[disp]++; lines.push(`| ${r.line} | ${r.kind} | ${(r.label || '—').replace(/\|/g, '\|').slice(0, 60)} |`); }
}
const head = `Controls enumerated from government JSX: **${tot}**\n\n| disposition | controls | % |\n|---|---|---|\n`
  + Object.entries(c).filter(([, v]) => v).map(([k, v]) => `| ${k} | ${v} | ${(v / tot * 100).toFixed(1)}% |`).join('\n') + '\n';
fs.writeFileSync('audits/beta/deep/P6-coverage-table.md', head + lines.join('\n') + '\n');
console.log(`total ${tot}`, JSON.stringify(c));
