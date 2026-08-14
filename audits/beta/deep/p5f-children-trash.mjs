// P5f — where the imported children actually surface, what Trash covers, and a
// full delete -> Trash -> restore cycle on an entity Trash supports.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P5');
const B = PORTALS.admin;
const TAG = 'admin-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p5f', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 520)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const net = [];
p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 300); } catch { /* noop */ } net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };

await login(P, p, 'admin', 'direktor@tmm3.uz', PW, TAG);

// ── the imported children, under their parent ─────────────────────────────
await T('imported-children-visible', async () => {
  await goto(P, p, `${B}/admin/parents`, TAG, 'parents-list', { full: true });
  const s = p.locator('input[type="text"], input[type="search"]').first();
  if (await s.count()) { await s.fill('otaona11'); await p.waitForTimeout(3500); }
  const listed = await shot(P, p, TAG, 'parents-filtered', { full: true });
  const row = p.locator('button, li, tr, div[role="button"]').filter({ hasText: /Rayhona|otaona11/ }).first();
  let detail = null; let childLinks = [];
  if (await row.count()) {
    await row.click(); await p.waitForTimeout(4000);
    detail = await shot(P, p, TAG, 'parent-detail-with-children', { full: true });
    childLinks = await p.evaluate(() => [...document.querySelectorAll('a[href^="/admin/children/"]')].map((a) => ({ href: a.getAttribute('href'), text: (a.innerText || '').trim().slice(0, 34) })));
  }
  const body = (await text(p)).replace(/\n/g, ' | ');
  rec('imported-children-visible', { listed, detail, childLinks, simFound: (body.match(/SIM-[A-Za-z]+/g) || []).slice(0, 6), body: body.slice(0, 420) });
  if (childLinks.length) {
    const f = await goto(P, p, B + childLinks[0].href, TAG, 'admin-child-detail', { full: true });
    rec('child-detail', { href: childLinks[0].href, shot: f, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 320) });
  }
});

// ── what does Trash actually cover? ───────────────────────────────────────
await T('trash-scope', async () => {
  await goto(P, p, `${B}/admin/trash`, TAG, 'trash-scope', { full: true });
  const tabs = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => (b.innerText || '').trim()).filter(Boolean));
  rec('trash-scope', { tabs, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 400), shot: await shot(P, p, TAG, 'trash-tabs', { full: true }) });
});

// ── create a reception, delete it, find it in Trash, restore it ───────────
await T('trash-cycle-reception', async () => {
  await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-before', { full: true });
  const d = await p.evaluate(DUMP);
  rec('receptions-controls', { buttons: d.buttons.slice(0, 16), inputs: d.inputs.slice(0, 10) });

  // create
  const add = p.locator('button').filter({ hasText: /Qo'shish|Yangi|Yaratish/i });
  if (await add.count()) {
    await add.first().click(); await p.waitForTimeout(2600);
    const modal = await shot(P, p, TAG, 'reception-create-modal', { full: true });
    await p.evaluate(() => {
      const set = (el, v) => { const pr = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(pr.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      for (const e of [...document.querySelectorAll('input,select,textarea')].filter((x) => x.offsetParent && x.type !== 'file')) {
        if (e.tagName === 'SELECT') { const o = [...e.options].map((x) => x.value).filter(Boolean); if (o.length) set(e, o[0]); }
        else if (e.type === 'email') set(e, 'sim.tekshiruv@tmm3.uz');
        else if (e.type === 'tel') set(e, '+998901000188');
        else if (e.type === 'password') set(e, 'SimTest@2026');
        else if (e.type === 'date') set(e, '1995-04-04');
        else set(e, 'SIM-Tekshiruv');
      }
    });
    await p.waitForTimeout(800);
    const filled = await shot(P, p, TAG, 'reception-create-filled', { full: true });
    since();
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /Saqlash|Yaratish|Qo'shish/.test(x.innerText) && !x.disabled); if (b.length) b[b.length - 1].click(); });
    await p.waitForTimeout(6000);
    rec('reception-create', { modal, filled, net: since(), after: await shot(P, p, TAG, 'reception-create-result', { full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 300) });
  }

  // delete it
  await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-after-create', { full: true });
  const s = p.locator('input[type="text"], input[type="search"]').first();
  if (await s.count()) { await s.fill('SIM-'); await p.waitForTimeout(3000); }
  const present = (await text(p)).includes('SIM-Tekshiruv');
  const target = p.locator('*').filter({ hasText: /SIM-Tekshiruv/ }).last();
  if (await target.count()) { await target.click().catch(() => {}); await p.waitForTimeout(3000); }
  const selected = await shot(P, p, TAG, 'reception-selected', { full: true });
  const delBtn = p.locator('button').filter({ hasText: /O'chir/i });
  const delLabels = await delBtn.evaluateAll((e) => e.map((b) => b.innerText.trim().slice(0, 24)));
  since();
  if (await delBtn.count()) { await delBtn.first().click(); await p.waitForTimeout(2500); }
  const confirmShot = await shot(P, p, TAG, 'reception-delete-confirm', { full: true });
  const conf = p.locator('button').filter({ hasText: /^(Ha|Tasdiqlash|O'chirish|O'chirib tashlash)$/ });
  if (await conf.count()) { await conf.last().click(); await p.waitForTimeout(5000); }
  rec('reception-delete', { present, selected, delLabels, confirmShot, net: since(), after: await shot(P, p, TAG, 'reception-after-delete', { full: true }) });

  // find in trash and restore
  await goto(P, p, `${B}/admin/trash`, TAG, 'trash-with-deleted-reception', { full: true });
  const recTab = p.locator('button', { hasText: /Qabulxona/ });
  if (await recTab.count()) { await recTab.first().click(); await p.waitForTimeout(3000); }
  const trashBody = (await text(p)).replace(/\n/g, ' | ');
  const inTrash = trashBody.includes('SIM-Tekshiruv');
  const restore = p.locator('button').filter({ hasText: /Tikla|Restore|Qaytar/i });
  const restoreLabels = await restore.evaluateAll((e) => e.map((b) => b.innerText.trim().slice(0, 20)));
  since();
  if (await restore.count()) { await restore.first().click(); await p.waitForTimeout(5000); }
  rec('trash-restore', { inTrash, trashBody: trashBody.slice(0, 400), restoreLabels, net: since(), shot: await shot(P, p, TAG, 'trash-restore-clicked', { full: true }) });

  await goto(P, p, `${B}/admin/receptions`, TAG, 'receptions-after-restore', { full: true });
  const s2 = p.locator('input[type="text"], input[type="search"]').first();
  if (await s2.count()) { await s2.fill('SIM-'); await p.waitForTimeout(3000); }
  rec('restore-verified', { backInList: (await text(p)).includes('SIM-Tekshiruv'), shot: await shot(P, p, TAG, 'reception-restored', { full: true }) });
});

save(P, 'p5f.json', out);
await c.close();
await browser.close();
console.log('P5f DONE');
