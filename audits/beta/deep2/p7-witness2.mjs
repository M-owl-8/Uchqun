// P7.3 — re-witness the second wave on the DEPLOYED build.
// D-21 · D-22 · D-23 · D-24 · D-25 (reception) · D-29 · D-30 (teacher) · D-42 (admin)
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, pwFor, DESKTOP } from './lib.mjs';
import fs from 'fs'; import path from 'path';

const P = phase('P7');
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7-witness2', d: k, v }); console.log(k, JSON.stringify(v).slice(0, 330)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const DL = path.resolve('audits/beta/deep2/P7/downloads'); fs.mkdirSync(DL, { recursive: true });
const browser = await newBrowser(true);

// ── D-21 — a validation rejection must name the field ─────────────────────
await T('D-21', async () => {
  const TAG = 'D-21'; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.reception}/reception/teachers`, TAG, 'D-21-teachers');
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /Qo'sh|Yangi|\+/.test(e.innerText)); if (b) b.click(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const set = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const ins = [...document.querySelectorAll('input')].filter((e) => e.offsetParent);
    const byType = (t) => ins.filter((e) => e.type === t);
    const text = byType('text');
    if (text[0]) set(text[0], 'Test');
    if (text[1]) set(text[1], 'Tekshiruv');
    if (text[2]) set(text[2], 'test.probe');
    const tel = byType('tel')[0] || text[3]; if (tel) set(tel, '901234567');
    const pw = byType('password')[0]; if (pw) set(pw, '123');
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /Saqla|Qo'sh|Yarat/.test(e.innerText)); if (b) b.click(); });
  await p.waitForTimeout(4000);
  const body = (await text(p)).replace(/\n+/g, ' | ');
  rec('D-21', {
    bareValidationFailed: /Validation failed/.test(body) && !/password|parol/i.test(body),
    namesTheField: /password|parol/i.test(body),
    message: (body.match(/[^|]*(password|parol|8 )[^|]*/i) || [])[0]?.trim().slice(0, 160) ?? null,
    shot: await shot(P, p, TAG, 'D-21-validation-names-the-field', { full: true }),
  });
  await c.close();
});

// ── D-22/D-23/D-24 — the wizard ───────────────────────────────────────────
await T('D-22-D-23-D-24', async () => {
  const TAG = 'D-22'; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.reception}/reception/parents/new`, TAG, 'D-23-wizard-step1');

  // D-23: click Next on a completely blank step 1
  const before = await p.evaluate(() => document.body.innerText.match(/QADAM\s*\d\s*\/\s*\d/i)?.[0] ?? null);
  await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent);
    const next = btns.reverse().find((e) => /Davom etish|Keyingi/i.test(e.innerText));
    if (next) next.click();
  });
  await p.waitForTimeout(2500);
  const after = await p.evaluate(() => document.body.innerText.match(/QADAM\s*\d\s*\/\s*\d/i)?.[0] ?? null);
  const body = (await text(p)).replace(/\n+/g, ' | ');
  rec('D-23', {
    stepBefore: before, stepAfter: after, advancedOnBlank: before !== after,
    namesMissingFields: /to'ldirilmagan|majburiy|Required|обязательн/i.test(body),
    message: (body.match(/[^|]*(to'ldirilmagan|majburiy)[^|]*/i) || [])[0]?.trim().slice(0, 170) ?? null,
    shot: await shot(P, p, TAG, 'D-23-blank-step-refused', { full: true }),
  });

  // D-24: fill step 1, advance, then browser Back
  await p.evaluate(() => {
    const set = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const ins = [...document.querySelectorAll('input')].filter((e) => e.offsetParent);
    const text = ins.filter((e) => e.type === 'text');
    if (text[0]) set(text[0], 'Nigora');
    if (text[1]) set(text[1], 'Saidova');
    if (text[2]) set(text[2], 'n.saidova.probe');
    const tel = ins.find((e) => e.type === 'tel'); if (tel) set(tel, '901112233');
    const pw = ins.find((e) => e.type === 'password'); if (pw) set(pw, 'Uchqun@2026');
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent);
    const next = btns.reverse().find((e) => /Davom etish|Keyingi/i.test(e.innerText));
    if (next) next.click();
  });
  await p.waitForTimeout(2500);
  const atStep2 = await p.evaluate(() => document.body.innerText.match(/QADAM\s*\d\s*\/\s*\d/i)?.[0] ?? null);

  p.on('dialog', (d) => d.accept());
  await p.goBack({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  rec('D-24', {
    atStep2,
    afterBackUrl: new URL(p.url()).pathname,
    afterBackStep: await p.evaluate(() => document.body.innerText.match(/QADAM\s*\d\s*\/\s*\d/i)?.[0] ?? null),
    stayedInWizard: /parents\/new/.test(p.url()),
    shot: await shot(P, p, TAG, 'D-24-back-walks-the-steps', { full: true }),
  });

  // D-22: the draft banner's resume label must differ from the wizard's Next
  await p.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => /wizard:parent:.*:draft/.test(x));
    if (k) return;
    localStorage.setItem('wizard:parent:probe:draft', JSON.stringify({
      parentData: { firstName: 'Zuhra', lastName: 'Ibragimova', localPart: 't.abandon' },
      childData: { firstName: 'Zilola', lastName: 'Saidova' }, groupData: {}, step: 1,
    }));
  });
  await goto(P, p, `${PORTALS.reception}/reception/parents/new`, TAG, 'D-22-draft-banner');
  const labels = await p.evaluate(() => [...document.querySelectorAll('button')]
    .filter((e) => e.offsetParent).map((e) => e.innerText.trim()).filter(Boolean));
  const bodyD22 = await text(p);
  rec('D-22', {
    buttonLabels: labels.slice(0, 12),
    duplicateDavomEtish: labels.filter((l) => /^Davom etish$/i.test(l)).length,
    resumeLabelDistinct: labels.some((l) => /Qoralamani tiklash|Restore draft|Восстановить/i.test(l)),
    bannerNamesTheGuardian: /Zuhra|Ibragimova/.test(bodyD22),
    shot: await shot(P, p, TAG, 'D-22-draft-banner-disambiguated', { full: true }),
  });
  await c.close();
});

