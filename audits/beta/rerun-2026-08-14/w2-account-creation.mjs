// W2 — D-02: create a real director, reception, teacher and parent+child through
// the product UI on the deployed build, then witness each first login.
import { newBrowser, ctx, login, shot, goto, save, ev, text, PORTALS, PW, OLDPW } from './lib.mjs';

const NEW = 'Uchqun@2026';
const out = {};
const b = await newBrowser(false);
function rec(k, v) { out[k] = v; ev({ kind: 'w2', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); }

async function toast(p) {
  try {
    return await p.evaluate(() => [...document.querySelectorAll('div')]
      .filter((e) => /Validation failed|muvaffaqiyat|yaratildi|xatolik|saqlandi|Yaratildi/i.test(e.innerText || '') && (e.innerText || '').length < 160)
      .map((e) => e.innerText.trim())[0] || null);
  } catch { return null; }
}

// ── 1. Government republic creates a school director for the new school tmm3 ──
let createdAdminEmail = null;
{
  const tag = 'gov-republic';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', OLDPW, tag);
  rec('login-gov', li);
  if (li.ok) {
    await goto(p, `${PORTALS.government}/government/platform`, tag, 'platform-direktorlar');
    await p.locator('button', { hasText: 'Direktorlar' }).first().click();
    await p.waitForTimeout(2500);
    await p.locator('#ism').fill('Shahnoza');
    await p.locator('#familiya').fill('Qurbonova');
    // pick the seeded Toshkent school by visible label
    const sel = p.locator('select').first();
    const opts = await sel.locator('option').allTextContents();
    const target = opts.find((o) => /3-sonli ixtisoslashtirilgan/.test(o));
    await sel.selectOption({ label: target });
    await p.waitForTimeout(800);
    await p.locator('input[placeholder="direktor"]').fill('sh.qurbonova');
    await p.locator('input[placeholder="Parol"]').fill(NEW);
    await p.locator('input[placeholder="Parolni tasdiqlang"]').fill(NEW);
    rec('D-02-admin-form', { shot: await shot(p, tag, 'create-director-filled', { defect: 'D-02' }), school: target });
    await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
    await p.waitForTimeout(1500);
    const t1 = await toast(p);
    const s1 = await shot(p, tag, 'create-director-result', { defect: 'D-02' });
    await p.waitForTimeout(4000);
    const s2 = await shot(p, tag, 'create-director-list', { defect: 'D-02', full: true });
    createdAdminEmail = 'sh.qurbonova@tmm3.uz';
    rec('D-02-admin-created', { toast: t1, shots: [s1, s2], visibleInList: (await text(p)).includes('sh.qurbonova@tmm3.uz') });
  }
  await c.close();
}

// ── 2. Director creates a reception ─────────────────────────────────────────
{
  const tag = 'director-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'admin', 'direktor@tmm3.uz', PW, tag);
  rec('login-director', li);
  if (li.ok) {
    await goto(p, `${PORTALS.admin}/admin/receptions`, tag, 'receptions-before');
    await p.locator('button', { hasText: 'Qabul yaratish' }).first().click();
    await p.waitForTimeout(2500);
    const form = p.locator('form').first();
    const texts = form.locator('input[type="text"]');
    await texts.nth(0).fill('Kamola');
    await texts.nth(1).fill('Yusupova');
    await texts.nth(2).fill('k.yusupova');
    await form.locator('input[type="password"]').first().fill(NEW);
    const tel = form.locator('input[type="tel"]');
    if (await tel.count()) await tel.first().fill('+998901234501');
    rec('D-02-reception-form', { shot: await shot(p, tag, 'create-reception-filled', { defect: 'D-02' }) });
    await form.locator('button[type="submit"]').first().click();
    await p.waitForTimeout(1500);
    const t1 = await toast(p);
    const s1 = await shot(p, tag, 'create-reception-result', { defect: 'D-02' });
    await p.waitForTimeout(4500);
    const s2 = await shot(p, tag, 'create-reception-list', { defect: 'D-02', full: true });
    rec('D-02-reception-created', { toast: t1, shots: [s1, s2], visibleInList: (await text(p)).includes('k.yusupova@tmm3.uz') });
  }
  await c.close();
}

// ── 3. Reception creates a teacher ──────────────────────────────────────────
{
  const tag = 'reception-tmm3';
  const { c, p } = await ctx(b, tag);
  const li = await login(p, 'reception', 'qabul@tmm3.uz', PW, tag);
  rec('login-reception', li);
  if (li.ok) {
    await goto(p, `${PORTALS.reception}/reception/teachers`, tag, 'teachers-before');
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
    // D-15 witness: the domain chip must now read @tmm3.uz, not @tmm3
    rec('D-15-domain-chip', { shot: await shot(p, tag, 'create-teacher-filled-domain-chip', { defect: 'D-15' }) });
    await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
    await p.waitForTimeout(1500);
    const t1 = await toast(p);
    const s1 = await shot(p, tag, 'create-teacher-result', { defect: 'D-02' });
    await p.waitForTimeout(4500);
    const s2 = await shot(p, tag, 'create-teacher-list', { defect: 'D-02', full: true });
    rec('D-02-teacher-created', { toast: t1, shots: [s1, s2], visibleInList: (await text(p)).includes('g.saidova@tmm3.uz') });

    // ── 4. Reception enrols a parent + child through the 3-step wizard ───────
    await goto(p, `${PORTALS.reception}/reception/parents/new`, tag, 'wizard-step1');
    {
      const tt = p.locator('input[type="text"]:visible');
      for (let k = 0; k < await tt.count(); k++) {
        const ph = (await tt.nth(k).getAttribute('placeholder')) || '';
        if (/AB 1234567/.test(ph)) { await tt.nth(k).fill('AC 4471203'); continue; }
        if (/hulkar/.test(ph)) { await tt.nth(k).fill('m.rahimova'); continue; }
        if (k === 0) await tt.nth(k).fill('Mavluda');
        else if (k === 1) await tt.nth(k).fill('Rahimova');
      }
      await p.locator('input[type="tel"]:visible').first().fill('+998901234503');
      await p.locator('textarea:visible').first().fill('Toshkent shahri, Chinor ko‘chasi 24-uy');
      await p.locator('select:visible').first().selectOption('uzbek').catch(() => {});
      await p.locator('input[type="password"]:visible').first().fill(NEW);
      rec('D-02-wizard-s1', { shot: await shot(p, tag, 'wizard-s1-parent-filled', { defect: 'D-02' }) });
      await p.locator('button', { hasText: 'Davom etish' }).first().click();
      await p.waitForTimeout(3000);
    }
    {
      const tt = p.locator('input[type="text"]:visible');
      await tt.nth(0).fill('Ozoda');
      await tt.nth(1).fill('Rahimova');
      const dt = p.locator('input[type="date"]:visible');
      if (await dt.count()) await dt.first().fill('2019-04-12');
      const g = p.locator('button', { hasText: /^Ayol$/ });
      if (await g.count()) await g.first().click();
      const sels = p.locator('select:visible');
      for (let k = 0; k < await sels.count(); k++) {
        const vals = await sels.nth(k).locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
        if (vals.length) await sels.nth(k).selectOption(vals[0]);
      }
      const ta = p.locator('textarea:visible');
      if (await ta.count()) await ta.first().fill('Nutq rivojlanishida qo‘llab-quvvatlash talab etiladi.');
      rec('D-02-wizard-s2', { shot: await shot(p, tag, 'wizard-s2-child-filled', { defect: 'D-02' }) });
      await p.locator('button', { hasText: 'Davom etish' }).first().click();
      await p.waitForTimeout(3000);
    }
    {
      const radios = p.locator('input[type="radio"]:visible');
      if (await radios.count()) await radios.first().check();
      await p.waitForTimeout(600);
      rec('D-02-wizard-s3', { shot: await shot(p, tag, 'wizard-s3-group-selected', { defect: 'D-02' }) });
      await p.locator('button', { hasText: 'Yakunlash' }).first().click();
      await p.waitForTimeout(1500);
      const t1 = await toast(p);
      const s1 = await shot(p, tag, 'wizard-result', { defect: 'D-02' });
      await p.waitForTimeout(5000);
      const s2 = await shot(p, tag, 'wizard-complete', { defect: 'D-02', full: true });
      rec('D-02-parent-created', { toast: t1, shots: [s1, s2], body: (await text(p)).slice(0, 500) });
    }
    await goto(p, `${PORTALS.reception}/reception/parents`, tag, 'parents-list-after', { defect: 'D-02', full: true });
    rec('D-02-parent-in-list', { visible: (await text(p)).includes('Rahimova') });
  }
  await c.close();
}

// ── 5. First login for each newly created account ───────────────────────────
for (const a of [
  { tag: 'new-director', portal: 'admin', email: 'sh.qurbonova@tmm3.uz' },
  { tag: 'new-reception', portal: 'reception', email: 'k.yusupova@tmm3.uz' },
  { tag: 'new-teacher', portal: 'teacher', email: 'g.saidova@tmm3.uz' },
  { tag: 'new-parent', portal: 'parent', email: 'm.rahimova@tmm3.uz', tab: /Ota-ona|Parent/i },
]) {
  const { c, p } = await ctx(b, a.tag);
  const li = await login(p, a.portal, a.email, NEW, a.tag, { tab: a.tab });
  const f = await shot(p, a.tag, 'first-login-landing', { defect: 'D-02' });
  rec(`D-02-first-login-${a.tag}`, { ok: li.ok, landing: li.landing, shot: f, head: (await text(p)).slice(0, 220) });
  await c.close();
}

save('w2-account-creation.json', out);
await b.close();
console.log('W2 DONE');
