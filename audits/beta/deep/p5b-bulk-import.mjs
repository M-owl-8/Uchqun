// P5b — bulk import through the UI: valid file, malformed file, wrong headers,
// non-CSV. Two-phase semantics (T1-7a validate / T1-7b start) checked against
// the documented contract, not against the happy path alone.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
import path from 'path';

const P = phase('P5');
const B = PORTALS.admin;
const TAG = 'admin-tmm3';
const F = (n) => path.resolve('audits/beta/deep/fixtures', n);
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 620)); };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const net = [];
p.on('response', async (r) => {
  if (!/\/api\/v1\/admin\/import/.test(r.url())) return;
  let b = ''; try { b = (await r.text()).slice(0, 700); } catch { /* noop */ }
  net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b });
});
const since = () => { const n = [...net]; net.length = 0; return n; };

await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

async function upload(file, label, opts = {}) {
  await goto(P, p, `${B}/admin/import`, TAG, `import-${label}-open`, { full: true });
  const fi = p.locator('input[type="file"]');
  if (!(await fi.count())) return { error: 'no file input' };
  await fi.first().setInputFiles(F(file));
  await p.waitForTimeout(1500);
  const chosen = await shot(P, p, TAG, `import-${label}-file-chosen`, { full: true });
  since();
  // the validate action
  const go = p.locator('button').filter({ hasText: /Tekshir|Yuklash|Validatsiya|Davom/i });
  const labels = await go.evaluateAll((e) => e.map((b) => b.innerText.trim()));
  if (await go.count()) await go.first().click();
  await p.waitForTimeout(opts.wait ?? 9000);
  const validated = await shot(P, p, TAG, `import-${label}-validated`, { full: true });
  return { chosen, actionLabels: labels, net: since(), validated, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 700) };
}

// ── 1. wrong headers → must be a file-level 400 ───────────────────────────
rec('badheaders', await upload('import-badheaders.csv', 'badheaders'));

// ── 2. non-CSV extension → file-level rejection ───────────────────────────
rec('notcsv', await upload('import-notcsv.txt', 'notcsv'));

// ── 3. malformed rows → 201 with per-row errors, NOT a 400 ────────────────
{
  const r = await upload('import-malformed.csv', 'malformed');
  rec('malformed', r);
  // per the contract this must still create a job; is the Start action offered?
  const startable = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && /Boshla|Import|Yuklashni/i.test(b.innerText)).map((b) => ({ t: b.innerText.trim().slice(0, 24), disabled: b.disabled })));
  rec('malformed-start-offered', startable);
}

// ── 4. valid file → validate, then start, then poll ───────────────────────
{
  const r = await upload('import-valid.csv', 'valid');
  rec('valid-validate', r);
  since();
  const start = p.locator('button').filter({ hasText: /Boshla|Importni|Yuklashni boshlash/i });
  const startLabels = await start.evaluateAll((e) => e.map((b) => ({ t: b.innerText.trim(), disabled: b.disabled })));
  if (await start.count()) { await start.first().click(); await p.waitForTimeout(4000); }
  const started = await shot(P, p, TAG, 'import-valid-started', { full: true });
  // poll the status surface
  const polls = [];
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(4000);
    polls.push((await text(p)).replace(/\n/g, ' | ').slice(0, 200));
  }
  rec('valid-start', { startLabels, net: since(), started, polls: polls.slice(-2), final: await shot(P, p, TAG, 'import-valid-completed', { full: true }) });
}

// ── 5. IDOR: can this admin start another school's import job? ────────────
{
  const probe = await p.evaluate(async () => {
    const r = await fetch('/api/v1/admin/import/00000000-0000-0000-0000-000000000000/start', { method: 'POST', credentials: 'include' });
    return { s: r.status, b: (await r.text()).slice(0, 200) };
  });
  rec('import-idor-probe', probe);
}

save(P, 'p5b.json', out);
await c.close();
await browser.close();
console.log('P5b DONE');
