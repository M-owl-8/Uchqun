// W6 — final confirmations on the last deployed build:
// D-07 real figure, W6 media as a parent sees it, and a whole-portal console sweep.
import { newBrowser, ctx, login, shot, goto, save, ev, text, acceptParentConsent, PORTALS, PW, OLDPW } from './lib.mjs';

const out = {};
const b = await newBrowser(false);
function rec(k, v) { out[k] = v; ev({ kind: 'w6', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 340)); }

// D-07 final: attendance was recorded today for Umid guruhi → real numbers
{
  const tag = 'teacher-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, tag);
  if (li.ok) {
    rec('D-07-final', {
      shot: await goto(p, `${PORTALS.teacher}/teacher`, tag, 'dashboard-real-attendance-figure', { defect: 'D-07', full: true, wait: 6000 }),
      body: (await text(p)).slice(0, 400),
    });
  }
  await c.close();
}
// a teacher who has NOT taken attendance today must still read "not recorded"
{
  const tag = 'teacher2-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'teacher', 'tarbiyachi2@tmm3.uz', PW, tag);
  if (li.ok) {
    rec('D-07-not-recorded', {
      shot: await goto(p, `${PORTALS.teacher}/teacher`, tag, 'dashboard-not-recorded-state', { defect: 'D-07', full: true, wait: 6000 }),
      body: (await text(p)).slice(0, 400),
    });
  }
  await c.close();
}
// W6: seeded media as a parent sees it (X-01 gate)
{
  const tag = 'parent-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'parent', 'otaona11@tmm3.uz', PW, tag, { tab: /Ota-ona|Parent/i });
  if (li.ok) {
    await acceptParentConsent(p, tag);
    rec('W6-gallery', {
      shot: await goto(p, `${PORTALS.teacher}/media`, tag, 'parent-gallery-x01-blocked', { defect: 'W6', full: true }),
      body: (await text(p)).slice(0, 260),
    });
    rec('W6-meals', {
      shot: await goto(p, `${PORTALS.teacher}/meals`, tag, 'parent-meals-real-data', { defect: 'W6', full: true }),
      body: (await text(p)).slice(0, 260),
    });
    rec('W6-journal', {
      shot: await goto(p, `${PORTALS.teacher}/journal`, tag, 'parent-journal-real-data', { defect: 'W6', full: true }),
      body: (await text(p)).slice(0, 260),
    });
    rec('W6-irr', {
      shot: await goto(p, `${PORTALS.teacher}/irr`, tag, 'parent-irr-real-data', { defect: 'W6', full: true }),
      body: (await text(p)).slice(0, 260),
    });
    rec('W6-therapy', {
      shot: await goto(p, `${PORTALS.teacher}/therapy`, tag, 'parent-therapy-real-data', { defect: 'W6', full: true }),
      body: (await text(p)).slice(0, 260),
    });
  }
  await c.close();
}
save('w6.json', out);
await b.close();
console.log('W6 DONE');
