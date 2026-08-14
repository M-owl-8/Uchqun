// P5g — delete -> Trash -> restore on a seed reception (an entity Trash covers),
// and the imported children under the parent they were imported to.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
const P = phase('P5'); const B = PORTALS.admin; const TAG = 'admin-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5g', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 300); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

// ── imported children under Rayhona Ergasheva (otaona11@tmm3.uz) ──────────
await T('imported-children', async () => {
  await goto(P, p, `${B}/admin/parents`, TAG, 'parents-for-sim-check', { full: true });
  const s = p.locator('input[type="search"], input[type="text"]').first();
  await s.fill('Rayhona'); await p.waitForTimeout(3500);
  const rows = await p.evaluate(() => [...document.querySelectorAll('button,div[role="button"],li')].filter((e) => e.offsetParent && /Rayhona/.test(e.innerText || '')).map((e) => (e.innerText || '').trim().replace(/\n/g, ' / ').slice(0, 60)));
  await p.evaluate(() => { const e = [...document.querySelectorAll('button,div[role="button"],li')].filter((x) => x.offsetParent && /Rayhona/.test(x.innerText || '')); if (e.length) e[e.length - 1].click(); });
  await p.waitForTimeout(4500);
  const body = (await text(p)).replace(/\n/g, ' | ');
  const links = await p.evaluate(() => [...document.querySelectorAll('a[href^="/admin/children/"]')].map((a) => ({ href: a.getAttribute('href'), t: (a.innerText || '').trim().replace(/\n+/g, ' ').slice(0, 40) })));
  rec('imported-children', { rows, childLinks: links, simFound: (body.match(/SIM-[A-Za-z]+/g) || []).slice(0, 6), shot: await shot(P, p, TAG, 'D-41-parent-detail-imported-children', { defect: 'D-41', full: true }), body: body.slice(-420) });
});

// ── can a child be deleted from the admin child-detail page? ──────────────
await T('child-delete-surface', async () => {
  const f = await goto(P, p, `${B}/admin/children/0047fff7-b7f2-400c-aacc-f380a4b4dd31`, TAG, 'imported-child-detail', { full: true });
  const d = await p.evaluate(DUMP);
  rec('child-delete-surface', { shot: f, buttons: d.buttons, body: (await text(p)).replace(/\n/g, ' | ').slice(-320) });
});

// ── trash cycle on a seed reception ───────────────────────────────────────
await T('trash-cycle', async () => {
  await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-list', { full: true });
  const targets = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.innerText.trim() === "O'chirish").length);
  const names = await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+ova|[A-Z][a-z]+ [A-Z][a-z]+ov/g) || []).slice(0, 6));
  rec('receptions-before', { deleteButtons: targets, names, shot: await shot(P, p, TAG, 'receptions-with-delete', { full: true }) });
  since();
  await p.locator('button', { hasText: /^O'chirish$/ }).first().click();
  await p.waitForTimeout(2800);
  const confirmShot = await shot(P, p, TAG, 'reception-delete-dialog', { full: true });
  const confBtns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim().slice(0, 28)));
  // the confirm control inside the dialog
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Ha|Tasdiqlash|O'chirish|Ha, o'chirish)$/.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
  await p.waitForTimeout(5000);
  rec('reception-deleted', { confirmShot, confBtns, net: since(), after: await shot(P, p, TAG, 'receptions-after-delete', { full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(-300) });

  await goto(P, p, `${B}/admin/trash`, TAG, 'trash-receptions-tab', { full: true });
  await p.locator('button', { hasText: /Qabulxona/ }).first().click();
  await p.waitForTimeout(3500);
  const tb = (await text(p)).replace(/\n/g, ' | ');
  const restoreBtns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && /Tikla|Restore|Qaytar/i.test(b.innerText)).map((b) => b.innerText.trim().slice(0, 22)));
  rec('trash-listing', { restoreButtons: restoreBtns, shot: await shot(P, p, TAG, 'trash-reception-listed', { full: true }), body: tb.slice(-420) });
  since();
  if (restoreBtns.length) { await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /Tikla|Restore|Qaytar/i.test(x.innerText)); b[0].click(); }); await p.waitForTimeout(3000); }
  const conf2 = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Ha|Tasdiqlash|Tiklash)$/.test(x.innerText.trim())); if (b.length) { b[b.length - 1].click(); return true; } return false; });
  await p.waitForTimeout(5000);
  rec('restore', { confirmed: conf2, net: since(), shot: await shot(P, p, TAG, 'trash-after-restore', { full: true }) });

  await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-after-restore', { full: true });
  const afterNames = await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+ova|[A-Z][a-z]+ [A-Z][a-z]+ov/g) || []).slice(0, 6));
  const delCount = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.innerText.trim() === "O'chirish").length);
  rec('restore-verified', { namesAfter: afterNames, deleteButtons: delCount, shot: await shot(P, p, TAG, 'receptions-restored', { full: true }) });
});

save(P, 'p5g.json', out); await c.close(); await browser.close(); console.log('P5g DONE');
