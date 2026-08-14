// P3b — attendance date-keying battery. D-03 was a date bug; prove the CLASS is
// gone, not just the instance: month boundary, week boundary, earliest date,
// latest date, future date, re-mark, and a cross-role collision.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';

const P = phase('P3');
const B = PORTALS.teacher;
const TAG = 'teacher-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 340)); };

// Gulnoza Ergasheva, Umid guruhi, parent otaona11@tmm3.uz
const CHILD = 'Gulnoza Ergasheva';
const CHILD_ID = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';
const PARENT = 'otaona11@tmm3.uz';
// clicks from 'present': home_leave 1, sick 2, hospitalized 3, absent 4
const CLICKS = { home_leave: 1, sick: 2, hospitalized: 3, absent: 4 };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);

async function markDay(date, state, label) {
  await goto(P, p, `${B}/teacher/attendance`, TAG, `mark-${label}-open`, { wait: 4500 });
  await p.locator('input[type="date"]').first().fill(date);
  await p.waitForTimeout(2600);
  const shown = await p.locator('input[type="date"]').first().inputValue();
  await p.locator('button', { hasText: 'Hammasi keldi' }).first().click();
  await p.waitForTimeout(900);
  const card = p.locator(`button[aria-label^="${CHILD}:"]`).first();
  for (let i = 0; i < CLICKS[state]; i++) { await card.click(); await p.waitForTimeout(320); }
  const aria = await card.getAttribute('aria-label');
  const marked = await shot(P, p, TAG, `mark-${label}-${date}-${state}`, { full: true });
  await p.locator('button', { hasText: /belgilangan ·/ }).first().click();
  await p.waitForTimeout(1600);
  const after = await shot(P, p, TAG, `mark-${label}-${date}-saved`);
  await p.waitForTimeout(2500);
  return { date, dateInputShowed: shown, aria, marked, after };
}

// ── 1. MONTH BOUNDARY: last day of July and first weekday of August ────────
rec('1-month-boundary-jul31', await markDay('2026-07-31', 'sick', 'month-jul31'));
rec('1-month-boundary-aug03', await markDay('2026-08-03', 'absent', 'month-aug03'));

// ── 2. WEEK BOUNDARY: Sunday 2026-08-09 and Monday 2026-08-10 ──────────────
rec('2-week-boundary-sun09', await markDay('2026-08-09', 'home_leave', 'week-sun09'));
rec('2-week-boundary-mon10', await markDay('2026-08-10', 'hospitalized', 'week-mon10'));

// ── 3. EARLIEST permitted date ─────────────────────────────────────────────
{
  await goto(P, p, `${B}/teacher/attendance`, TAG, 'earliest-open');
  const inp = p.locator('input[type="date"]').first();
  const min = await inp.getAttribute('min');
  const max = await inp.getAttribute('max');
  await inp.fill('2020-01-06');
  await p.waitForTimeout(2500);
  const accepted = await inp.inputValue();
  const f = await shot(P, p, TAG, 'earliest-date-2020-01-06', { full: true });
  rec('3-earliest-date', { minAttr: min, maxAttr: max, accepted, shot: f, body: (await text(p)).slice(0, 200) });
}

// ── 4. FUTURE date: via the input, and via the API directly ────────────────
{
  await goto(P, p, `${B}/teacher/attendance`, TAG, 'future-open');
  const inp = p.locator('input[type="date"]').first();
  await inp.fill('2026-09-30');
  await p.waitForTimeout(2500);
  const acceptedByInput = await inp.inputValue();
  const f = await shot(P, p, TAG, 'future-date-attempt', { full: true });
  const api = await p.evaluate(async ([childId]) => {
    const r = await fetch('/api/v1/attendance', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ childId, date: '2026-09-30', status: 'present' }] }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 300) };
  }, [CHILD_ID]);
  rec('4-future-date', { acceptedByInput, shot: f, api });
}

// ── 5. RE-MARK a day already marked ────────────────────────────────────────
{
  const first = await markDay('2026-08-11', 'sick', 'remark-first');
  const second = await markDay('2026-08-11', 'absent', 'remark-second');
  rec('5-remark-same-day', { first, second });
}

// ── 6. D-01 at volume: a child outside BOTH of this teacher's groups ───────
{
  await goto(P, p, `${B}/teacher/attendance`, TAG, 'D-01-volume-grid', { defect: 'D-01', full: true });
  const cards = await p.locator('button[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).filter((a) => a && a.includes(':')));
  // a Nur-guruhi child (tarbiyachi2's group) — must be refused
  const foreign = await p.evaluate(async () => {
    const r = await fetch('/api/v1/attendance', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ childId: '5eedc269-d2c5-4ed7-8427-881cbfbb2ebd', date: '2026-08-12', status: 'absent' }] }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 300) };
  });
  rec('6-D01-at-volume', { cardsOffered: cards.length, foreignChildApi: foreign });
}
await c.close();

// ── 7. COLLISION: reception marks the same child/day the teacher just marked
{
  const { c: c2, p: p2 } = await ctx(P, browser, 'reception-tmm3');
  const l = await login(P, p2, 'reception', 'qabul@tmm3.uz', PW, 'reception-tmm3');
  let apiRes = null; let uiShot = null;
  if (l.ok) {
    // reception has no attendance UI — go straight at the API it is allowed to call
    apiRes = await p2.evaluate(async ([childId]) => {
      const r = await fetch('https://uchqun-production-b484.up.railway.app/api/v1/attendance', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ childId, date: '2026-08-11', status: 'present' }] }),
      });
      return { status: r.status, body: (await r.text()).slice(0, 300) };
    }, [CHILD_ID]);
    uiShot = await shot(P, p2, 'reception-tmm3', 'collision-reception-context');
  }
  rec('7-collision-reception-overwrites', { apiRes, uiShot });
  await c2.close();
}

// ── 8. PARENT confirms every boundary day on the correct calendar date ─────
{
  const { c: c3, p: p3 } = await ctx(P, browser, 'parent-otaona11');
  const l = await login(P, p3, 'parent', PARENT, PW, 'parent-otaona11', { tab: /Ota-ona|Parent/i });
  const weeks = {};
  if (l.ok) {
    for (const [label, anchor] of [['jul-week', '2026-07-27'], ['aug-week1', '2026-08-03'], ['aug-week2', '2026-08-10']]) {
      await goto(P, p3, `${B}/attendance`, 'parent-otaona11', `parent-attendance-${label}-day`);
      try { await p3.locator('button', { hasText: /^Hafta$/ }).first().click(); await p3.waitForTimeout(3000); } catch { /* noop */ }
      // step back week by week until the header covers the anchor
      for (let i = 0; i < 6; i++) {
        const body = await text(p3);
        if (body.includes(anchor.slice(0, 7))) break;
        const prev = p3.locator('button').filter({ hasText: '' }).first();
        await p3.locator('button[aria-label], button').first().click().catch(() => {});
        await p3.waitForTimeout(1200);
      }
      const f = await shot(P, p3, 'parent-otaona11', `D-03-parent-week-${label}`, { defect: 'D-03', full: true });
      weeks[label] = { shot: f, body: (await text(p3)).slice(0, 700) };
    }
  }
  rec('8-parent-boundary-confirm', weeks);
  await c3.close();
}

save(P, 'p3b.json', out);
await browser.close();
console.log('P3b DONE');
