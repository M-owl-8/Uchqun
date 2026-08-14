// P4f — the parent surface P4a–P4e did not reach: settings sub-forms, the
// privacy-consent modal (reached by revoking, then re-accepted), the message
// modals, help, logout, and the AIWarnings component.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, acceptParentConsent, PORTALS, PW, DESKTOP } from './lib.mjs';

const P = phase('P4');
const B = PORTALS.teacher;
const TAG = 'parent-desktop';
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4f', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 420)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, TAG, DESKTOP);
const net = [];
p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 190); } catch { /* noop */ } net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
const since = () => { const n = [...net]; net.length = 0; return n; };

await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });

// ── settings: profile form ────────────────────────────────────────────────
await T('profile-form', async () => {
  await goto(P, p, `${B}/settings`, TAG, 'settings-full', { full: true });
  const d = await p.evaluate(DUMP);
  const fields = await p.evaluate(() => [...document.querySelectorAll('input,select,textarea')].filter((e) => e.offsetParent)
    .map((e) => ({ type: e.type, name: e.name || null, value: String(e.value).slice(0, 30), label: (e.previousElementSibling?.innerText || '').trim().slice(0, 26) })));
  rec('settings-inventory', { buttons: d.buttons, fields });
  // change the phone, save, reload, confirm it stuck, then put it back
  const phone = p.locator('input[type="tel"]').first();
  const original = (await phone.count()) ? await phone.inputValue() : null;
  if (original !== null) {
    await phone.fill('+998901000099');
    since();
    await p.locator('button', { hasText: /Profilni saqlash/ }).first().click();
    await p.waitForTimeout(4500);
    const saved = since();
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
    const afterReload = await p.locator('input[type="tel"]').first().inputValue();
    // restore
    await p.locator('input[type="tel"]').first().fill(original);
    await p.locator('button', { hasText: /Profilni saqlash/ }).first().click();
    await p.waitForTimeout(4000);
    const restored = await p.locator('input[type="tel"]').first().inputValue();
    rec('profile-phone-roundtrip', { original, net: saved, afterReload, persisted: afterReload === '+998901000099', restored, restoredOk: restored === original, shot: await shot(P, p, TAG, 'settings-profile-restored', { full: true }) });
  }
});

// ── settings: password form, wrong current ────────────────────────────────
await T('password', async () => {
  await goto(P, p, `${B}/settings`, TAG, 'settings-password-area', { full: true });
  const pw = p.locator('input[type="password"]');
  const n = await pw.count();
  if (n >= 2) {
    await pw.nth(0).fill('WrongPassword@1');
    for (let i = 1; i < n; i++) await pw.nth(i).fill('NewPass@2026x');
    since();
    await p.locator('button', { hasText: /Parolni yangilash/ }).first().click();
    await p.waitForTimeout(4000);
    rec('password-wrong-current', { inputs: n, net: since(), shot: await shot(P, p, TAG, 'parent-password-wrong-current', { full: true }), msg: ((await text(p)).match(/(noto'g'ri[^\n]*|xato[^\n]*|joriy[^\n]*|incorrect[^\n]*)/i) || [])[0] ?? null });
  } else rec('password-wrong-current', { inputs: n, note: 'password fields not present on settings' });
});

// ── message modal: parent → school ────────────────────────────────────────
await T('message-modal', async () => {
  await goto(P, p, `${B}/child`, TAG, 'child-profile-for-message', { full: true });
  const d = await p.evaluate(DUMP);
  const open = p.locator('button').filter({ hasText: /Xabar|Murojaat|Yozish/i });
  if (await open.count()) {
    await open.first().click(); await p.waitForTimeout(2600);
    const modal = await shot(P, p, TAG, 'parent-message-modal', { full: true });
    await p.evaluate(() => {
      const set = (el, v) => { const pr = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement; Object.getOwnPropertyDescriptor(pr.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
      const ins = [...document.querySelectorAll('input,textarea')].filter((e) => e.offsetParent && e.type !== 'file');
      ins.forEach((e, i) => set(e, i === 0 ? 'QA-P4F savol' : 'QA-P4F: farzandim davomati haqida savolim bor edi.'));
    });
    await p.waitForTimeout(700);
    const filled = await shot(P, p, TAG, 'parent-message-filled', { full: true });
    since();
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter((x) => x.offsetParent && /Yubor|Jo'nat|Saqla/.test(x.innerText) && !x.disabled); if (b.length) b[b.length - 1].click(); });
    await p.waitForTimeout(5000);
    rec('message-modal', { modal, filled, net: since(), after: await shot(P, p, TAG, 'parent-message-result', { full: true }) });
  } else rec('message-modal', { openable: false, buttons: d.buttons.slice(0, 14) });
});

// ── help ──────────────────────────────────────────────────────────────────
await T('help', async () => {
  const f = await goto(P, p, `${B}/help`, TAG, 'help-page', { full: true });
  const d = await p.evaluate(DUMP);
  const acc = p.locator('button, summary');
  const n = await acc.count();
  if (n) { await acc.first().click(); await p.waitForTimeout(1500); }
  rec('help', { shot: f, controls: d.buttons.slice(0, 12), expanded: await shot(P, p, TAG, 'help-expanded', { full: true }), body: (await text(p)).replace(/\n/g, ' | ').slice(0, 260) });
});

// ── AIWarnings: is it routed at all? ──────────────────────────────────────
await T('ai-warnings', async () => {
  const tries = {};
  for (const r of ['/warnings', '/ai-warnings', '/xabar?tab=warnings']) {
    await goto(P, p, B + r, TAG, `ai-warnings-probe${r.replace(/[^a-z]/gi, '-')}`);
    tries[r] = { url: new URL(p.url()).pathname, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 120) };
  }
  rec('ai-warnings-routes', tries);
});

// ── privacy consent: revoke, witness the modal, re-accept ────────────────
await T('consent', async () => {
  await goto(P, p, `${B}/settings`, TAG, 'consent-before-revoke', { full: true });
  const revoke = p.locator('button', { hasText: /Rozilikni bekor qilish/ });
  if (!(await revoke.count())) { rec('consent', { revokeButton: false }); return; }
  since();
  await revoke.first().click();
  await p.waitForTimeout(3000);
  const confirmShot = await shot(P, p, TAG, 'consent-revoke-confirm', { full: true });
  // a confirmation step may appear
  const confirm = p.locator('button').filter({ hasText: /Ha|Tasdiq|Bekor qilish$/ });
  if (await confirm.count()) { await confirm.first().click().catch(() => {}); await p.waitForTimeout(4000); }
  const revokeNet = since();
  await p.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  const modalShot = await shot(P, p, TAG, 'PrivacyConsentModal-after-revoke', { full: true });
  const modalPresent = await p.locator('[aria-labelledby="privacy-consent-title"]').count();
  const modalText = (await text(p)).replace(/\n/g, ' | ').slice(0, 300);
  since();
  const reaccept = await acceptParentConsent(P, p, TAG);
  rec('consent', { confirmShot, revokeNet, modalShot, modalPresent, modalText, reaccept, reacceptNet: since(), after: await shot(P, p, TAG, 'consent-reaccepted', { full: true }) });
});

save(P, 'p4f.json', out);
await c.close();
await browser.close();
console.log('P4f DONE');
