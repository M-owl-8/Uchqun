// P5.2–5.5 — exports opened, bulk import, trash cycle, concurrency, and every
// write confirmed by reading production back (L13).
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, pwFor, API } from './lib.mjs';
import fs from 'fs'; import path from 'path';

const P = phase('P5');
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5-flows', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 400)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const DL = path.resolve('audits/beta/deep2/P5/downloads'); fs.mkdirSync(DL, { recursive: true });
const browser = await newBrowser(true);

// ── 5.2 exports: download AND open, check contents against the screen ─────
await T('export-reception', async () => {
  const TAG = 'exp-reception'; const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.reception}/reception/parents`, TAG, 'export-reception-list', { full: true });
  const onScreen = await p.evaluate(() => {
    const cb = [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.offsetParent);
    cb.slice(1, 4).forEach((e) => { if (!e.checked) e.click(); });
    return (document.body.innerText.match(/[A-Z][a-zà-ÿ']+\s+[A-Z][a-zà-ÿ']+ova|[A-Z][a-zà-ÿ']+\s+[A-Z][a-zà-ÿ']+ov\b/g) || []).slice(0, 12);
  });
  await p.waitForTimeout(1500);
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 25000 }),
    p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /Eksport|CSV/i.test(e.innerText)); if (b) b.click(); }),
  ]);
  const f = path.join(DL, dl.suggestedFilename()); await dl.saveAs(f);
  const raw = fs.readFileSync(f, 'utf8'); const lines = raw.split(/\r?\n/).filter(Boolean);
  const namesInFile = lines.slice(1).map((l) => l.split(',').slice(0, 2).join(' ').replace(/"/g, '').trim());
  rec('export-reception', {
    file: path.basename(f), bytes: Buffer.byteLength(raw), lines: lines.length, bom: raw.charCodeAt(0) === 0xFEFF,
    header: lines[0], rows: lines.slice(1).map((l) => l.slice(0, 90)),
    everyFileRowAppearsOnScreen: namesInFile.every((n) => onScreen.some((s) => s.includes(n.split(' ')[1]) || n.includes(s.split(' ')[1]))),
    shot: await shot(P, p, TAG, 'export-reception-downloaded', { full: true }),
  });
  await c.close();
});

await T('export-government', async () => {
  const TAG = 'exp-gov'; const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'government', 'gov.republic@uchqun.uz', pwFor('gov.republic@uchqun.uz'), TAG);
  await goto(P, p, `${PORTALS.government}/government/schools`, TAG, 'export-gov-list', { full: true });
  const onScreen = await p.evaluate(() => (document.body.innerText.match(/\d+-sonli[^\n]{0,40}|[A-Z][a-z]+ Maxsus Maktab \d/g) || []).slice(0, 12));
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 25000 }),
    p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /CSV|Eksport|Yuklab/i.test(e.innerText)); if (b) b.click(); }),
  ]);
  const f = path.join(DL, dl.suggestedFilename()); await dl.saveAs(f);
  const raw = fs.readFileSync(f, 'utf8'); const lines = raw.split(/\r?\n/).filter(Boolean);
  rec('export-government', {
    file: path.basename(f), bytes: Buffer.byteLength(raw), lines: lines.length,
    header: lines[0], schoolsOnScreen: onScreen.length, schoolsInFile: lines.length - 1,
    countsMatch: onScreen.length > 0 && (lines.length - 1) >= onScreen.length,
    headerIsEnglish: /"Name","Address","Type"/.test(lines[0] || ''),
    shot: await shot(P, p, TAG, 'export-gov-downloaded', { full: true }),
  });
  await c.close();
});

await T('export-parent-json', async () => {
  const TAG = 'exp-parent'; const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'parent', 'otaona16@tmm3.uz', pwFor('otaona16@tmm3.uz'), TAG, { tab: /Ota-ona|Parent/i });
  await goto(P, p, `${PORTALS.teacher}/settings`, TAG, 'export-parent-context');
  const r = await p.evaluate(async () => {
    const x = await fetch('/api/v1/parent/me/export', { credentials: 'include' });
    const t = await x.text(); let j = null; try { j = JSON.parse(t); } catch {}
    return { status: x.status, bytes: t.length, keys: j ? Object.keys(j) : null,
      childNames: j?.children?.map((c) => `${c.firstName} ${c.lastName}`) ?? null,
      attendanceRows: j?.children?.[0]?.attendance?.length ?? null };
  });
  fs.writeFileSync(path.join(DL, 'parent-data-export.json'), JSON.stringify(r, null, 1));
  rec('export-parent-json', { ...r, shot: await shot(P, p, TAG, 'export-parent-json', { full: true }) });
  await c.close();
});

// ── 5.4 concurrency ───────────────────────────────────────────────────────
await T('concurrency-two-sessions-one-account', async () => {
  const { c: c1, p: p1 } = await ctx(P, browser, 'sess-A');
  const { c: c2, p: p2 } = await ctx(P, browser, 'sess-B');
  await login(P, p1, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'sess-A');
  await login(P, p2, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'sess-B');
  const bothAlive = await Promise.all([p1, p2].map((pg) => pg.evaluate(async () => {
    const r = await fetch('/api/v1/auth/me', { credentials: 'include' }); return r.status;
  })));
  // log out of A, then check B
  await p1.evaluate(async () => { await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }); });
  await p2.waitForTimeout(2000);
  const afterLogoutA = await Promise.all([p1, p2].map((pg) => pg.evaluate(async () => {
    const r = await fetch('/api/v1/auth/me', { credentials: 'include' }); return r.status;
  })));
  rec('two-sessions-one-account', {
    bothAliveBefore: bothAlive, afterLogoutOfA: afterLogoutA,
    sessionBSurvived: afterLogoutA[1] === 200,
    shotA: await shot(P, p1, 'sess-A', 'session-A-after-logout'),
    shotB: await shot(P, p2, 'sess-B', 'session-B-after-other-logout'),
  });
  await c1.close(); await c2.close();
});

await T('concurrency-two-writers-same-day', async () => {
  const CHILD = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31'; const DATE = '2026-08-10';
  const { c: c1, p: p1 } = await ctx(P, browser, 'writer-teacher');
  const { c: c2, p: p2 } = await ctx(P, browser, 'writer-reception');
  await login(P, p1, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'writer-teacher');
  await login(P, p2, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), 'writer-reception');
  const post = (pg, status) => pg.evaluate(async ([api, child, date, st]) => {
    const r = await fetch(`${api}/attendance`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: [{ childId: child, date, status: st }] }) });
    return { s: r.status, b: (await r.text()).slice(0, 120) };
  }, [API, CHILD, DATE, status]);
  const [a, b] = await Promise.all([post(p1, 'sick'), post(p2, 'present')]);
  rec('two-writers-same-day', { teacher: a, reception: b, date: DATE, note: 'DB state read back separately' });
  await c1.close(); await c2.close();
});

save(P, 'p5-flows.json', out);
await browser.close();
console.log('P5 flows DONE');
