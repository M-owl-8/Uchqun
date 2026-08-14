import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
const P = phase('P5'); const B = PORTALS.admin; const TAG = 'admin-tmm3'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5h', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url())) return; let b = ''; try { b = (await r.text()).slice(0, 250); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

// child detail: an imported child and a long-standing seed child
for (const [id, label] of [['0047fff7-b7f2-400c-aacc-f380a4b4dd31', 'imported'], ['5eed0c9a-fe3e-4031-8f5c-aac195c36b31', 'seed']]) {
  since();
  const f = await goto(P, p, `${B}/admin/children/${id}`, TAG, `D-41-child-detail-${label}`, { defect: 'D-41', full: true });
  const body = (await text(p)).replace(/\n/g, ' | ');
  rec(`child-detail-${label}`, {
    shot: f,
    heading: (body.match(/Orqaga \| ([^|]+)/) || [])[1]?.trim() ?? null,
    showsRawUuid: body.includes(id),
    irrError: /yuklab bo'lmadi|yuklab bolmadi/i.test(body),
    net: since().filter((n) => /children|irr|goals/.test(n.u)),
    tail: body.slice(-260),
  });
}

// trash cycle, apostrophe-agnostic
await T('trash-cycle', async () => {
  await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-for-trash', { full: true });
  const btns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && /chirish/i.test(b.innerText)).map((b) => b.innerText.trim()));
  const rows = await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+(ova|ov)\b/g) || []).slice(0, 8));
  rec('receptions-before', { deleteButtons: btns, rows, shot: await shot(P, p, TAG, 'receptions-before-delete', { full: true }) });
  since();
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /chirish/i.test(x.innerText)); if (b.length) b[0].click(); });
  await p.waitForTimeout(3000);
  const dlg = await shot(P, p, TAG, 'reception-delete-dialog', { full: true });
  const dlgBtns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim().slice(0, 30)));
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Ha|Tasdiqlash|Ha, o.chirish|O.chirish)$/i.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
  await p.waitForTimeout(5500);
  rec('deleted', { dlg, dlgBtns, net: since(), after: await shot(P, p, TAG, 'receptions-after-delete', { full: true }), rowsAfter: await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+(ova|ov)\b/g) || []).slice(0, 8)) });

  await goto(P, p, `${B}/admin/trash`, TAG, 'trash-open', { full: true });
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Qabulxona/.test(x.innerText)); if (b) b.click(); });
  await p.waitForTimeout(4000);
  const tb = (await text(p)).replace(/\n/g, ' | ');
  const restoreBtns = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && /Tikla|Restore|Qaytar/i.test(b.innerText)).map((b) => b.innerText.trim()));
  rec('trash-listing', { restoreButtons: restoreBtns, shot: await shot(P, p, TAG, 'trash-listing', { full: true }), tail: tb.slice(-420) });
  since();
  if (restoreBtns.length) {
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /Tikla|Restore|Qaytar/i.test(x.innerText)); b[0].click(); });
    await p.waitForTimeout(3000);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /^(Ha|Tasdiqlash|Tiklash)$/i.test(x.innerText.trim())); if (b.length) b[b.length - 1].click(); });
    await p.waitForTimeout(5500);
  }
  rec('restored', { net: since(), shot: await shot(P, p, TAG, 'trash-after-restore', { full: true }) });
  await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-after-restore', { full: true });
  rec('restore-verified', { rows: await p.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+(ova|ov)\b/g) || []).slice(0, 8)), shot: await shot(P, p, TAG, 'receptions-restored', { full: true }) });
});
save(P, 'p5h.json', out); await c.close(); await browser.close(); console.log('P5h DONE');
