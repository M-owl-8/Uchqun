// W5b — fill the two demo-path gaps: a region school-detail screen (the row
// links are table rows, not <a href>), and the director's activity feed where
// the seeded audit history actually surfaces.
import { newBrowser, ctx, login, shot, goto, save, ev, text, PORTALS, PW, OLDPW } from './lib.mjs';

const out = {};
const b = await newBrowser(false);
function rec(k, v) { out[k] = v; ev({ kind: 'w5b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); }

{
  const tag = 'demo-gov-region';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'government', 'gov.toshkent@uchqun.uz', OLDPW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.government}/government/schools`, tag, 'region-schools-list', { defect: 'W5', full: true });
    const body = await text(p);
    // school rows are clickable <tr>/<button>, not anchors
    try {
      await p.locator('tr, [role=row], button').filter({ hasText: '3-sonli ixtisoslashtirilgan' }).first().click();
      await p.waitForTimeout(4500);
    } catch (e) { rec('row-click-err', e.message); }
    rec('W5-school-detail', { url: p.url(), shot: await shot(p, tag, 'region-school-detail', { defect: 'W5', full: true }), body: (await text(p)).slice(0, 400) });
    rec('W5-schools-body', body.slice(0, 400));
  }
  await c.close();
}
{
  const tag = 'demo-director';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'admin', 'direktor@tmm3.uz', PW, tag);
  if (li.ok) {
    rec('W5-activity-feed', {
      shot: await goto(p, `${PORTALS.admin}/admin/activity`, tag, 'director-activity-feed-dated', { defect: 'D-05', full: true }),
      body: (await text(p)).slice(0, 600),
    });
    rec('W5-documents-queue', {
      shot: await goto(p, `${PORTALS.admin}/admin/documents`, tag, 'director-documents-queue', { defect: 'W5', full: true }),
      body: (await text(p)).slice(0, 400),
    });
    rec('W5-import', {
      shot: await goto(p, `${PORTALS.admin}/admin/import`, tag, 'director-bulk-import-reachable', { defect: 'D-10', full: true }),
    });
  }
  await c.close();
}
// teacher dashboard after the client cache TTL (90s) has expired
{
  const tag = 'teacher-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, tag);
  if (li.ok) {
    rec('D-07-dashboard-cache-expired', {
      shot: await goto(p, `${PORTALS.teacher}/teacher`, tag, 'dashboard-after-cache-expiry', { defect: 'D-07', full: true, wait: 6000 }),
      body: (await text(p)).slice(0, 400),
    });
  }
  await c.close();
}

save('w5b.json', out);
await b.close();
console.log('W5b DONE');
