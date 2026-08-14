// P3b — R1 ACCOUNT PROVISIONING. WRITE PHASE. Target tenant: smm2 only.
// Every created account carries the literal "SIM-" prefix in its first name.
import { newBrowser, ctx, login, shot, save, ev, text, PORTALS, PW, SIMPW } from './lib.mjs';

const SMM2 = '5334e23c-a749-4808-8b9a-1f8c67aa1938';
const b = await newBrowser(true);
const R = [];
const dumps = {};

const DUMP = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return {
    ctl: [...document.querySelectorAll('input,select,textarea')].filter(vis).map((e, i) => ({
      i, tag: e.tagName, type: e.type || null, id: e.id || null, ph: e.placeholder || null,
      opts: e.tagName === 'SELECT' ? [...e.options].map(o => o.value + '::' + o.text).slice(0, 8) : null,
    })),
    btn: [...document.querySelectorAll('button')].filter(vis).map(e => (e.innerText || '').trim().slice(0, 40)),
    toast: [...document.querySelectorAll('[role=alert],[class*=toast],[class*=Toast]')].map(e => (e.innerText || '').trim().slice(0, 200)),
  };
};

async function dump(p, key) { dumps[key] = await p.evaluate(DUMP); return dumps[key]; }

function rec(o) { R.push(o); ev({ kind: 'provision', ...o }); console.log(JSON.stringify(o)); }

// ─────────────────────────────────────────────────────────────────────
// 1. Government republic → Platform
// ─────────────────────────────────────────────────────────────────────
{
  const { c, p } = await ctx(b, 'gov-republic');
  const li = await login(p, 'government', 'gov.republic@uchqun.uz', PW, 'gov-republic');
  if (li.ok) {
    // ---- 1a. Government users tab → region-secondary account for Samarqand
    try {
      await p.goto(`${PORTALS.government}/government/platform`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3000);
      await p.locator('button', { hasText: 'Davlat foydalanuvchilari' }).first().click();
      await p.waitForTimeout(2000);
      const sels = p.locator('select');
      await sels.nth(0).selectOption('region');       // Hisob darajasi
      await p.waitForTimeout(800);
      await sels.nth(1).selectOption('secondary');    // Hisob turi
      await p.waitForTimeout(1200);
      await dump(p, 'gov-create-after-level');
      // region select appears once level=region
      const selCount = await sels.count();
      if (selCount >= 3) {
        await sels.nth(2).selectOption({ label: /Samarqand/ });
      }
      await p.locator('#ism').fill('SIM-Viloyat');
      await p.locator('#familiya').fill('Ikkinchi');
      await p.locator('input[type="password"]').first().fill(SIMPW);
      // secondary accounts expose access-grant checkboxes — tick all
      const cbs = p.locator('input[type="checkbox"]');
      const n = await cbs.count();
      for (let i = 0; i < n; i++) { try { await cbs.nth(i).check(); } catch { /* skip */ } }
      await shot(p, 'gov-republic', 'create-gov-region-secondary-form');
      await p.locator('button', { hasText: 'Hisob Yaratish' }).first().click();
      await p.waitForTimeout(5000);
      const f = await shot(p, 'gov-republic', 'create-gov-region-secondary-result');
      await dump(p, 'gov-create-region-secondary-result');
      rec({ step: '1a', target: 'government region secondary', shot: f, body: (await text(p)).slice(0, 300) });
    } catch (e) { rec({ step: '1a', error: e.message }); }

    // ---- 1b. Direktorlar tab → school director (admin) for smm2
    try {
      await p.goto(`${PORTALS.government}/government/platform`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3000);
      await p.locator('button', { hasText: 'Direktorlar' }).first().click();
      await p.waitForTimeout(2000);
      await p.locator('#ism').fill('SIM-Direktor');
      await p.locator('#familiya').fill('Beta');
      await p.locator('select').first().selectOption(SMM2);
      await p.waitForTimeout(800);
      await p.locator('input[placeholder="direktor"]').fill('sim.direktor');
      await p.locator('input[placeholder="Parol"]').fill(SIMPW);
      await p.locator('input[placeholder="Parolni tasdiqlang"]').fill(SIMPW);
      await shot(p, 'gov-republic', 'create-admin-form');
      await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
      await p.waitForTimeout(6000);
      const f = await shot(p, 'gov-republic', 'create-admin-result');
      await dump(p, 'gov-create-admin-result');
      rec({ step: '1b', target: 'school director (admin) @smm2', shot: f, body: (await text(p)).slice(0, 400) });
    } catch (e) { rec({ step: '1b', error: e.message }); }
  } else rec({ step: '1', error: 'gov login failed' });
  await c.close();
}

