// P3b v2 — R1 ACCOUNT PROVISIONING, retry with corrected selectors and
// full failure capture (response bodies + on-screen toast within 800ms).
import { newBrowser, ctx, login, shot, save, ev, text, PORTALS, PW, SIMPW } from './lib.mjs';

const SMM2 = '5334e23c-a749-4808-8b9a-1f8c67aa1938';
const REG_SAMARQAND = '00000000-0000-0000-0000-000000000002';
const b = await newBrowser(true);
const R = []; const dumps = {};

const DUMP = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return {
    ctl: [...document.querySelectorAll('input,select,textarea')].filter(vis).map((e, i) => ({
      i, tag: e.tagName, type: e.type || null, id: e.id || null, ph: e.placeholder || null,
      opts: e.tagName === 'SELECT' ? [...e.options].map(o => o.value + '::' + o.text).slice(0, 8) : null,
    })),
    btn: [...document.querySelectorAll('button')].filter(vis).map(e => (e.innerText || '').trim().slice(0, 40)),
  };
};
const TOAST = () => [...document.querySelectorAll('body *')]
  .filter(e => /toast|Toast|role="alert"/.test(e.className + ' ' + (e.getAttribute('role') || '')))
  .map(e => (e.innerText || '').trim()).filter(Boolean).slice(0, 5);

async function dump(p, k) { dumps[k] = await p.evaluate(DUMP); return dumps[k]; }
function rec(o) { R.push(o); ev({ kind: 'provision2', ...o }); console.log(JSON.stringify(o).slice(0, 500)); }

/** Click submit, grab the toast that appears immediately, then screenshot. */
async function submitAndCapture(p, role, btnLocator, label) {
  await btnLocator.click();
  await p.waitForTimeout(900);
  let toast = [];
  try { toast = await p.evaluate(TOAST); } catch { /* noop */ }
  const f = await shot(p, role, `${label}-immediately-after-submit`);
  await p.waitForTimeout(4000);
  const f2 = await shot(p, role, `${label}-4s-after-submit`);
  return { toast, shots: [f, f2] };
}

// ── 1. Government republic ───────────────────────────────────────────
{
  const { c, p } = await ctx(b, 'gov-republic');
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', PW, 'gov-republic');
  if (li.ok) {
    // 1a — region-secondary government account for Samarqand
    try {
      await p.goto(`${PORTALS.government}/government/platform`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3000);
      await p.locator('button', { hasText: 'Davlat foydalanuvchilari' }).first().click();
      await p.waitForTimeout(2000);
      await p.locator('select').nth(0).selectOption('region');
      await p.waitForTimeout(900);
      await p.locator('select').nth(1).selectOption('secondary');
      await p.waitForTimeout(1200);
      const nsel = await p.locator('select').count();
      if (nsel >= 3) await p.locator('select').nth(2).selectOption(REG_SAMARQAND);
      await p.locator('#ism').fill('SIM-Viloyat');
      await p.locator('#familiya').fill('Ikkinchi');
      await p.locator('input[type="password"]').first().fill(SIMPW);
      const cbs = p.locator('input[type="checkbox"]');
      for (let i = 0; i < await cbs.count(); i++) { try { await cbs.nth(i).check(); } catch { /* skip */ } }
      await dump(p, '1a-form');
      await shot(p, 'gov-republic', 'create-gov-region-secondary-filled');
      const r = await submitAndCapture(p, 'gov-republic', p.locator('button', { hasText: 'Hisob Yaratish' }).first(), 'create-gov-region-secondary');
      rec({ step: '1a', target: 'government / region / secondary', ...r });
    } catch (e) { rec({ step: '1a', error: e.message }); }

    // 1b — school director (admin) for smm2
    try {
      await p.goto(`${PORTALS.government}/government/platform`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3000);
      await p.locator('button', { hasText: 'Direktorlar' }).first().click();
      await p.waitForTimeout(2000);
      await p.locator('#ism').fill('SIM-Direktor');
      await p.locator('#familiya').fill('Beta');
      await p.locator('select').first().selectOption(SMM2);
      await p.waitForTimeout(700);
      await p.locator('input[placeholder="direktor"]').fill('sim.direktor');
      await p.locator('input[placeholder="Parol"]').fill(SIMPW);
      await p.locator('input[placeholder="Parolni tasdiqlang"]').fill(SIMPW);
      const r = await submitAndCapture(p, 'gov-republic', p.locator('button', { hasText: /^Yaratish$/ }).first(), 'create-admin');
      rec({ step: '1b', target: 'school director (admin) @smm2', ...r });
    } catch (e) { rec({ step: '1b', error: e.message }); }
  }
  await c.close();
}

