// P2b — reception portal flows: the 3-step wizard completed, abandoned mid-way,
// double-submitted; refresh and browser-back mid-flow; D-16 and D-17 re-checked.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW } from './lib.mjs';

const P = phase('P2');
const B = PORTALS.reception;
const TAG = 'reception-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p2b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 320)); };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);
const li = await login(P, p, 'reception', 'qabul@tmm3.uz', PW, TAG);
if (!li.ok) { console.log('LOGIN FAILED'); process.exit(1); }

const fillStep1 = async (local, first, last) => {
  const tt = p.locator('input[type="text"]:visible');
  for (let k = 0; k < await tt.count(); k++) {
    const ph = (await tt.nth(k).getAttribute('placeholder')) || '';
    if (/AB 1234567/.test(ph)) { await tt.nth(k).fill('AD 9912004'); continue; }
    if (/hulkar/.test(ph)) { await tt.nth(k).fill(local); continue; }
    if (k === 0) await tt.nth(k).fill(first);
    else if (k === 1) await tt.nth(k).fill(last);
  }
  await p.locator('input[type="tel"]:visible').first().fill('+998901239900');
  await p.locator('textarea:visible').first().fill('Toshkent shahri, Navro‘z ko‘chasi 8-uy');
  await p.locator('select:visible').first().selectOption('uzbek').catch(() => {});
  await p.locator('input[type="password"]:visible').first().fill(PW);
};
const fillStep2 = async (first, last) => {
  const tt = p.locator('input[type="text"]:visible');
  await tt.nth(0).fill(first); await tt.nth(1).fill(last);
  const dt = p.locator('input[type="date"]:visible');
  if (await dt.count()) await dt.first().fill('2020-09-02');
  const g = p.locator('button', { hasText: /^Ayol$/ });
  if (await g.count()) await g.first().click();
  const sels = p.locator('select:visible');
  for (let k = 0; k < await sels.count(); k++) {
    const vals = await sels.nth(k).locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    if (vals.length) await sels.nth(k).selectOption(vals[0]);
  }
  const ta = p.locator('textarea:visible');
  if (await ta.count()) await ta.first().fill('Nutq mashg‘ulotlari tavsiya etiladi.');
};

