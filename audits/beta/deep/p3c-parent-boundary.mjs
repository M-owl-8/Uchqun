// P3c — the D-03 class check: does the parent see every boundary day on the
// correct calendar date? Plus the pre-enrolment date question left open in P3b.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';

const P = phase('P3');
const B = PORTALS.teacher;
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3c', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 500)); };
const CHILD_ID = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';

const browser = await newBrowser(true);

// ── parent: walk back week by week and capture each week grid ──────────────
{
  const TAG = 'parent-otaona11';
  const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
  await goto(P, p, `${B}/attendance`, TAG, 'parent-attendance-day-view');
  await p.locator('button', { hasText: /^Hafta$/ }).first().click();
  await p.waitForTimeout(3500);
  const weeks = [];
  for (let i = 0; i < 4; i++) {
    const body = await text(p);
    const header = (body.match(/\d{4}-\d{2}-\d{2}\s*–\s*\d{4}-\d{2}-\d{2}/) || [])[0] ?? null;
    const cells = await p.evaluate(() => [...document.querySelectorAll('div')]
      .filter((d) => /^M\d{2} \d{1,2}$/.test((d.innerText || '').trim().split('\n')[0]) && d.children.length <= 3)
      .map((d) => (d.innerText || '').trim().replace(/\n+/g, '=')));
    const f = await shot(P, p, TAG, `D-03-parent-week-${i}-${(header || 'x').slice(0, 10)}`, { defect: 'D-03', full: true });
    weeks.push({ header, cells, shot: f });
    console.log('week', i, header, JSON.stringify(cells));
    await p.locator('button[aria-label="Oldingi kun"], button', { hasText: '' }).first().click().catch(() => {});
    // prev-week control is the left chevron; target it by position
    await p.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const prev = btns.find((b) => b.querySelector('svg') && b.getBoundingClientRect().left < 500 && b.getBoundingClientRect().top < 400);
      if (prev) prev.click();
    });
    await p.waitForTimeout(3000);
  }
  rec('parent-week-walk', weeks);
  await c.close();
}

// ── pre-enrolment / very old date: does the API actually accept it? ────────
{
  const TAG = 'teacher-tmm3';
  const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);
  await goto(P, p, `${B}/teacher/attendance`, TAG, 'preenrol-context');
  const api = await p.evaluate(async ([childId]) => {
    const r = await fetch('/api/v1/attendance', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ childId, date: '2020-01-06', status: 'present' }] }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 300) };
  }, [CHILD_ID]);
  rec('pre-enrolment-date-save', api);
  await c.close();
}

save(P, 'p3c.json', out);
await browser.close();
console.log('P3c DONE');
