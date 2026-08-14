// P3h — meal creation did not persist and the IRR save did not bump updatedAt.
// Determine for each whether it is a harness gap or a false success.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, PW } from './lib.mjs';

const P = phase('P3');
const B = PORTALS.teacher;
const TAG = 'teacher-tmm3';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p3h', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 900)); };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG);

const net = [];
p.on('response', async (r) => {
  const u = r.url();
  if (!/\/api\/v1\/(meals|irr)/i.test(u)) return;
  let body = '';
  try { body = (await r.text()).slice(0, 260); } catch { /* noop */ }
  net.push({ method: r.request().method(), url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body });
});

await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', PW, TAG);

// ── MEAL ───────────────────────────────────────────────────────────────────
{
  await goto(P, p, `${B}/teacher/reja?tab=meals`, TAG, 'meal-retry-open', { full: true });
  await p.locator('button', { hasText: /Taom qo'shish/ }).first().click();
  await p.waitForTimeout(2600);
  const fields = await p.evaluate(() => [...document.querySelectorAll('input,select,textarea')]
    .filter((e) => e.offsetParent)
    .map((e) => ({
      tag: e.tagName.toLowerCase(), type: e.type || null, name: e.name || null,
      required: e.required, placeholder: e.placeholder || null, value: e.value,
      label: (e.closest('label')?.innerText || e.previousElementSibling?.innerText || '').trim().slice(0, 34),
      options: e.tagName === 'SELECT' ? [...e.options].map((o) => o.value) : undefined,
    })));
  rec('meal-form-fields', fields);
  const emptyShot = await shot(P, p, TAG, 'meal-form-empty', { full: true });

  // fill every visible field
  await p.evaluate(() => {
    const set = (el, v) => {
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    for (const e of [...document.querySelectorAll('input,select,textarea')].filter((x) => x.offsetParent)) {
      if (e.tagName === 'SELECT') { const o = [...e.options].map((x) => x.value).filter(Boolean); if (o.length) set(e, o[0]); }
      else if (e.type === 'date') set(e, '2026-08-14');
      else if (e.type === 'time') set(e, '12:30');
      else if (e.type === 'number') set(e, '1');
      else if (e.type === 'checkbox') { if (!e.checked) e.click(); }
      else set(e, 'Sabzavotli sho‘rva');
    }
  });
  await p.waitForTimeout(700);
  const filledShot = await shot(P, p, TAG, 'meal-form-filled-every-field', { full: true });
  const filledVals = await p.evaluate(() => [...document.querySelectorAll('input,select,textarea')].filter((e) => e.offsetParent).map((e) => `${e.name || e.type}=${e.value}`));
  net.length = 0;
  const submits = await p.locator('button[type="submit"]:visible').evaluateAll((e) => e.map((b) => b.innerText.trim()));
  await p.locator('button[type="submit"]:visible').first().click();
  await p.waitForTimeout(5000);
  const body = await text(p);
  rec('meal-submit', {
    emptyShot, filledShot, filledVals, submits,
    network: [...net],
    toast: (body.match(/(muvaffaqiyat[^\n]*|xato[^\n]*|majburiy[^\n]*|to'ldiring[^\n]*)/i) || [])[0] ?? null,
    modalStillOpen: await p.locator('button[type="submit"]:visible').count() > 0,
    after: await shot(P, p, TAG, 'meal-after-submit', { full: true }),
  });
}

// ── IRR: make a REAL change, then check updatedAt ──────────────────────────
{
  const CH = '5eed0c9a-fe3e-4031-8f5c-aac195c36b31';
  await goto(P, p, `${B}/teacher/children/${CH}/irr`, TAG, 'irr-retry-open', { full: true });
  const before = await p.evaluate(() => {
    const t = [...document.querySelectorAll('textarea')].filter((e) => e.offsetParent);
    return { textareas: t.length, firstValue: t[0] ? t[0].value.slice(0, 60) : null, inputs: [...document.querySelectorAll('input')].filter((e) => e.offsetParent).length };
  });
  const stamp = 'QA-P3H 2026-08-14 tekshiruv belgisi';
  const changed = await p.evaluate((s) => {
    const t = [...document.querySelectorAll('textarea')].filter((e) => e.offsetParent)[0];
    if (!t) return false;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, `${t.value} ${s}`.trim());
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, stamp);
  const filled = await shot(P, p, TAG, 'irr-real-change-filled', { full: true });
  net.length = 0;
  await p.locator('button', { hasText: /^Saqlash$/ }).first().click();
  await p.waitForTimeout(5500);
  rec('irr-real-change', {
    before, changed, stamp, filled, network: [...net],
    toast: ((await text(p)).match(/(saqlandi|muvaffaqiyat[^\n]*|xato[^\n]*)/i) || [])[0] ?? null,
    after: await shot(P, p, TAG, 'irr-real-change-result', { full: true }),
  });
}

save(P, 'p3h.json', out);
await c.close();
await browser.close();
console.log('P3h DONE');
