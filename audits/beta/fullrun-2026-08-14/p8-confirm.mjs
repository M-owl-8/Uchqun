// P8 — R3 EYE CONFIRM. Fresh logins on the accounts that should see each
// consequence of the week, plus a valid parent-portal route sweep (the P2
// parent pass was captured behind the blocking privacy-consent modal).
import { newBrowser, ctx, login, shot, goto, save, ev, text, acceptParentConsent, PORTALS, PW } from './lib.mjs';

const T = PORTALS.teacher;
const MALIKA = 'f52ed345-6de6-4e7c-8a65-e82ba59418c2';
const b = await newBrowser(true);
const out = {};
function rec(k, v) { out[k] = v; ev({ kind: 'confirm', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 320)); }

const PARENT_ROUTES = [
  ['/', 'dashboard'], ['/child', 'child-profile'], ['/activities', 'activities'],
  ['/meals', 'meals'], ['/media', 'media'], ['/chat', 'chat'],
  ['/notifications', 'notifications'], ['/help', 'help'], ['/rating', 'teacher-rating'],
  ['/settings', 'settings'], ['/therapy', 'therapy'], ['/irr', 'irr'],
  ['/attendance', 'attendance'], ['/journal', 'journal'],
  ['/change-password', 'change-password'], ['/zzz-nonexistent', 'notfound'],
];

// ── A. parent10 (Rano Yusupova → Sanjar) full sweep + D3 sick confirm ──
{
  const tag = 'parent10-sanjar';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'parent', 'parent10@uchqun.uz', PW, tag, { tab: /Ota-ona|Parent|Родител/i });
  if (li.ok) {
    rec('A0-consent', await acceptParentConsent(p, tag));
    const sweep = [];
    for (const [r, action] of PARENT_ROUTES) {
      const f = await goto(p, T + r, tag, `postconsent-${action}`);
      sweep.push({ route: r, action, shot: f, head: (await text(p)).slice(0, 260) });
    }
    out['A-sweep'] = sweep;
    try {
      await goto(p, `${T}/attendance`, tag, 'attendance-day-view');
      await p.locator('button', { hasText: /^Hafta$/ }).first().click();
      await p.waitForTimeout(4000);
      const f = await shot(p, tag, 'attendance-week-view', true);
      const body = await text(p);
      rec('A1-parent10-sees-D3-sick', { shot: f, mentionsKasal: /Kasal/.test(body), body: body.slice(0, 1200) });
    } catch (e) { rec('A1-parent10-sees-D3-sick', { error: e.message }); }
  }
  await c.close();
}

// ── B. parent11 (→ Nozima) should see D5 absent ──────────────────────
{
  const tag = 'parent11-nozima';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'parent', 'parent11@uchqun.uz', PW, tag, { tab: /Ota-ona|Parent|Родител/i });
  if (li.ok) {
    await acceptParentConsent(p, tag);
    await goto(p, `${T}/attendance`, tag, 'attendance-day-view');
    try { await p.locator('button', { hasText: /^Hafta$/ }).first().click(); await p.waitForTimeout(4000); } catch { /* noop */ }
    const f = await shot(p, tag, 'attendance-week-view', true);
    const body = await text(p);
    rec('B-parent11-sees-D5-absent', { shot: f, mentionsYoq: /Yo'q|Yoʻq/.test(body), body: body.slice(0, 1200) });
  }
  await c.close();
}

// ── C. parent12 (→ Malika) — the D6 home_leave the UI said it saved ──
{
  const tag = 'parent12-malika';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'parent', 'parent12@uchqun.uz', PW, tag, { tab: /Ota-ona|Parent|Родител/i });
  if (li.ok) {
    await acceptParentConsent(p, tag);
    await goto(p, `${T}/attendance`, tag, 'attendance-day-view');
    try { await p.locator('button', { hasText: /^Hafta$/ }).first().click(); await p.waitForTimeout(4000); } catch { /* noop */ }
    const f = await shot(p, tag, 'attendance-week-view', true);
    const body = await text(p);
    rec('C-parent12-sees-D6-homeleave', { shot: f, mentionsUyda: /Uyda/.test(body), body: body.slice(0, 1200) });
    rec('C2-parent12-dashboard', { shot: await goto(p, `${T}/`, tag, 'dashboard'), body: (await text(p)).slice(0, 700) });
  }
  await c.close();
}

// ── D. teacher8 owns B-guruh (Malika) — does the week show anything? ──
{
  const tag = 'teacher8-bguruh';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'teacher', 'teacher8@uchqun.uz', PW, tag);
  if (li.ok) {
    rec('D0-dashboard', { shot: await goto(p, `${T}/teacher`, tag, 'dashboard'), body: (await text(p)).slice(0, 500) });
    await goto(p, `${T}/teacher/attendance`, tag, 'attendance-day-view');
    try { await p.locator('button', { hasText: /^Hafta$/ }).first().click(); await p.waitForTimeout(4500); } catch { /* noop */ }
    const f = await shot(p, tag, 'attendance-week-view', true);
    rec('D1-teacher8-week', { shot: f, body: (await text(p)).slice(0, 1200) });
  }
  await c.close();
}

// ── E. Admin view of Malika's record ─────────────────────────────────
{
  const tag = 'admin-smm2';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, tag);
  if (li.ok) {
    rec('E1-admin-child-detail-malika', {
      shot: await goto(p, `${PORTALS.admin}/admin/children/${MALIKA}`, tag, 'child-detail-malika', 5000),
      body: (await text(p)).slice(0, 900),
    });
    rec('E2-admin-activity', {
      shot: await goto(p, `${PORTALS.admin}/admin/activity`, tag, 'activity-feed-confirm', 5000),
      body: (await text(p)).slice(0, 900),
    });
  }
  await c.close();
}

save('p8-confirm.json', out);
await b.close();
console.log('P8 DONE');
