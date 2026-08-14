// P6b — the secondary (grant-limited) variant, cross-region negative probes at
// the API, the schools CSV export, and the audit log.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW, API } from './lib.mjs';
import fs from 'fs'; import path from 'path';

const P = phase('P6');
const B = PORTALS.government;
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p6b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const DL = path.resolve('audits/beta/deep/P6/downloads'); fs.mkdirSync(DL, { recursive: true });

// schools by region, established in P1
const TOSHKENT_SLUGS = ['tmm3', 'tmm4'];
const SAMARQAND_SLUGS = ['smm3', 'smm4', 'smm5'];
const ANDIJON_SLUGS = ['amm1'];

const browser = await newBrowser(true);

// ── the secondary, grant-limited account ─────────────────────────────────
await T('secondary', async () => {
  const TAG = 'gov-secondary';
  const { c, p } = await ctx(P, browser, TAG);
  const li = await login(P, p, 'government', 'men@davlat.uz', PW, TAG);
  rec('secondary-login', li);
  if (!li.ok) { await c.close(); return; }
  const grants = await p.evaluate(async (api) => {
    const r = await fetch(`${api}/auth/me`, { credentials: 'include' });
    const j = await r.json();
    const u = j.user || j.data || j;
    return { govLevel: u.govLevel, govType: u.govType, govRegionId: u.govRegionId, govAccessGrants: u.govAccessGrants };
  }, API);
  rec('secondary-grants', grants);
  const seen = {};
  for (const [id, r] of [['G1', '/government'], ['G2', '/government/schools'], ['G3', '/government/students'], ['G6', '/government/ratings'], ['G9', '/government/audit-log'], ['G8', '/government/warnings']]) {
    const f = await goto(P, p, B + r, TAG, `secondary-${id}${r.replace(/\//g, '-')}`, { full: true });
    const body = (await text(p)).replace(/\n/g, ' | ');
    const d = await p.evaluate(DUMP);
    seen[r] = { shot: f, buttons: d.buttons.length, schools: [...new Set((body.match(/\d-sonli[^|]{0,26}/g) || []))].slice(0, 8), denied: /ruxsat|Ruxsat|403|yo'q/i.test(body), head: body.slice(150, 420) };
    console.log('secondary', r, seen[r].schools.length, 'schools');
  }
  rec('secondary-surfaces', seen);
  // does the API honour the grants?
  const probes = await p.evaluate(async (api) => {
    const g = async (u) => { const r = await fetch(api + u, { credentials: 'include' }); const t = await r.text(); return { u, s: r.status, len: t.length, b: t.slice(0, 130) }; };
    return [await g('/government/schools'), await g('/government/ratings'), await g('/government/audit-log')];
  }, API);
  rec('secondary-api', probes);
  await c.close();
});

// ── cross-region negative probes ──────────────────────────────────────────
await T('cross-region', async () => {
  const TAG = 'gov-toshkent';
  const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'government', 'gov.toshkent@uchqun.uz', PW, TAG);
  const ids = await p.evaluate(async (api) => {
    const r = await fetch(`${api}/government/schools?limit=200`, { credentials: 'include' });
    const j = await r.json();
    const list = j.data?.schools || j.data || j.schools || [];
    return list.map((s) => ({ id: s.id, slug: s.slug, name: (s.name || '').slice(0, 40), regionId: s.regionId }));
  }, API);
  rec('toshkent-school-list', { count: ids.length, slugs: ids.map((s) => s.slug), regionIds: [...new Set(ids.map((s) => s.regionId))] });

  // fetch a school this account must not see, by id
  const foreign = await p.evaluate(async ([api]) => {
    const out = [];
    for (const slug of ['smm3', 'amm1']) {
      const r = await fetch(`${api}/government/schools?search=${slug}`, { credentials: 'include' });
      out.push({ probe: `search=${slug}`, s: r.status, b: (await r.text()).slice(0, 200) });
    }
    return out;
  }, [API]);
  rec('toshkent-search-foreign', foreign);
  await c.close();
});

