// D-21 — the L2 witness: the TOAST the clerk actually sees. The previous run
// matched a form label, then failed to submit at all. Submit the form itself.
import { phase, newBrowser, ctx, login, goto, shot, text, PORTALS, pwFor, DESKTOP } from './lib.mjs';
const P = phase('P7');
const b = await newBrowser(true);
const { c, p } = await ctx(P, b, 'D-21c', DESKTOP);
await login(P, p, 'reception', 'qabul@tmm3.uz', pwFor('qabul@tmm3.uz'), 'D-21c');
const netlog = [];
p.on('response', async (r) => {
  if (/\/reception\/teachers$/.test(r.url()) && r.request().method() === 'POST') {
    netlog.push({ status: r.status(), body: (await r.text().catch(() => '')).slice(0, 300) });
  }
});
await goto(P, p, `${PORTALS.reception}/reception/teachers`, 'D-21c', 'D-21c-teachers');

await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /^Tarbiyachi qo'shish$/.test(e.innerText.trim())); if (x) x.click(); });
await p.waitForTimeout(1800);

const filled = await p.evaluate(() => {
  const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const ins = [...document.querySelectorAll('input')].filter((e) => e.offsetParent);
  const txt = ins.filter((e) => e.type === 'text');
  // fill EVERY text field: an empty `required` input silently blocks submit via
  // native validation, which is why the earlier runs captured no request at all
  txt.forEach((e, i) => set(e, ['Test', 'Probe', 'weak.probe3'][i] ?? 'Probe'));
  const tel = ins.find((e) => e.type === 'tel'); if (tel) set(tel, '901234567');
  const pw = ins.find((e) => e.type === 'password'); if (pw) set(pw, '123');
  return ins.map((e) => ({ type: e.type, value: e.value.slice(0, 20) }));
});
await p.waitForTimeout(500);

// submit the FORM, not a button matched by text
const submitted = await p.evaluate(() => {
  const form = [...document.querySelectorAll('form')].find((f) => f.querySelector('input[type=password]'));
  if (!form) return 'no form';
  const btn = form.querySelector('button[type=submit]') || [...form.querySelectorAll('button')].pop();
  if (btn) { btn.click(); return 'clicked ' + btn.innerText.trim(); }
  form.requestSubmit(); return 'requestSubmit';
});
await p.waitForTimeout(1200);          // read BEFORE the toast auto-dismisses
const shotEarly = await shot(P, p, 'D-21c', 'D-21-toast-visible', { full: true });
const body = (await text(p));
console.log(JSON.stringify({
  filled, submitted,
  showsPasswordRule: /at least 8 characters|kamida 8|uppercase/i.test(body),
  showsBareValidationFailed: /Validation failed/.test(body) && !/at least 8|uppercase/i.test(body),
  formValid: submitted,
  toastLines: body.split('\n').filter((l) => /password|Validation|8 characters|uppercase/i.test(l)).slice(0, 5),
}, null, 1));
console.log('shot:', await shot(P, p, 'D-21c', 'D-21-toast-final', { full: true }));
await c.close(); await b.close();