// ── A. VALIDATION FAILURE on wizard step 1: press Davom etish with an empty form
{
  await goto(P, p, `${B}/reception/parents/new`, TAG, 'wizard-s1-blank');
  await p.locator('button', { hasText: 'Davom etish' }).first().click();
  await p.waitForTimeout(1800);
  const f = await shot(P, p, TAG, 'wizard-s1-VALIDATION-blank-advance', { full: true });
  const body = await text(p);
  const stillStep1 = /QADAM 1|Ota-ona ma'lumotlari/i.test(body);
  rec('A-wizard-blank-advance', { shot: f, stillOnStep1: stillStep1, msg: (body.match(/[^\n]*(majburiy|to'ldiring|kiriting|xatolik)[^\n]*/i) || [])[0] ?? null });
}

// ── B. ABANDON at step 2, navigate away, come back — is the draft kept? ─────
{
  await goto(P, p, `${B}/reception/parents/new`, TAG, 'wizard-abandon-start');
  await fillStep1('t.abandon', 'Zuhra', 'Ibragimova');
  await p.locator('button', { hasText: 'Davom etish' }).first().click();
  await p.waitForTimeout(2500);
  await fillStep2('Sevinch', 'Ibragimova');
  const atStep2 = await shot(P, p, TAG, 'wizard-abandon-at-step2-filled', { full: true });
  // navigate away
  await goto(P, p, `${B}/reception/parents`, TAG, 'wizard-abandon-navigated-away');
  // come back
  await goto(P, p, `${B}/reception/parents/new`, TAG, 'wizard-abandon-returned', { full: true });
  const body = await text(p);
  const draftKept = body.includes('Zuhra') || body.includes('Ibragimova');
  rec('B-wizard-abandon', {
    atStep2, draftKept,
    step: (body.match(/QADAM \d \/ \d/) || [])[0] ?? null,
    head: body.slice(0, 320),
  });
}

// ── C. REFRESH mid-flow at step 2 ───────────────────────────────────────────
{
  await goto(P, p, `${B}/reception/parents/new`, TAG, 'wizard-refresh-start');
  await fillStep1('t.refresh', 'Malohat', 'Ergasheva');
  await p.locator('button', { hasText: 'Davom etish' }).first().click();
  await p.waitForTimeout(2500);
  const before = await shot(P, p, TAG, 'wizard-refresh-before', { full: true });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const after = await shot(P, p, TAG, 'wizard-refresh-after', { full: true });
  const body = await text(p);
  rec('C-wizard-refresh', {
    before, after,
    stepAfterRefresh: (body.match(/QADAM \d \/ \d/) || [])[0] ?? null,
    dataSurvived: body.includes('Malohat') || body.includes('Ergasheva'),
  });
}

// ── D. BROWSER BACK mid-flow ────────────────────────────────────────────────
{
  await goto(P, p, `${B}/reception/parents`, TAG, 'back-from-parents');
  await goto(P, p, `${B}/reception/parents/new`, TAG, 'back-into-wizard');
  await fillStep1('t.back', 'Ozoda', 'Sultonova');
  await p.locator('button', { hasText: 'Davom etish' }).first().click();
  await p.waitForTimeout(2500);
  await p.goBack({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  const f = await shot(P, p, TAG, 'wizard-browser-back-result', { full: true });
  rec('D-wizard-browser-back', { shot: f, url: p.url(), head: (await text(p)).slice(0, 300) });
}

// ── E. COMPLETE the wizard, then DOUBLE-SUBMIT step 3 ───────────────────────
{
  await goto(P, p, `${B}/reception/parents/new`, TAG, 'wizard-complete-start');
  await fillStep1('n.saidova', 'Nigora', 'Saidova');
  await p.locator('button', { hasText: 'Davom etish' }).first().click();
  await p.waitForTimeout(2500);
  await fillStep2('Zilola', 'Saidova');
  await shot(P, p, TAG, 'wizard-s2-filled', { full: true });
  await p.locator('button', { hasText: 'Davom etish' }).first().click();
  await p.waitForTimeout(2500);
  const radios = p.locator('input[type="radio"]:visible');
  if (await radios.count()) await radios.first().check();
  await p.waitForTimeout(600);
  await shot(P, p, TAG, 'wizard-s3-group-chosen', { full: true });
  // DOUBLE SUBMIT — two clicks as fast as the DOM allows
  const fin = p.locator('button', { hasText: 'Yakunlash' }).first();
  await fin.click();
  await fin.click({ timeout: 3000 }).catch((e) => ev(P, { kind: 'second-click', err: e.message }));
  await p.waitForTimeout(1500);
  const s1 = await shot(P, p, TAG, 'wizard-double-submit-1s', { full: true });
  await p.waitForTimeout(6000);
  const s2 = await shot(P, p, TAG, 'wizard-double-submit-done', { full: true });
  rec('E-wizard-double-submit', { s1, s2, url: p.url(), body: (await text(p)).slice(0, 400) });
}

// ── F. D-16: is there ANY way for reception to create a reception peer? ─────
{
  const found = {};
  for (const [route, label] of [['/reception', 'dashboard'], ['/reception/teachers', 'teachers'], ['/reception/settings', 'settings'], ['/reception/profile', 'profile']]) {
    await goto(P, p, B + route, TAG, `D-16-scan-${label}`);
    const d = await p.evaluate(DUMP);
    found[label] = d.buttons.filter((b) => /qabul|reception/i.test(b));
  }
  rec('F-D16-reception-peer', { scan: found, anyControl: Object.values(found).flat().length });
}

save(P, 'p2b.json', out);
await c.close();
await browser.close();
console.log('P2b DONE');