// ── the same, from the Samarqand side ────────────────────────────────────
await T('samarqand-scope', async () => {
  const TAG = 'gov-samarqand';
  const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'government', 'gov.samarqand@uchqun.uz', PW, TAG);
  const ids = await p.evaluate(async (api) => {
    const r = await fetch(`${api}/government/schools?limit=200`, { credentials: 'include' });
    const j = await r.json();
    const list = j.data?.schools || j.data || j.schools || [];
    return list.map((s) => ({ slug: s.slug, regionId: s.regionId }));
  }, API);
  rec('samarqand-school-list', { count: ids.length, slugs: ids.map((s) => s.slug), regionIds: [...new Set(ids.map((s) => s.regionId))] });
  await c.close();
});

// ── republic: all three regions, plus the CSV export ─────────────────────
await T('republic', async () => {
  const TAG = 'gov-republic';
  const { c, p } = await ctx(P, browser, TAG);
  await login(P, p, 'government', 'gov.republic@uchqun.uz', PW, TAG);
  const ids = await p.evaluate(async (api) => {
    const r = await fetch(`${api}/government/schools?limit=200`, { credentials: 'include' });
    const j = await r.json();
    const list = j.data?.schools || j.data || j.schools || [];
    return list.map((s) => ({ slug: s.slug, regionId: s.regionId }));
  }, API);
  rec('republic-school-list', { count: ids.length, slugs: ids.map((s) => s.slug).filter(Boolean), regionIds: [...new Set(ids.map((s) => s.regionId))] });

  await goto(P, p, `${B}/government/schools`, TAG, 'republic-schools-for-export', { full: true });
  const ctrls = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && /CSV|Eksport|Yuklab/i.test(b.innerText)).map((b) => b.innerText.trim()));
  let file = null; let err = null; let warn = null;
  try {
    const [dl] = await Promise.all([
      p.waitForEvent('download', { timeout: 25000 }),
      p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /CSV|Eksport|Yuklab/i.test(e.innerText)); if (b) b.click(); }),
    ]);
    file = path.join(DL, dl.suggestedFilename());
    await dl.saveAs(file);
  } catch (e) { err = e.message.split('\n')[0]; }
  await p.waitForTimeout(1500);
  warn = ((await text(p)).match(/[^|\n]*(qisqartir|truncat|faqat)[^|\n]*/i) || [])[0] ?? null;
  let content = null;
  if (file && fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const cols = (l) => (l.match(/","/g) || []).length + 1;
    content = { bytes: Buffer.byteLength(raw), lines: lines.length, header: lines[0]?.slice(0, 200), firstRow: lines[1]?.slice(0, 200), headerCols: cols(lines[0] || ''), ragged: lines.slice(1).filter((l) => cols(l) !== cols(lines[0] || '')).length, containsAllRegions: ['Toshkent', 'Samarqand', 'Andijon'].filter((r) => raw.includes(r)) };
  }
  rec('republic-csv', { controls: ctrls, err, file: file ? path.basename(file) : null, truncationWarning: warn, content, shot: await shot(P, p, TAG, 'republic-export-clicked', { full: true }) });

  // audit log — D-05 re-derivation
  await goto(P, p, `${B}/government/audit-log`, TAG, 'D-05-audit-log', { defect: 'D-05', full: true });
  const rows = await p.evaluate(() => [...document.querySelectorAll('tr')].slice(0, 6).map((tr) => (tr.innerText || '').trim().replace(/\t/g, ' | ').slice(0, 150)));
  rec('audit-log', { rows, body: (await text(p)).replace(/\n/g, ' | ').slice(150, 520) });
  await c.close();
});

save(P, 'p6b.json', out);
await browser.close();
console.log('P6b DONE');
