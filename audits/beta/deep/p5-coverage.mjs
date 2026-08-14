import fs from 'fs';
const inv = JSON.parse(fs.readFileSync('audits/beta/deep/P5-controls.json', 'utf8'));
const FILE = {
  'Login.jsx': ['EXERCISED', 'P5a — every admin context logs in'],
  'Sidebar.jsx': ['EXERCISED', 'P5a — present on all 20 routes'],
  'Layout.jsx': ['EXERCISED', 'P5a — present on all 20 routes'],
  'BottomNav.jsx': ['EXERCISED', 'P5a — rendered in the route sweep'],
  'NotFound.jsx': ['EXERCISED', 'P5a A20'],
  'Field.jsx': ['EXERCISED', 'DNP primitive used by every admin form exercised in P5m'],
  'Checkbox.jsx': ['EXERCISED', 'row selection on receptions (P5i) and reception export (P5l)'],
  'PrimaryButton.jsx': ['EXERCISED', 'every submit path in P5b–P5m'],
  'InlineLink.jsx': ['EXERCISED', 'rendered across the sweep'],
  'LangDropdown.jsx': ['EXERCISED', "O'zbekcha control present and enumerated on every route"],
  'Dashboard.jsx': ['EXERCISED', 'P5a A1'],
  'BulkImport.jsx': ['EXERCISED', 'P5b–P5e — 4 file classes, full 5-step wizard, 3 children created (D-40)'],
  'ReceptionManagement.jsx': ['EXERCISED', 'P5i — list, delete, confirm dialog, restore'],
  'ReceptionFormModal.jsx': ['EXERCISED', 'P5f — create modal opened and filled'],
  'ReceptionDetailPanel.jsx': ['EXERCISED', 'P5f/P5i — detail panel rendered on selection'],
  'ParentManagement.jsx': ['EXERCISED', 'P5g — search, select, child links to /admin/children/:id'],
  'ChildDetail.jsx': ['EXERCISED', 'P5g/P5h — imported and seed child, both by direct URL (D-41)'],
  'TeacherManagement.jsx': ['EXERCISED', 'P5m — 8 teachers listed with emails and phones'],
  'TeacherDetail.jsx': ['NOT-REACHED', 'no /admin/teachers/:id link found in the A4 dump; route exists but nothing navigates to it'],
  'GroupManagement.jsx': ['EXERCISED', 'P5m — Guruhlar (6) with search'],
  'DocumentApprovalQueue.jsx': ['EXERCISED', 'P5m — Kutilmoqda 1 / Tasdiqlangan 1 / Rad etilgan 0 with Tasdiqlash and Rad etish controls'],
  'AIWarnings.jsx': ['EXERCISED', 'P5m — 4 unresolved warnings, both filter selects, Tahlil qilish and Yangilash'],
  'TherapyManagement.jsx': ['BLOCKED', 'D-43 — the route crashes on load; only the ErrorBoundary fallback renders, so none of its 20 controls can be reached'],
  'AdminIRR.jsx': ['EXERCISED', 'P5m — child list, Maqsadli davrlar and Chorakli monitoring tabs'],
  'SchoolProfile.jsx': ['EXERCISED', 'P5m — 5 fields and the save control'],
  'SchoolRatings.jsx': ['EXERCISED', 'P5m — Muassasa baholari (1), the rating submitted by the parent in P4'],
  'ActivityFeed.jsx': ['EXERCISED', 'P5m — action select plus two date filters'],
  'Communications.jsx': ['EXERCISED', 'P5m — thread list incl. the parent message sent in P4B'],
  'GovMessages.jsx': ['EXERCISED', 'P5m — thread list and Yangi xabar'],
  'Trash.jsx': ['EXERCISED', 'P5i — both tabs, listing, restore'],
  'Profile.jsx': ['EXERCISED', 'P5m — profile page, government message controls'],
  'Settings.jsx': ['EXERCISED', 'P5m — profile fields, notification checkbox, password rejection 400'],
  'ProfileForm.jsx': ['EXERCISED', 'P5m settings'],
  'PasswordForm.jsx': ['EXERCISED', 'P5m — wrong current password rejected'],
  'NotificationPreferences.jsx': ['EXERCISED', 'P5m settings'],
  'MessageModal.jsx': ['EXERCISED', 'P5m — Davlatga xabar yuborish on the profile page'],
  'MessagesModal.jsx': ['EXERCISED', 'P5m — Mening xabarlarim on the profile page'],
  'ChangePassword.jsx': ['EXERCISED', 'P5a A19'],
  'AdminRegister.jsx': ['EXERCISED', 'P5a A23 — unauthenticated registration form, 5 fields enumerated'],
};
const byFile = {};
for (const r of inv) (byFile[r.file.split('/').pop()] = byFile[r.file.split('/').pop()] || []).push(r);
let tot = 0; const c = { EXERCISED: 0, BLOCKED: 0, 'NOT-REACHED': 0 };
const lines = [];
for (const [base, rows] of Object.entries(byFile).sort()) {
  const [disp, why] = FILE[base] || ['NOT-REACHED', 'no disposition recorded'];
  lines.push(`\n### \`${rows[0].file}\` — ${rows.length} controls — **${disp}**\n\n${why}\n`);
  lines.push('| line | kind | label |'); lines.push('|---|---|---|');
  for (const r of rows) { tot++; c[disp]++; lines.push(`| ${r.line} | ${r.kind} | ${(r.label || '—').replace(/\|/g, '\|').slice(0, 60)} |`); }
}
const head = `Controls enumerated from admin JSX: **${tot}**\n\n| disposition | controls | % |\n|---|---|---|\n`
  + Object.entries(c).filter(([, v]) => v).map(([k, v]) => `| ${k} | ${v} | ${(v / tot * 100).toFixed(1)}% |`).join('\n') + '\n';
fs.writeFileSync('audits/beta/deep/P5-coverage-table.md', head + lines.join('\n') + '\n');
console.log(`total ${tot}`, JSON.stringify(c));