// ── 2. Admin → reception ─────────────────────────────────────────────
{
  const { c, p } = await ctx(b, 'admin-smm2');
  const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, 'admin-smm2');
  if (li.ok) {
    try {
      await p.goto(`${PORTALS.admin}/admin/receptions`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
      await p.locator('button', { hasText: 'Qabul yaratish' }).first().click();
      await p.waitForTimeout(2500);
      const d = await dump(p, '2-modal');
      console.log('reception modal ctl=', JSON.stringify(d.ctl.map(x => [x.i, x.type, x.ph, x.id])));
      await shot(p, 'admin-smm2', 'create-reception-modal');
      const texts = p.locator('input[type="text"]:visible, input[type="email"]:visible');
      let idx = 0;
      for (let i = 0; i < await texts.count(); i++) {
        const el = texts.nth(i);
        const ph = (await el.getAttribute('placeholder')) || '';
        const ty = await el.getAttribute('type');
        if (/qidir|search/i.test(ph)) continue;
        if (ty === 'email') { await el.fill('sim.qabul@smm2.uz'); continue; }
        if (idx === 0) await el.fill('SIM-Qabul');
        else if (idx === 1) await el.fill('Beta');
        else await el.fill('sim.qabul');
        idx++;
      }
      const tel = p.locator('input[type="tel"]:visible');
      if (await tel.count()) await tel.first().fill('+998901112233');
      const pw = p.locator('input[type="password"]:visible');
      for (let i = 0; i < await pw.count(); i++) await pw.nth(i).fill(SIMPW);
      await shot(p, 'admin-smm2', 'create-reception-filled');
      const btn = p.locator('button', { hasText: /^Yaratish$|^Saqlash$|^Qo'shish$|^Qabul yaratish$/ }).last();
      const r = await submitAndCapture(p, 'admin-smm2', btn, 'create-reception');
      rec({ step: '2', target: 'reception @smm2', ...r });
    } catch (e) { rec({ step: '2', error: e.message }); }
  }
  await c.close();
}

// ── 3/4. Reception → teacher, then parent+child wizard ───────────────
{
  const { c, p } = await ctx(b, 'reception-smm2');
  const li = await login(p, 'reception', 'reception4@uchqun.uz', PW, 'reception-smm2');
  if (li.ok) {
    try {
      await p.goto(`${PORTALS.reception}/reception/teachers`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
      await p.locator('button', { hasText: "Tarbiyachi qo'shish" }).first().click();
      await p.waitForTimeout(2500);
      const texts = p.locator('input[type="text"]:visible');
      let idx = 0;
      for (let i = 0; i < await texts.count(); i++) {
        const ph = (await texts.nth(i).getAttribute('placeholder')) || '';
        if (/qidir/i.test(ph)) continue;
        if (idx === 0) await texts.nth(i).fill('SIM-Tarbiyachi');
        else if (idx === 1) await texts.nth(i).fill('Beta');
        else await texts.nth(i).fill('sim.tarbiyachi');
        idx++;
      }
      const tel = p.locator('input[type="tel"]:visible');
      if (await tel.count()) await tel.first().fill('+998901112244');
      await p.locator('input[type="password"]:visible').first().fill(SIMPW);
      await shot(p, 'reception-smm2', 'create-teacher-filled');
      const r = await submitAndCapture(p, 'reception-smm2', p.locator('button', { hasText: /^Yaratish$/ }).first(), 'create-teacher');
      rec({ step: '3', target: 'teacher @smm2', ...r });
    } catch (e) { rec({ step: '3', error: e.message }); }

    try {
      await p.goto(`${PORTALS.reception}/reception/parents/new`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
      // step 1 — parent
      {
        const texts = p.locator('input[type="text"]:visible');
        for (let i = 0; i < await texts.count(); i++) {
          const ph = (await texts.nth(i).getAttribute('placeholder')) || '';
          if (/AB 1234567/.test(ph)) { await texts.nth(i).fill('AB 7654321'); continue; }
          if (/hulkar/.test(ph)) { await texts.nth(i).fill('sim.otaona'); continue; }
          if (i === 0) await texts.nth(i).fill('SIM-Otaona');
          else if (i === 1) await texts.nth(i).fill('Beta');
        }
        await p.locator('input[type="tel"]:visible').first().fill('+998901112255');
        await p.locator('textarea:visible').first().fill('SIM- Samarqand shahri, beta manzil');
        await p.locator('select:visible').first().selectOption('uzbek').catch(() => {});
        await p.locator('input[type="password"]:visible').first().fill(SIMPW);
        await shot(p, 'reception-smm2', 'wizard-s1-parent-filled');
        await p.locator('button', { hasText: 'Davom etish' }).first().click();
        await p.waitForTimeout(3000);
      }
      // step 2 — child
      {
        const d = await dump(p, 'wizard-s2');
        console.log('wizard s2 ctl=', JSON.stringify(d.ctl.map(x => [x.i, x.type, x.ph, x.opts])));
        const texts = p.locator('input[type="text"]:visible');
        if (await texts.count() >= 2) {
          await texts.nth(0).fill('SIM-Bola');
          await texts.nth(1).fill('Beta');
        }
        const dt = p.locator('input[type="date"]:visible');
        if (await dt.count()) await dt.first().fill('2020-03-15');
        const g = p.locator('button', { hasText: /^Erkak$/ });
        if (await g.count()) await g.first().click();
        const sels = p.locator('select:visible');
        for (let i = 0; i < await sels.count(); i++) {
          const opts = await sels.nth(i).locator('option').all();
          for (const o of opts) {
            const v = await o.getAttribute('value');
            if (v) { await sels.nth(i).selectOption(v); break; }
          }
        }
        const ta = p.locator('textarea:visible');
        if (await ta.count()) await ta.first().fill('SIM- beta simulyatsiya yozuvi');
        await shot(p, 'reception-smm2', 'wizard-s2-child-filled');
        await p.locator('button', { hasText: 'Davom etish' }).first().click();
        await p.waitForTimeout(3000);
      }
      // step 3 — group assignment
      {
        const d = await dump(p, 'wizard-s3');
        console.log('wizard s3 ctl=', JSON.stringify(d.ctl.map(x => [x.i, x.type])), 'btn=', JSON.stringify(d.btn));
        const radios = p.locator('input[type="radio"]:visible');
        if (await radios.count()) await radios.first().check();
        await p.waitForTimeout(600);
        await shot(p, 'reception-smm2', 'wizard-s3-group-selected');
        const r = await submitAndCapture(p, 'reception-smm2', p.locator('button', { hasText: 'Yakunlash' }).first(), 'wizard-complete');
        rec({ step: '4', target: 'parent + child @smm2', ...r, body: (await text(p)).slice(0, 400) });
      }
    } catch (e) { rec({ step: '4', error: e.message }); }
  }
  await c.close();
}

save('p3b2-provision.json', { R, dumps });
await b.close();
console.log('P3b2 DONE');
