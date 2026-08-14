import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';
const P = phase('P3'); const B = PORTALS.teacher; const TAG = 'teacher-tmm3'; const CH = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';
const out = {}; const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3j', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 190); } catch {} net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };
const fillAll = (d) => p.evaluate((dv) => { const set = (el, v) => { const pr = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(pr.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }; const s = []; for (const e of [...document.querySelectorAll('input,select,textarea')].filter((x) => x.offsetParent && x.type !== 'file')) { if (e.tagName === 'SELECT') { const o = [...e.options].map((x) => x.value).filter(Boolean); if (o.length) set(e, o[0]); } else if (e.type === 'date') set(e, dv); else if (e.type === 'time') set(e, '10:00'); else if (e.type === 'number') set(e, '30'); else if (e.type === 'checkbox' || e.type === 'radio') { if (!e.checked) e.click(); } else set(e, 'QA-P3J tekshiruv'); s.push(`${e.tagName}:${e.type || ''}`); } return s; }, d);
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);

await T('therapy-assign', async () => {
  await goto(P, p, `${B}/teacher/reja?tab=therapy`, TAG, 'therapy-assign-open', { full: true });
  await p.locator('button', { hasText: /^Tayinlash$/ }).first().click();
  await p.waitForTimeout(3000);
  const modal = await shot(P, p, TAG, 'therapy-assign-modal', { full: true });
  const fields = await fillAll('2026-08-14');
  const filled = await shot(P, p, TAG, 'therapy-assign-filled', { full: true });
  since();
  const sub = await p.locator('button[type="submit"]:visible, button:visible').evaluateAll((e) => e.map((b) => b.innerText.trim()).filter(Boolean));
  await p.locator('button', { hasText: /^(Tayinlash|Saqlash|Yaratish)$/ }).last().click().catch(() => {});
  await p.waitForTimeout(5000);
  rec('therapy-assign', { modal, fields, filled, modalButtons: sub.slice(0, 12), net: since(), after: await shot(P, p, TAG, 'therapy-assign-result', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|xato[^\n]*|majburiy[^\n]*)/i) || [])[0] ?? null });
});

await T('journal-composer', async () => {
  await goto(P, p, `${B}/teacher/men?tab=reflection`, TAG, 'journal-composer-page', { full: true });
  const d = await p.evaluate(DUMP);
  const fields = await fillAll('2026-08-14');
  const filled = await shot(P, p, TAG, 'journal-composer-filled', { full: true });
  since();
  const b = p.locator('button', { hasText: /Yubor|Saqla|Joyla|Qo'sh/i });
  const labels = await b.evaluateAll((e) => e.map((x) => x.innerText.trim()));
  if (await b.count()) { await b.first().click(); await p.waitForTimeout(5000); }
  rec('journal-composer', { pageButtons: d.buttons.slice(0, 16), fields, filled, actionLabels: labels, net: since(), after: await shot(P, p, TAG, 'journal-composer-result', { full: true }) });
});

await T('irr-sections', async () => {
  await goto(P, p, `${B}/teacher/children/${CH}/irr`, TAG, 'irr-sections', { full: true });
  const secs = await p.evaluate(() => [...document.querySelectorAll('button,h2,h3')].map((e) => (e.innerText || '').trim()).filter((t) => t && t.length < 44));
  rec('irr-sections', { sections: [...new Set(secs)].slice(0, 30) });
  const m = p.locator('button', { hasText: /Oylik/i });
  if (await m.count()) { await m.first().click({ timeout: 8000 }).catch(() => {}); await p.waitForTimeout(3000); rec('milestones-open', { shot: await shot(P, p, TAG, 'irr-monthly-milestones', { full: true }) }); }
});

await T('pref-persist', async () => {
  await goto(P, p, `${B}/teacher/men?tab=settings`, TAG, 'pref-before', { full: true });
  const cb = p.locator('input[type="checkbox"]').first();
  const before = await cb.isChecked();
  await cb.click({ force: true }); await p.waitForTimeout(800);
  const toggled = await cb.isChecked();
  since();
  const save1 = p.locator('button', { hasText: /^Saqlash$/ });
  const saveCount = await save1.count();
  if (saveCount) { await save1.first().click(); await p.waitForTimeout(4500); }
  const afterSave = since();
  const shotA = await shot(P, p, TAG, 'pref-after-save', { full: true });
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  const afterReload = await p.locator('input[type="checkbox"]').first().isChecked();
  rec('pref-persist', { before, toggled, saveButtons: saveCount, net: afterSave, shotA, afterReload, persisted: afterReload === toggled, shotB: await shot(P, p, TAG, 'pref-after-reload', { full: true }) });
});

save(P, 'p3j.json', out); await c.close(); await browser.close(); console.log('P3j DONE');
