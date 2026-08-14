// P7.3 — re-witness each fix on the DEPLOYED build.
// One screenshot per defect id. No screenshot -> the defect is reported NOT FIXED.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, pwFor, DESKTOP, MOBILE } from './lib.mjs';
import fs from 'fs'; import path from 'path';

const P = phase('P7');
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7-witness', d: k, v }); console.log(k, JSON.stringify(v).slice(0, 320)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const DL = path.resolve('audits/beta/deep2/P7/downloads'); fs.mkdirSync(DL, { recursive: true });
const browser = await newBrowser(true);

// ── D-45: government schools CSV header must no longer be English ──────────
await T('D-45', async () => {
  const TAG = 'D-45'; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  await login(P, p, 'government', 'gov.republic@uchqun.uz', pwFor('gov.republic@uchqun.uz'), TAG);
  await goto(P, p, `${PORTALS.government}/government/schools`, TAG, 'D-45-schools-page', { full: true });
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 30000 }),
    p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /CSV|Eksport|Yuklab/i.test(e.innerText)); if (b) b.click(); }),
  ]);
  const f = path.join(DL, dl.suggestedFilename()); await dl.saveAs(f);
  const raw = fs.readFileSync(f, 'utf8'); const header = raw.split(/\r?\n/)[0];
  rec('D-45', {
    header,
    stillEnglish: /"?Name"?,"?Address"?/i.test(header),
    typeColumnSample: (raw.split(/\r?\n/)[1] || '').slice(0, 120),
    shot: await shot(P, p, TAG, 'D-45-csv-downloaded', { full: true }),
  });
  await c.close();
});

// ── D-40: admin hardcoded English literals ────────────────────────────────
await T('D-40', async () => {
  const TAG = 'D-40'; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.admin}/admin/import`, TAG, 'D-40-bulk-import', { full: true });
  const bulk = await text(p);
  await goto(P, p, `${PORTALS.admin}/admin/parents`, TAG, 'D-40-parents');
  // open the first child detail we can reach
  await p.evaluate(() => { const a = [...document.querySelectorAll('a,button')].find((e) => e.offsetParent && /Bola|ko'rish|Batafsil/i.test(e.innerText)); if (a) a.click(); });
  await p.waitForTimeout(3000);
  const detail = await text(p);
  rec('D-40', {
    bulkHasEnglish: /Show \d+ errors|Hide errors/.test(bulk),
    detailHasEnglish: /\bDOB:|\bGender:|\bClass:/.test(detail),
    shotBulk: await shot(P, p, TAG, 'D-40-bulk-import-labels', { full: true }),
  });
  await c.close();
});

// ── D-36: the parent portal must expose a language switcher ───────────────
await T('D-36', async () => {
  const TAG = 'D-36'; const { c, p } = await ctx(P, browser, TAG, MOBILE);
  await login(P, p, 'parent', 'otaona16@tmm3.uz', pwFor('otaona16@tmm3.uz'), TAG, { tab: /Ota-ona|Parent/i });
  await goto(P, p, `${PORTALS.teacher}/settings`, TAG, 'D-36-parent-settings', { full: true });
  const probe = await p.evaluate(() => {
    const body = document.body.innerText;
    const langControls = [...document.querySelectorAll('button,select,[role=button]')]
      .filter((e) => e.offsetParent && /o'zbek|uzbek|русск|english|til\b|язык|language/i.test(e.innerText || e.value || ''))
      .map((e) => (e.innerText || e.value || '').trim().slice(0, 40));
    return { hasLangSection: /Til|Language|Язык/i.test(body), langControls: langControls.slice(0, 8) };
  });
  rec('D-36', { ...probe, shot: await shot(P, p, TAG, 'D-36-language-switcher', { full: true }) });
  await c.close();
});

// ── D-55: a deep link must survive login, in all four portals ─────────────
for (const [portal, base, account, deep] of [
  ['reception', PORTALS.reception, 'qabul@tmm3.uz', '/reception/parents'],
  ['teacher', PORTALS.teacher, 'tarbiyachi1@tmm3.uz', '/teacher/bolalar'],
  ['admin', PORTALS.admin, 'direktor@tmm3.uz', '/admin/receptions'],
  ['government', PORTALS.government, 'gov.republic@uchqun.uz', '/government/schools'],
]) {
  await T(`D-55-${portal}`, async () => {
    const TAG = `D-55-${portal}`; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
    await goto(P, p, base + deep, TAG, `D-55-${portal}-deeplink-anon`);
    const landed = new URL(p.url()).pathname;
    await login(P, p, portal, account, pwFor(account), TAG, portal === 'teacher' ? {} : undefined);
    await p.waitForTimeout(4000);
    const after = new URL(p.url()).pathname;
    rec(`D-55-${portal}`, {
      requested: deep, redirectedToLogin: /login/.test(landed), afterLogin: after,
      returnedToDeepLink: after === deep,
      shot: await shot(P, p, TAG, `D-55-${portal}-after-login`, { full: true }),
    });
    await c.close();
  });
}

save(P, 'p7-witness.json', out);
await browser.close();
console.log('P7 witness DONE');
