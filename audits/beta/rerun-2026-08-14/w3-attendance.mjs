// W3 — D-01 (silent discard) + D-03 (one-day-late parent week) + D-07/D-12
// on the teacher dashboard, all on the deployed build.
import { newBrowser, ctx, login, shot, goto, save, ev, text, acceptParentConsent, PORTALS, PW } from './lib.mjs';

const out = {};
const b = await newBrowser(false);
function rec(k, v) { out[k] = v; ev({ kind: 'w3', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); }

const TEACHER = 'tarbiyachi1@tmm3.uz';          // owns "Umid guruhi"
const FOREIGN_CHILD = '5eedc269-d2c5-4ed7-8427-881cbfbb2ebd'; // Dilnoza Rahimova, Nur guruhi
const ABSENT_CHILD_NAME = 'Nozima Sharipova';
const ABSENT_PARENT = 'otaona12@tmm3.uz';
const TODAY = new Date().toISOString().slice(0, 10);

{
  const tag = 'teacher-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'teacher', TEACHER, PW, tag);
  rec('login', li);
  if (li.ok) {
    // D-07 + D-12: dashboard before attendance is taken today
    rec('D-07-dashboard', {
      shot: await goto(p, `${PORTALS.teacher}/teacher`, tag, 'dashboard-before-attendance', { defect: 'D-07', full: true }),
      body: (await text(p)).slice(0, 420),
    });

    // D-01 part 1: the grid must offer ONLY this teacher's own group
    await goto(p, `${PORTALS.teacher}/teacher/attendance`, tag, 'attendance-grid-own-group-only', { defect: 'D-01', full: true });
    const gridBody = await text(p);
    const cards = await p.locator('button[aria-label]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label')).filter((a) => a && a.includes(':')));
    rec('D-01-grid-scope', {
      cardsOffered: cards.length,
      names: cards.map((x) => x.split(':')[0]),
      foreignChildOffered: cards.some((x) => /Dilnoza|Muslima Rahimova|Temurbek|Shahzoda/.test(x)),
    });

    // D-01 part 2: the backend must refuse a child this teacher may not record.
    // Corroboration only — the screen-level proof is that the child is not offered.
    const api = await p.evaluate(async ([childId, date]) => {
      const r = await fetch('/api/v1/attendance', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ childId, date, status: 'absent' }] }),
      });
      return { status: r.status, body: (await r.text()).slice(0, 300) };
    }, [FOREIGN_CHILD, TODAY]);
    rec('D-01-api-refusal', api);

    // D-01 part 3: a real absence, saved, on screen
    await goto(p, `${PORTALS.teacher}/teacher/attendance`, tag, 'attendance-fresh');
    await p.locator('button', { hasText: 'Hammasi keldi' }).first().click();
    await p.waitForTimeout(900);
    const card = p.locator(`button[aria-label^="${ABSENT_CHILD_NAME}:"]`).first();
    for (let i = 0; i < 2; i++) { await card.click(); await p.waitForTimeout(350); } // present → home_leave → sick
    const lbl = await card.getAttribute('aria-label');
    rec('D-01-marked', { label: lbl, shot: await shot(p, tag, 'attendance-marked-sick', { defect: 'D-01', full: true }) });
    await p.locator('button', { hasText: /belgilangan ·/ }).first().click();
    await p.waitForTimeout(1500);
    rec('D-01-saved', { shot: await shot(p, tag, 'attendance-save-result', { defect: 'D-01' }), body: (await text(p)).slice(0, 200) });
    await p.waitForTimeout(3500);

    // D-07 again: after attendance exists the dashboard must show real numbers
    rec('D-07-dashboard-after', {
      shot: await goto(p, `${PORTALS.teacher}/teacher`, tag, 'dashboard-after-attendance', { defect: 'D-07', full: true }),
      body: (await text(p)).slice(0, 420),
    });
    // D-09: Meals reachable from the Reja tab bar
    rec('D-09-meals-nav', {
      shot: await goto(p, `${PORTALS.teacher}/teacher/reja`, tag, 'reja-tabbar-with-meals', { defect: 'D-09', full: true }),
      body: (await text(p)).slice(0, 300),
    });
    rec('D-09-meals-page', {
      shot: await goto(p, `${PORTALS.teacher}/teacher/reja?tab=meals`, tag, 'reja-meals-tab', { defect: 'D-09', full: true }),
    });
    // D-13: change-password copy for a user under no obligation
    rec('D-13-change-password', {
      shot: await goto(p, `${PORTALS.teacher}/teacher/change-password`, tag, 'change-password-copy', { defect: 'D-13' }),
      body: (await text(p)).slice(0, 220),
    });
  }
  await c.close();
}

// ── D-03: the parent must see that absence on the correct calendar day ──────
{
  const tag = 'parent-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'parent', ABSENT_PARENT, PW, tag, { tab: /Ota-ona|Parent/i });
  rec('parent-login', li);
  if (li.ok) {
    await acceptParentConsent(p, tag);
    await goto(p, `${PORTALS.teacher}/attendance`, tag, 'parent-attendance-day', { defect: 'D-03' });
    try { await p.locator('button', { hasText: /^Hafta$/ }).first().click(); await p.waitForTimeout(4000); } catch { /* noop */ }
    const f = await shot(p, tag, 'parent-attendance-week', { defect: 'D-03', full: true });
    const body = await text(p);
    rec('D-03-parent-week', { today: TODAY, shot: f, body: body.slice(0, 900) });
    // D-11: the rating page must show the assigned teacher, not an error card
    rec('D-11-rating', {
      shot: await goto(p, `${PORTALS.teacher}/rating`, tag, 'parent-teacher-rating', { defect: 'D-11', full: true }),
      body: (await text(p)).slice(0, 500),
    });
    rec('D-06-meals', {
      shot: await goto(p, `${PORTALS.teacher}/meals`, tag, 'parent-meals-populated', { full: true }),
      body: (await text(p)).slice(0, 300),
    });
  }
  await c.close();
}

save('w3-attendance.json', out);
await b.close();
console.log('W3 DONE');