// ── D-25 — the action menu must open on a real touch tap ──────────────────
await T('D-25', async () => {
  const TAG = 'D-25';
  const c = await browser.newContext({ viewport: { width: 900, height: 800 }, hasTouch: true, isMobile: false });
  const p = await c.newPage();
  await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.reception}/reception/parents`, TAG, 'D-25-parents-touch');
  const box = await p.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-haspopup="menu"], button')]
      .find((e) => e.offsetParent && e.querySelector('svg') && e.closest('td'));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, hasAria: b.getAttribute('aria-haspopup') === 'menu' };
  });
  let visible = null;
  if (box) {
    await p.touchscreen.tap(box.x, box.y);
    await p.waitForTimeout(1200);
    visible = await p.evaluate(() => {
      const items = [...document.querySelectorAll('[role=menu] button, button')]
        .filter((e) => e.offsetParent && /Tahrirlash|Bola qo'shish|O'chirish|Parolni/i.test(e.innerText));
      return items.map((e) => e.innerText.trim()).slice(0, 6);
    });
  }
  rec('D-25', {
    triggerFound: !!box, hasAriaHaspopup: box?.hasAria ?? false,
    menuItemsVisibleAfterTap: visible, editVisibleAfterTap: (visible || []).some((v) => /Tahrirlash/i.test(v)),
    shot: await shot(P, p, TAG, 'D-25-menu-open-after-touch-tap', { full: true }),
  });
  await c.close();
});

// ── D-29 / D-30 — teacher group label and same-named children ─────────────
await T('D-29-D-30', async () => {
  const TAG = 'D-29'; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.teacher}/teacher`, TAG, 'D-29-dashboard', { full: true });
  const dash = await text(p);
  rec('D-29-dashboard', {
    namesUmid: /Umid guruhi/.test(dash), namesYulduz: /Yulduz guruhi/.test(dash),
    line: (dash.match(/[^\n]*guruh[^\n]*bola[^\n]*/i) || [])[0]?.trim().slice(0, 150) ?? null,
    shot: await shot(P, p, TAG, 'D-29-dashboard-names-both-groups', { full: true }),
  });

  await goto(P, p, `${PORTALS.teacher}/teacher/attendance`, TAG, 'D-30-attendance', { full: true });
  await p.waitForTimeout(3000);
  const grid = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button[aria-label]')].filter((e) => /:/.test(e.getAttribute('aria-label')));
    const gul = btns.filter((e) => /Gulnoza Ergasheva/.test(e.getAttribute('aria-label')));
    return {
      header: document.body.innerText.match(/[^\n]*guruh[^\n]*bola[^\n]*/i)?.[0]?.trim().slice(0, 150) ?? null,
      gulnozaCards: gul.length,
      gulnozaLabels: gul.map((e) => e.getAttribute('aria-label')),
      distinctLabels: new Set(gul.map((e) => e.getAttribute('aria-label'))).size,
    };
  });
  rec('D-30', {
    ...grid,
    indistinguishable: grid.gulnozaCards > 1 && grid.distinctLabels === 1,
    shot: await shot(P, p, TAG, 'D-30-same-named-children-disambiguated', { full: true }),
  });
  await c.close();
});

// ── D-42 — the admin export ───────────────────────────────────────────────
await T('D-42', async () => {
  const TAG = 'D-42'; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  await login(P, p, 'admin', 'direktor@tmm3.uz', pwFor('direktor@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.admin}/admin/parents`, TAG, 'D-42-parents', { full: true });
  await p.waitForTimeout(2500);
  const onScreen = await p.evaluate(() => (document.body.innerText.match(/[A-ZА-Я][a-zà-ÿ']+\s+[A-ZА-Я][a-zà-ÿ']+(ova|ov|eva|ev)\b/g) || []).slice(0, 10));
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 30000 }),
    p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /Eksport|Export|Экспорт/i.test(e.innerText)); if (b) b.click(); }),
  ]);
  const f = path.join(DL, dl.suggestedFilename()); await dl.saveAs(f);
  const raw = fs.readFileSync(f, 'utf8'); const lines = raw.split(/\r?\n/).filter(Boolean);
  rec('D-42', {
    file: path.basename(f), bytes: Buffer.byteLength(raw), lines: lines.length,
    bom: raw.charCodeAt(0) === 0xFEFF, header: lines[0],
    headerIsUzbek: /Ism|Familiya/.test(lines[0] || ''),
    firstRow: (lines[1] || '').slice(0, 110),
    namesOnScreen: onScreen.length,
    shot: await shot(P, p, TAG, 'D-42-admin-export', { full: true }),
  });
  await c.close();
});

save(P, 'p7-witness2.json', out);
await browser.close();
console.log('P7 witness2 DONE');
