// W2b — re-witness the two D-02 paths that were still blocked before 487587e3:
// reception → teacher, and government → director that can actually log in.
// Also witnesses the reception activation gate through the director's UI.
import { newBrowser, ctx, login, shot, goto, save, ev, text, PORTALS, PW, OLDPW } from './lib.mjs';

const NEW = 'Uchqun@2026';
const out = {};
const b = await newBrowser(false);
function rec(k, v) { out[k] = v; ev({ kind: 'w2b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 320)); }
const toast = async (p) => {
  try {
    return await p.evaluate(() => [...document.querySelectorAll('div')]
      .filter((e) => /yaratildi|muvaffaqiyat|xatolik|Validation|faollashtir/i.test(e.innerText || '') && (e.innerText || '').length < 200)
      .map((e) => e.innerText.trim().replace(/\n+/g, ' '))[0] || null);
  } catch { return null; }
};

// ── reception creates a teacher ─────────────────────────────────────────────
{
  const tag = 'reception-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'reception', 'qabul@tmm3.uz', PW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.reception}/reception/teachers`, tag, 'teachers-before-create');
    await p.locator('button', { hasText: "Tarbiyachi qo'shish" }).first().click();
    await p.waitForTimeout(2500);
    const texts = p.locator('input[type="text"]:visible');
    let i = 0;
    for (let k = 0; k < await texts.count(); k++) {
      const ph = (await texts.nth(k).getAttribute('placeholder')) || '';
      if (/qidir/i.test(ph)) continue;
      if (i === 0) await texts.nth(k).fill('Gulnora');
      else if (i === 1) await texts.nth(k).fill('Saidova');
      else await texts.nth(k).fill('g.saidova');
      i++;
    }
    const tel = p.locator('input[type="tel"]:visible');
    if (await tel.count()) await tel.first().fill('+998901234502');
    await p.locator('input[type="password"]:visible').first().fill(NEW);
    rec('D-15-domain-chip', { shot: await shot(p, tag, 'teacher-form-domain-chip', { defect: 'D-15' }) });
    await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
    await p.waitForTimeout(1800);
    const t1 = await toast(p);
    const s1 = await shot(p, tag, 'create-teacher-result', { defect: 'D-02' });
    await p.waitForTimeout(4500);
    const s2 = await shot(p, tag, 'create-teacher-list', { defect: 'D-02', full: true });
    rec('D-02-teacher-created', { toast: t1, shots: [s1, s2], visibleInList: (await text(p)).includes('g.saidova@tmm3.uz') });
  }
  await c.close();
}

// ── government creates a second director (post-fix) ─────────────────────────
{
  const tag = 'gov-republic';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', OLDPW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.government}/government/platform`, tag, 'platform-direktorlar');
    await p.locator('button', { hasText: 'Direktorlar' }).first().click();
    await p.waitForTimeout(2500);
    await p.locator('#ism').fill('Dilshod');
    await p.locator('#familiya').fill('Ergashev');
    const sel = p.locator('select').first();
    const opts = await sel.locator('option').allTextContents();
    await sel.selectOption({ label: opts.find((o) => /Urgut tumani/.test(o)) });
    await p.waitForTimeout(800);
    await p.locator('input[placeholder="direktor"]').fill('d.ergashev');
    await p.locator('input[placeholder="Parol"]').fill(NEW);
    await p.locator('input[placeholder="Parolni tasdiqlang"]').fill(NEW);
    rec('D-02-director2-form', { shot: await shot(p, tag, 'create-director2-filled', { defect: 'D-02' }) });
    await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
    await p.waitForTimeout(1800);
    const t1 = await toast(p);
    const s1 = await shot(p, tag, 'create-director2-result', { defect: 'D-02' });
    await p.waitForTimeout(4000);
    rec('D-02-director2-created', { toast: t1, shot: s1 });
  }
  await c.close();
}

// ── first logins ────────────────────────────────────────────────────────────
for (const a of [
  { tag: 'new-teacher', portal: 'teacher', email: 'g.saidova@tmm3.uz' },
  { tag: 'new-director2', portal: 'admin', email: 'd.ergashev@smm4.uz' },
]) {
  const { c, p } = await ctx(b, a.tag);
  const li = await login(p, a.portal, a.email, NEW, a.tag);
  const f = await shot(p, a.tag, 'first-login-landing', { defect: 'D-02' });
  rec(`D-02-first-login-${a.tag}`, { ok: li.ok, landing: li.landing, shot: f, head: (await text(p)).slice(0, 260) });
  await c.close();
}

// ── the reception activation gate, through the director's own UI ────────────
{
  const tag = 'director-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'admin', 'direktor@tmm3.uz', PW, tag);
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin/receptions`, tag, 'receptions-activation-state', { full: true });
    const body = await text(p);
    let acted = null;
    try {
      const row = p.locator('tr', { hasText: 'Yusupova' }).first();
      await row.locator('button, a').last().click();
      await p.waitForTimeout(2500);
      acted = await shot(p, tag, 'reception-detail-activation-controls', { defect: 'D-17', full: true });
      const act = p.locator('button', { hasText: /Faollashtirish|Tasdiqlash|Aktiv/i });
      if (await act.count()) {
        await act.first().click();
        await p.waitForTimeout(2500);
        const conf = p.locator('button', { hasText: /Faollashtirish|Ha|Tasdiqlash/i }).last();
        await conf.click().catch(() => {});
        await p.waitForTimeout(4000);
        acted = await shot(p, tag, 'reception-activated', { defect: 'D-17', full: true });
      }
    } catch (e) { rec('D-17-activate-err', e.message); }
    rec('D-17-reception-activation', { shot: acted, hasPendingLabel: /Tasdiqlash kutilmoqda|Faol emas/.test(body) });
  }
  await c.close();
}
{
  const { c, p } = await ctx(b, 'new-reception');
  const li = await login(p, 'reception', 'k.yusupova@tmm3.uz', NEW, 'new-reception');
  const f = await shot(p, 'new-reception', 'first-login-after-activation', { defect: 'D-17' });
  rec('D-17-reception-login-after', { ok: li.ok, landing: li.landing, shot: f, head: (await text(p)).slice(0, 220) });
  await c.close();
}

save('w2b-account-creation.json', out);
await b.close();
console.log('W2b DONE');
