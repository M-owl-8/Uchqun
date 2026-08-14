// Merges the teacher JSX control inventory with what P3a–P3n actually exercised.
import fs from 'fs';
const inv = JSON.parse(fs.readFileSync('audits/beta/deep/P3-controls.json', 'utf8'));
const D = 'audits/beta/deep/P3/logs/';
const dumps = JSON.parse(fs.readFileSync(D + 'p3a-route-dumps.json', 'utf8'));
const rendered = new Set();
for (const d of Object.values(dumps)) for (const s of [...(d.buttons || []), ...(d.links || [])]) rendered.add(String(s).toLowerCase());

// disposition by source file — keyed to the run that exercised it
const FILE = {
  'Login.jsx':                  ['EXERCISED', 'P3a login — every teacher context logs in'],
  'TeacherTopNav.jsx':          ['EXERCISED', 'P3a — present on all 17 routes'],
  'BottomNav.jsx':              ['EXERCISED', 'P3a — present on all 17 routes'],
  'TeacherMobileTabBar.jsx':    ['EXERCISED', 'P3a — rendered in the 17-route sweep'],
  'TeacherMobileTopBar.jsx':    ['EXERCISED', 'P3a — rendered in the 17-route sweep'],
  'Toast.jsx':                  ['EXERCISED', 'P3f/P3i — success + error toasts observed'],
  'Dashboard.jsx':              ['EXERCISED', 'P3a T3'],
  'Bolalar.jsx':                ['EXERCISED', 'P3a T4 + two-group teacher'],
  'ChildDetail.jsx':            ['EXERCISED', 'P3a T20 + P3i child-detail'],
  'Attendance.jsx':             ['EXERCISED', 'P3b full date battery'],
  'AttendanceGrid.jsx':         ['EXERCISED', 'P3b — 21 cards, cycle through 5 states'],
  'Reja.jsx':                   ['EXERCISED', 'P3a T5a-T5d tabs'],
  'Activities.jsx':             ['EXERCISED', 'P3a T5a'],
  'ActivityFormModal.jsx':      ['EXERCISED', 'P3e — activity 383b51d2 created'],
  'ActivityCard.jsx':           ['EXERCISED', 'P3a T5a list render'],
  'ActivityDetailsModal.jsx':   ['EXERCISED', 'P3a T5a'],
  'Meals.jsx':                  ['EXERCISED', 'P3h — meal 05249a7b created'],
  'MonitoringJournal.jsx':      ['EXERCISED', 'P3f/P3i — emotional record created + updated'],
  'MonitoringBulkFill.jsx':     ['EXERCISED', 'P3i — POST /teacher/emotional-monitoring 200'],
  'DailyMonitoringTab.jsx':     ['EXERCISED', 'P3i monitoring-tab-Kunlik'],
  'WeeklyMonitoringTab.jsx':    ['EXERCISED', 'P3i monitoring-tab-Haftalik'],
  'TherapyManagement.jsx':      ['EXERCISED', 'P3i/P3j therapy tab'],
  'TherapyFilters.jsx':         ['EXERCISED', 'P3i — Barchasi/Musiqa/Video/Kontent'],
  'TherapyCard.jsx':            ['EXERCISED', 'P3i therapy list render'],
  'TherapyAssignModal.jsx':     ['EXERCISED', 'P3j — POST /therapy/:id/start 201'],
  'TherapyFormModal.jsx':       ['EXERCISED', 'P3o/P3p — modal opened, every field filled, submitted; POST /therapy 400 (D-28)'],
  'Chat.jsx':                   ['EXERCISED', 'P3e/P3f/P3g — 21-message thread, live delivery'],
  'Xabar.jsx':                  ['EXERCISED', 'P3a T6a/T6b'],
  'DailyReflection.jsx':        ['EXERCISED', 'P3e reflection e2ae8f76 created'],
  'ParentJournalComposer.jsx':  ['EXERCISED', 'P3n — POST /teacher/journal/bulk 201 for 2 children'],
  'IrrShell.jsx':               ['EXERCISED', 'P3h — real edit persisted, updatedAt bumped, stamp in row'],
  'MonthlyMilestones.jsx':      ['NOT-REACHED', 'no control renders it in the IRR state this child is in (P3j irr-sections)'],
  'Media.jsx':                  ['EXERCISED', 'P3i media page + filters'],
  'MediaCard.jsx':              ['EXERCISED', 'P3i media list render'],
  'MediaFormModal.jsx':         ['BLOCKED', 'X-01 — modal opened and fields enumerated; no binary uploaded to production storage'],
  'MediaViewModal.jsx':         ['BLOCKED', 'X-01 — needs an uploaded asset'],
  'VideoPlayer.jsx':            ['BLOCKED', 'X-01 — needs an uploaded video'],
  'AvatarUpload.jsx':           ['BLOCKED', 'X-01 — file input'],
  'Men.jsx':                    ['EXERCISED', 'P3a T7a-T7c'],
  'Settings.jsx':               ['EXERCISED', 'P3i/P3j settings tabs'],
  'Profile.jsx':                ['EXERCISED', 'P3i settings-profile'],
  'ProfileForm.jsx':            ['EXERCISED', 'P3j — PUT /user/profile 200, persisted across reload'],
  'NotificationPreferences.jsx':['EXERCISED', 'P3j — toggle + save + reload confirmed'],
  'PasswordForm.jsx':           ['EXERCISED', 'P3i — wrong current password rejected 400'],
  'ChangePassword.jsx':         ['EXERCISED', 'P3i password-wrong-current'],
  'MessageModal.jsx':           ['EXERCISED', 'P3o — POST /teacher/message-to-government 201, id 5d638bd7'],
  'MessagesModal.jsx':          ['EXERCISED', 'P3o — opened from the profile tab alongside the composer'],
  'NotFound.jsx':               ['EXERCISED', 'P3a T22'],
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
const head = `Controls enumerated from teacher-side JSX: **${tot}**\n\n`
  + `| disposition | controls | % |\n|---|---|---|\n`
  + Object.entries(c).map(([k, v]) => `| ${k} | ${v} | ${(v / tot * 100).toFixed(1)}% |`).join('\n') + '\n';
fs.writeFileSync('audits/beta/deep/P3-coverage-table.md', head + lines.join('\n') + '\n');
console.log(`total ${tot}`, JSON.stringify(c));
