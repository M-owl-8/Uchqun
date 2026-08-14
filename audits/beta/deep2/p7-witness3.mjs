// D-21 and D-22 re-witnessed properly.
//  - D-21: the first run matched the string "Parol (yangilash)", a FORM LABEL,
//    not the toast. Read the toast element itself.
//  - D-22: the first run seeded localStorage under 'wizard:parent:probe:draft'
//    but the app keys on the logged-in user id, so the banner shown was an
//    unrelated pre-existing draft and the guardian-naming was never tested.
import { phase, newBrowser, ctx, login, goto, shot, text, PORTALS, pwFor, DESKTOP, API } from './lib.mjs';
const P = phase('P7');
const b = await newBrowser(true);
const out = {};

// ── D-21 ──────────────────────────────────────────────────────────────────
{
  const TAG = 'D-21b'; const { c, p } = await ctx(P, b, TAG, DESKTOP);
  await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), TAG);
  // hit the API directly, then read what the UI renders for that exact payload
  // reception does NOT proxy /api/v1 (the teacher portal does — P5 §7.2); a
  // relative path here hits the SPA fallback and returns index.html with a 200.
  const api = await p.evaluate(async (base) => {
    const r = await fetch(base + '/reception/teachers', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'Probe', localPart: 'weak.probe', phone: '901234567', password: '123' }),
    });
    return { status: r.status, body: await r.text() };
  }, API);
  out['D-21-api'] = { status: api.status, body: api.body.slice(0, 260) };

  // now the same through the form, reading the toast node
  await goto(P, p, `${PORTALS.reception}/reception/teachers`, TAG, 'D-21b-teachers');
  await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /Qo'sh|Yangi/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const ins = [...document.querySelectorAll('input')].filter((e) => e.offsetParent);
    const txt = ins.filter((e) => e.type === 'text');
    if (txt[0]) set(txt[0], 'Test'); if (txt[1]) set(txt[1], 'Probe'); if (txt[2]) set(txt[2], 'weak.probe2');
    const tel = ins.find((e) => e.type === 'tel'); if (tel) set(tel, '901234567');
    const pw = ins.find((e) => e.type === 'password'); if (pw) set(pw, '123');
  });
  await p.waitForTimeout(600);
  const before = await text(p);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /^(Saqlash|Qo'shish|Yaratish)/.test(e.innerText.trim())); if (x) x.click(); });
  await p.waitForTimeout(4000);
  const after = await text(p);
  const added = after.split('\n').filter((l) => l.trim() && !before.includes(l));
  out['D-21-toast'] = {
    newLines: added.slice(0, 6),
    mentionsPasswordRule: added.some((l) => /password|8 characters|kamida 8/i.test(l)),
    bareValidationFailedOnly: added.some((l) => /^Validation failed$/.test(l.trim())),
    shot: await shot(P, p, TAG, 'D-21-toast-names-the-field', { full: true }),
  };
  await c.close();
}

// ── D-22 — seed the draft under the REAL key ──────────────────────────────
{
  const TAG = 'D-22b'; const { c, p } = await ctx(P, b, TAG, DESKTOP);
  await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), TAG);
  await goto(P, p, `${PORTALS.reception}/reception/parents`, TAG, 'D-22b-parents');
  const seeded = await p.evaluate(() => {
    const raw = localStorage.getItem('reception_accessToken_user') || localStorage.getItem('user') || '{}';
    const u = JSON.parse(raw);
    if (!u.id) return { ok: false };
    const key = `wizard:parent:${u.id}:draft`;
    localStorage.setItem(key, JSON.stringify({
      parentData: { firstName: 'Zuhra', lastName: 'Ibragimova', localPart: 't.abandon', phone: '', password: '' },
      childData: { firstName: 'Zilola', lastName: 'Saidova' }, groupData: {}, step: 1,
    }));
    return { ok: true, key };
  });
  await goto(P, p, `${PORTALS.reception}/reception/parents/new`, TAG, 'D-22b-draft-banner', { full: true });
  const body = await text(p);
  const labels = await p.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => e.innerText.trim()));
  out['D-22-banner'] = {
    seeded,
    bannerNamesTheGuardian: /Zuhra Ibragimova/.test(body),
    bannerNamesTheChild: /Zilola Saidova/.test(body),
    resumeLabel: labels.find((l) => /tiklash|Restore|Восстанов/i.test(l)) ?? null,
    davomEtishCount: labels.filter((l) => /^Davom etish$/i.test(l)).length,
    bannerText: (body.match(/Saqlangan qoralama[\s\S]{0,120}/) || [])[0]?.replace(/\n+/g, ' | ') ?? null,
    shot: await shot(P, p, TAG, 'D-22-banner-names-the-guardian', { full: true }),
  };
  await c.close();
}

console.log(JSON.stringify(out, null, 1));
await b.close();
