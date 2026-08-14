// P4 — R2 week simulation, part 1: attendance for 7 real distinct dates
// (2026-08-08 … 2026-08-14) taken by teacher7 at smm2, with absences on D3/D5/D6.
// Back-dating is supported by the product (Attendance.jsx date input, max=today).
import { newBrowser, ctx, login, shot, save, ev, text, PORTALS, PW } from './lib.mjs';

// cycle order in AttendanceGrid.jsx: unset→present→home_leave→sick→hospitalized→absent
const CLICKS_FROM_PRESENT = { home_leave: 1, sick: 2, hospitalized: 3, absent: 4 };

const DAYS = [
  { d: '2026-08-08', label: 'D1', except: null },
  { d: '2026-08-09', label: 'D2', except: null },
  { d: '2026-08-10', label: 'D3', except: { child: 'Sanjar Yusupov', state: 'sick' } },
  { d: '2026-08-11', label: 'D4', except: null },
  { d: '2026-08-12', label: 'D5', except: { child: 'Nozima Qodirova', state: 'absent' } },
  { d: '2026-08-13', label: 'D6', except: { child: 'Malika Ahmedova', state: 'home_leave' } },
  { d: '2026-08-14', label: 'D7', except: null },
];

const b = await newBrowser(true);
const { c, p } = await ctx(b, 'teacher-smm2');
const log = [];
const li = await login(p, 'teacher', 'teacher7@uchqun.uz', PW, 'teacher-smm2');
if (!li.ok) { console.log('LOGIN FAILED'); process.exit(1); }

for (const day of DAYS) {
  const row = { ...day };
  try {
    await p.goto(`${PORTALS.teacher}/teacher/attendance`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    await p.locator('input[type="date"]').first().fill(day.d);
    await p.waitForTimeout(2500);
    row.dateSet = await p.locator('input[type="date"]').first().inputValue();
    await p.locator('button', { hasText: 'Hammasi keldi' }).first().click();
    await p.waitForTimeout(900);
    if (day.except) {
      const card = p.locator(`button[aria-label^="${day.except.child}:"]`);
      const n = CLICKS_FROM_PRESENT[day.except.state];
      for (let i = 0; i < n; i++) { await card.first().click(); await p.waitForTimeout(350); }
      row.exceptLabel = await card.first().getAttribute('aria-label');
    }
    row.shotBefore = await shot(p, 'teacher-smm2', `attendance-${day.label}-${day.d}-marked`);
    const saveBtn = p.locator('button', { hasText: /belgilangan ·/ }).first();
    row.saveBtnText = (await saveBtn.innerText()).replace(/\n/g, ' ');
    await saveBtn.click();
    await p.waitForTimeout(1200);
    row.shotAfter = await shot(p, 'teacher-smm2', `attendance-${day.label}-${day.d}-saved`);
    await p.waitForTimeout(2500);
    row.urlAfter = p.url();
  } catch (e) { row.error = e.message; }
  log.push(row);
  ev({ kind: 'week-attendance', ...row });
  console.log(JSON.stringify(row));
}

// re-open the week view as the witness that all 7 days landed
try {
  await p.goto(`${PORTALS.teacher}/teacher/attendance`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  await p.locator('button', { hasText: 'Hafta' }).first().click();
  await p.waitForTimeout(4000);
  const f = await shot(p, 'teacher-smm2', 'attendance-week-view-witness', true);
  log.push({ weekView: f, body: (await text(p)).slice(0, 900) });
  console.log('week view', f);
} catch (e) { log.push({ weekViewError: e.message }); }

save('p4-week.json', log);
await c.close(); await b.close();
console.log('P4 DONE');
