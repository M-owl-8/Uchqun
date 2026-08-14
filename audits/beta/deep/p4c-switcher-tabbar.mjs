// P4c — child switcher (two children temporarily attached to one parent),
// the real mobile tab bar and its tap targets, the missing language switcher.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW, MOBILE, DESKTOP } from './lib.mjs';
const P = phase('P4'); const B = PORTALS.teacher; const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4c', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 480)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };
const browser = await newBrowser(true);

// ── DESKTOP: child switcher ───────────────────────────────────────────────
{
  const TAG = 'parent-desktop'; const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });
  await T('switcher', async () => {
    const before = await goto(P, p, `${B}/`, TAG, 'switcher-two-children-dashboard', { full: true });
    const sw = await p.evaluate(() => [...document.querySelectorAll('button,select,a')].filter((e) => e.offsetParent && /(Ergasheva|Mirzayev)/.test(e.innerText || '')).map((e) => ({ tag: e.tagName, t: e.innerText.trim().slice(0, 30) })));
    rec('switcher-controls', { before, controls: sw });
    const b = p.locator('button').filter({ hasText: /Ergasheva/ }).first();
    if (await b.count()) {
      await b.click(); await p.waitForTimeout(2000);
      const opened = await shot(P, p, TAG, 'switcher-open', { full: true });
      const opts = await p.evaluate(() => [...document.querySelectorAll('button,li,a')].filter((e) => e.offsetParent && /(Ergasheva|Mirzayev)/.test(e.innerText || '')).map((e) => e.innerText.trim().slice(0, 30)));
      const other = p.locator('button, li, a').filter({ hasText: /Mirzayev/ }).first();
      let switched = null;
      if (await other.count()) { await other.click(); await p.waitForTimeout(4000); switched = await shot(P, p, TAG, 'switcher-switched-to-second-child', { full: true }); }
      rec('switcher-open', { opened, options: opts, switched, headerNow: (await text(p)).slice(0, 160).replace(/\n/g, ' | ') });
      // does the data follow the switch?
      const att = await goto(P, p, `${B}/attendance`, TAG, 'switcher-second-child-attendance', { full: true });
      rec('switcher-data-follows', { shot: att, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 220) });
    } else rec('switcher-open', { openable: false });
  });
  await T('language', async () => {
    const s = await goto(P, p, `${B}/settings`, TAG, 'settings-language-check', { full: true });
    const d = await p.evaluate(DUMP);
    const anyLang = await p.evaluate(() => [...document.querySelectorAll('button,select,a')].filter((e) => e.offsetParent && /(o'zbek|ozbek|рус|krill|lotin|language|til)/i.test((e.innerText || '') + (e.getAttribute('aria-label') || ''))).map((e) => e.innerText.trim().slice(0, 24)));
    rec('language-in-app', { shot: s, settingsButtons: d.buttons, langControlsAnywhere: anyLang, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 300) });
  });
  await T('notifications', async () => {
    const s = await goto(P, p, `${B}/notifications`, TAG, 'D-35-notifications-empty', { defect: 'D-35', full: true });
    rec('notifications', { shot: s, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 260) });
  });
  await c.close();
}

// ── MOBILE: the real tab bar ──────────────────────────────────────────────
{
  const TAG = 'parent-mobile'; const { c, p } = await ctx(P, browser, TAG, { viewport: MOBILE, hasTouch: true, isMobile: true });
  await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i, vp: 'mobile' });
  await goto(P, p, `${B}/`, TAG, 'mobile-dashboard-for-tabbar', { vp: 'mobile' });
  const bar = await p.evaluate(() => {
    const navs = [...document.querySelectorAll('nav')].filter((n) => n.getBoundingClientRect().height > 0);
    const n = navs.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
    if (!n) return null;
    const cs = getComputedStyle(n);
    return { count: navs.length, position: cs.position, cls: String(n.className).slice(0, 50), rect: n.getBoundingClientRect().toJSON(),
      items: [...n.querySelectorAll('a,button')].map((e) => { const r = e.getBoundingClientRect(); return { label: (e.innerText || '').trim().slice(0, 14), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top) }; }) };
  });
  rec('mobile-tabbar', bar);
  const taps = [];
  for (const label of ['Kundalik', 'Galereya', 'Xabar', 'Bola', 'Bugun']) {
    const el = p.locator('nav a, nav button').filter({ hasText: new RegExp(`^${label}$`) }).first();
    if (!(await el.count())) { taps.push({ label, found: false }); continue; }
    const box = await el.boundingBox();
    if (!box) { taps.push({ label, found: true, boundingBox: null }); continue; }
    await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await p.waitForTimeout(3200);
    taps.push({ label, tapped: { w: Math.round(box.width), h: Math.round(box.height) }, url: new URL(p.url()).pathname, shot: await shot(P, p, TAG, `mobile-tap-${label}`, { vp: 'mobile' }) });
  }
  rec('mobile-tab-taps', taps);
  const small = (bar?.items || []).filter((i) => i.h && i.h < 44);
  rec('tap-targets-under-44px', small);
  await c.close();
}
save(P, 'p4c.json', out); await browser.close(); console.log('P4c DONE');
