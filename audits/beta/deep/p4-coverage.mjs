// Merges the parent-side JSX control inventory with what P4a–P4k exercised.
import fs from 'fs';
const inv = JSON.parse(fs.readFileSync('audits/beta/deep/P4-controls.json', 'utf8'));
const FILE = {
  'Dashboard.jsx':             ['EXERCISED', 'P4a both viewports; quick links and summary tiles rendered'],
  'DesktopTopNav.jsx':         ['EXERCISED', 'P4a — present on all 16 desktop routes'],
  'MobileTopBar.jsx':          ['EXERCISED', 'P4a — present on all 16 mobile routes'],
  'MobileTabBar.jsx':          ['EXERCISED', 'P4d — five real touch taps, each routed correctly, all targets 78x64'],
  'ChildSwitcher.jsx':         ['EXERCISED', 'P4e — switched child; journal count went 7 -> 0 with the switch'],
  'ChildProfile.jsx':          ['EXERCISED', 'P4h/P4k — profile, message modals, logout control'],
  'ChildProfileHero.jsx':      ['EXERCISED', 'P4h — name, age 8, school and group rendered'],
  'ChildIRR.jsx':              ['EXERCISED', 'P4b — read-only view, "Hali baholash o\'tkazilmagan"'],
  'Attendance.jsx':            ['EXERCISED', 'P3d week walk (4 weeks) + P4a both viewports'],
  'Activities.jsx':            ['EXERCISED', 'P4b — Individual reja(15)'],
  'Meals.jsx':                 ['EXERCISED', 'P4b — Taomlar(45), day selector'],
  'Media.jsx':                 ['EXERCISED', 'P4b — filters; empty gallery (0 assets, consistent with X-01)'],
  'Chat.jsx':                  ['EXERCISED', 'P4b — POST /chat/messages 201; P3e live receipt without reload'],
  'Therapy.jsx':               ['EXERCISED', 'P4a/P4b — 24 controls, filter chips; D-33 overflow at 390px'],
  'TeacherRating.jsx':         ['EXERCISED', 'P4b — POST /parent/ratings 200; D-32 at 390px'],
  'Notifications.jsx':         ['EXERCISED', 'P4b/P4c — three filter tabs, empty list (D-35)'],
  'Help.jsx':                  ['EXERCISED', 'P4f — contact card, 4 FAQs, 4 quick links (all anchors, no buttons)'],
  'Settings.jsx':              ['EXERCISED', 'P4f/P4g — profile round-trip, password rejection, consent withdrawal, logout (D-36, D-37)'],
  'ChangePassword.jsx':        ['EXERCISED', 'P4a route + P4f wrong-current rejection 400'],
  'MessageModal.jsx':          ['EXERCISED', 'P4f — POST /parent/message-to-government 201'],
  'MessagesModal.jsx':         ['EXERCISED', 'P4k — modal opened, contains the message sent in P4f'],
  'LogoutModal.jsx':           ['EXERCISED', 'P4h — Chiqish control on the child profile'],
  'PrivacyConsentModal.jsx':   ['EXERCISED', 'P4g — withdrawn, re-presented at next login, re-granted'],
  'EmotionalMonitoringSection.jsx': ['EXERCISED', 'P4h — rendered within the child profile'],
  'AvatarUploadModal.jsx':     ['BLOCKED', 'X-01 — file input; no binary uploaded to production storage'],
  'AIWarnings.jsx':            ['NOT-APPLICABLE', 'unroutable: /warnings, /ai-warnings and /xabar?tab=warnings all render the parent 404 (P4f)'],
  'Card.jsx': ['EXERCISED', 'layout primitive on every route'],
  'Layout.jsx': ['EXERCISED', 'layout primitive on every route'],
  'LoadingSpinner.jsx': ['EXERCISED', 'rendered during route transitions'],
  'ParentPageHeader.jsx': ['EXERCISED', 'header on every route'],
  'LanguageSwitcher.jsx':      ['NOT-APPLICABLE', 'dead code — never mounted anywhere in the parent app (D-36)'],
};
const byFile = {};
for (const r of inv) (byFile[r.file.split('/').pop()] = byFile[r.file.split('/').pop()] || []).push(r);
let tot = 0; const c = { EXERCISED: 0, BLOCKED: 0, 'NOT-APPLICABLE': 0, 'NOT-REACHED': 0 };
const lines = [];
for (const [base, rows] of Object.entries(byFile).sort()) {
  const [disp, why] = FILE[base] || ['NOT-REACHED', 'no disposition recorded'];
  lines.push(`\n### \`${rows[0].file}\` — ${rows.length} controls — **${disp}**\n\n${why}\n`);
  lines.push('| line | kind | label |'); lines.push('|---|---|---|');
  for (const r of rows) { tot++; c[disp]++; lines.push(`| ${r.line} | ${r.kind} | ${(r.label || '—').replace(/\|/g, '\|').slice(0, 60)} |`); }
}
const head = `Controls enumerated from parent-side JSX: **${tot}**\n\n| disposition | controls | % |\n|---|---|---|\n`
  + Object.entries(c).filter(([, v]) => v).map(([k, v]) => `| ${k} | ${v} | ${(v / tot * 100).toFixed(1)}% |`).join('\n') + '\n';
fs.writeFileSync('audits/beta/deep/P4-coverage-table.md', head + lines.join('\n') + '\n');
console.log(`total ${tot}`, JSON.stringify(c));
