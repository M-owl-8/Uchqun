// P6c — the government surfaces the variant sweep only listed: school detail,
// child detail, admin detail, ratings, platform, warnings, settings/password.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW, API } from './lib.mjs';
const P = phase('P6'); const B = PORTALS.government; const TAG = 'gov-republic'; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p6c', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 380)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, TAG);
const net = []; p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b=''; try{b=(await r.text()).slice(0,240);}catch{} net.push({m:r.request().method(),u:r.url().replace(/^https?:\/\/[^/]+/,''),s:r.status(),b}); });
const since = () => { const n = [...net]; net.length = 0; return n; };
await login(P, p, 'government', 'gov.republic@uchqun.uz', PW, TAG);

await T('school-detail', async () => {
  await goto(P, p, `${B}/government/schools`, TAG, 'schools-for-detail', { full: true });
  const href = await p.evaluate(() => { const a = [...document.querySelectorAll('a[href^="/government/schools/"]')][0]; return a ? a.getAttribute('href') : null; });
  let clicked = null;
  if (!href) { clicked = await p.evaluate(() => { const r = [...document.querySelectorAll('tr,button,div[role="button"]')].find((e) => e.offsetParent && /sonli/.test(e.innerText || '')); if (r) { r.click(); return (r.innerText||'').trim().slice(0,40); } return null; }); await p.waitForTimeout(4000); }
  else await goto(P, p, B + href, TAG, 'school-detail', { full: true });
  const d = await p.evaluate(DUMP);
  rec('school-detail', { href, clicked, url: new URL(p.url()).pathname, buttons: d.buttons.slice(0, 12), shot: await shot(P, p, TAG, 'gov-school-detail', { full: true }), body: (await text(p)).replace(/\n/g,' | ').slice(150, 480) });
});

await T('students-and-child', async () => {
  await goto(P, p, `${B}/government/students`, TAG, 'gov-students', { full: true });
  const d = await p.evaluate(DUMP);
  const href = await p.evaluate(() => { const a = [...document.querySelectorAll('a[href^="/government/children/"]')][0]; return a ? a.getAttribute('href') : null; });
  let child = null;
  if (href) child = await goto(P, p, B + href, TAG, 'gov-child-detail', { full: true });
  rec('students', { buttons: d.buttons.slice(0, 10), inputs: d.inputs.slice(0, 6), childHref: href, child, body: (await text(p)).replace(/\n/g,' | ').slice(150, 420) });
});

for (const [route, label] of [['/government/ratings', 'ratings'], ['/government/platform', 'platform'], ['/government/warnings', 'warnings'], ['/government/teachers', 'teachers'], ['/government/parents', 'parents'], ['/government/profile', 'profile']]) {
  await T(label, async () => {
    const f = await goto(P, p, B + route, TAG, `gov-${label}`, { full: true });
    const d = await p.evaluate(DUMP);
    rec(label, { shot: f, buttons: d.buttons.slice(0, 12), inputs: d.inputs.slice(0, 6), body: (await text(p)).replace(/\n/g,' | ').slice(150, 400) });
  });
}

await T('settings-password', async () => {
  await goto(P, p, `${B}/government/settings`, TAG, 'gov-settings', { full: true });
  const d = await p.evaluate(DUMP);
  const pw = p.locator('input[type="password"]');
  let pwNet = null;
  if (await pw.count() >= 2) {
    await pw.nth(0).fill('WrongPassword@1');
    for (let i = 1; i < await pw.count(); i++) await pw.nth(i).fill('NewPass@2026x');
    since();
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /Parol|Yangila|Saqla/.test(x.innerText)); if (b) b.click(); });
    await p.waitForTimeout(4500);
    pwNet = since();
  }
  rec('settings', { buttons: d.buttons.slice(0, 12), inputs: d.inputs.slice(0, 8), passwordNet: pwNet, shot: await shot(P, p, TAG, 'gov-settings-password', { full: true }) });
});

// the stale/offline banner strings, witnessed
await T('offline-strings', async () => {
  await goto(P, p, `${B}/government`, TAG, 'gov-dashboard-strings');
  const found = await p.evaluate(() => {
    const t = document.body.innerText;
    return { showingCached: /Showing cached data/.test(t), retry: /\bRetry\b/.test(t), offline: /You are offline/.test(t) };
  });
  rec('offline-strings-on-dashboard', found);
});
save(P, 'p6c.json', out); await c.close(); await browser.close(); console.log('P6c DONE');