// ─────────────────────────────────────────────────────────────────────
// 2. Admin (existing admin4 @smm2) → create reception
// ─────────────────────────────────────────────────────────────────────
{
  const { c, p } = await ctx(b, 'admin-smm2');
  const li = await login(p, 'admin', 'admin4@uchqun.uz', PW, 'admin-smm2');
  if (li.ok) {
    try {
      await p.goto(`${PORTALS.admin}/admin/receptions`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
      await p.locator('button', { hasText: 'Qabul yaratish' }).first().click();
      await p.waitForTimeout(2500);
      await dump(p, 'admin-reception-modal');
      await shot(p, 'admin-smm2', 'create-reception-modal-open');
      const inputs = p.locator('input:visible');
      const meta = dumps['admin-reception-modal'].ctl;
      // fill by discovered order: text fields then email/local part then password
      for (const c2 of meta) {
        const loc = inputs.nth(c2.i);
        if (c2.type === 'password') { await loc.fill(SIMPW); continue; }
        if (c2.type === 'tel') { await loc.fill('+998901112233'); continue; }
        if (c2.type === 'search') continue;
        if (c2.type === 'checkbox') continue;
        if (c2.type === 'email') { await loc.fill('sim.qabul@smm2.uz'); continue; }
        if (c2.tag === 'INPUT' && c2.type === 'text') {
          if (c2.ph && /qidir/i.test(c2.ph)) continue;
          await loc.fill('');
        }
      }
      // named fills — first two visible non-search text inputs are Ism / Familiya
      const texts = p.locator('input[type="text"]:visible');
      const tn = await texts.count();
      let idx = 0;
      for (let i = 0; i < tn; i++) {
        const ph = await texts.nth(i).getAttribute('placeholder');
        if (ph && /qidir/i.test(ph)) continue;
        if (idx === 0) await texts.nth(i).fill('SIM-Qabul');
        else if (idx === 1) await texts.nth(i).fill('Beta');
        else if (idx === 2) await texts.nth(i).fill('sim.qabul');
        idx++;
      }
      await shot(p, 'admin-smm2', 'create-reception-filled');
      await p.locator('button', { hasText: /^Yaratish$|^Saqlash$|^Qo'shish$/ }).first().click();
      await p.waitForTimeout(6000);
      const f = await shot(p, 'admin-smm2', 'create-reception-result');
      await dump(p, 'admin-reception-result');
      rec({ step: '2', target: 'reception @smm2', shot: f, body: (await text(p)).slice(0, 400) });
    } catch (e) { rec({ step: '2', error: e.message }); }
  } else rec({ step: '2', error: 'admin login failed' });
  await c.close();
}

// ─────────────────────────────────────────────────────────────────────
// 3. Reception → create teacher
// ─────────────────────────────────────────────────────────────────────
{
  const { c, p } = await ctx(b, 'reception-smm2');
  const li = await login(p, 'reception', 'reception4@uchqun.uz', PW, 'reception-smm2');
  if (li.ok) {
    try {
      await p.goto(`${PORTALS.reception}/reception/teachers`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
      await p.locator('button', { hasText: "Tarbiyachi qo'shish" }).first().click();
      await p.waitForTimeout(2500);
      await dump(p, 'reception-teacher-modal');
      const texts = p.locator('input[type="text"]:visible');
      const tn = await texts.count();
      let idx = 0;
      for (let i = 0; i < tn; i++) {
        const ph = await texts.nth(i).getAttribute('placeholder');
        if (ph && /qidir/i.test(ph)) continue;
        if (idx === 0) await texts.nth(i).fill('SIM-Tarbiyachi');
        else if (idx === 1) await texts.nth(i).fill('Beta');
        else if (idx === 2) await texts.nth(i).fill('sim.tarbiyachi');
        idx++;
      }
      const tel = p.locator('input[type="tel"]:visible');
      if (await tel.count()) await tel.first().fill('+998901112244');
      await p.locator('input[type="password"]:visible').first().fill(SIMPW);
      await shot(p, 'reception-smm2', 'create-teacher-filled');
      await p.locator('button', { hasText: /^Yaratish$/ }).first().click();
      await p.waitForTimeout(6000);
      const f = await shot(p, 'reception-smm2', 'create-teacher-result');
      await dump(p, 'reception-teacher-result');
      rec({ step: '3', target: 'teacher @smm2', shot: f, body: (await text(p)).slice(0, 400) });
    } catch (e) { rec({ step: '3', error: e.message }); }

    // ---- 4. Reception → parent wizard (parent + child)
    try {
      await p.goto(`${PORTALS.reception}/reception/parents/new`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
      for (let step = 1; step <= 6; step++) {
        const d = await dump(p, `wizard-step${step}`);
        await shot(p, 'reception-smm2', `parent-wizard-step${step}`);
        console.log(`wizard step${step} ctl=${JSON.stringify(d.ctl.map(x => [x.type, x.ph]))} btn=${JSON.stringify(d.btn)}`);
        // fill step 1 (parent identity)
        if (step === 1) {
          const texts = p.locator('input[type="text"]:visible');
          const tn = await texts.count();
          for (let i = 0; i < tn; i++) {
            const ph = await texts.nth(i).getAttribute('placeholder');
            if (ph && /AB 1234567/.test(ph)) { await texts.nth(i).fill('AB 7654321'); continue; }
            if (ph && /hulkar/.test(ph)) { await texts.nth(i).fill('sim.otaona'); continue; }
            if (i === 0) await texts.nth(i).fill('SIM-Otaona');
            else if (i === 1) await texts.nth(i).fill('Beta');
          }
          const tel = p.locator('input[type="tel"]:visible');
          if (await tel.count()) await tel.first().fill('+998901112255');
          const ta = p.locator('textarea:visible');
          if (await ta.count()) await ta.first().fill('SIM- Samarqand shahri, beta manzil');
          const sel = p.locator('select:visible');
          if (await sel.count()) await sel.first().selectOption('uzbek').catch(() => {});
          const pw = p.locator('input[type="password"]:visible');
          if (await pw.count()) await pw.first().fill(SIMPW);
          await shot(p, 'reception-smm2', 'parent-wizard-step1-filled');
        }
        const next = p.locator('button', { hasText: /Davom etish|Keyingi|Yakunlash|Saqlash/ });
        if (!(await next.count())) break;
        await next.first().click();
        await p.waitForTimeout(3500);
      }
      const f = await shot(p, 'reception-smm2', 'parent-wizard-end');
      rec({ step: '4', target: 'parent + child @smm2', shot: f, body: (await text(p)).slice(0, 500) });
    } catch (e) { rec({ step: '4', error: e.message }); }
  } else rec({ step: '3/4', error: 'reception login failed' });
  await c.close();
}

save('p3b-provision.json', { R, dumps });
await b.close();
console.log('P3b DONE');
