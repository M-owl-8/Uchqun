// P4b — mobile evidence at true viewport size (not fullPage, which misplaces
// fixed elements), label truncation measurement, and the parent action flows.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, DUMP, PORTALS, PW, MOBILE, DESKTOP } from './lib.mjs';

const P = phase('P4');
const B = PORTALS.teacher;
const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p4b', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 420)); };
const T = async (l, fn) => { try { await fn(); } catch (e) { rec(`${l}-ERR`, e.message.split('\n')[0]); } };

const browser = await newBrowser(true);

// ── MOBILE: viewport-sized captures + measurements ────────────────────────
{
  const TAG = 'parent-mobile';
  const { c, p } = await ctx(P, browser, TAG, { viewport: MOBILE, hasTouch: true, isMobile: true });
  await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i, vp: 'mobile' });

  await T('rating-mobile', async () => {
    await goto(P, p, `${B}/rating`, TAG, 'D-32-rating-viewport-top', { vp: 'mobile', defect: 'D-32' });
    const m = await p.evaluate(() => {
      const de = document.documentElement;
      // labels that are visually clipped: scrollWidth exceeds clientWidth, or text ends in an ellipsis
      const clipped = [...document.querySelectorAll('*')]
        .filter((e) => e.children.length === 0 && e.offsetParent && e.textContent.trim())
        .filter((e) => e.scrollWidth > e.clientWidth + 1 || /[…]|\.\.\.$/.test(e.textContent.trim()))
        .map((e) => ({ text: e.textContent.trim().slice(0, 40), clientW: e.clientWidth, scrollW: e.scrollWidth }));
      const bar = document.querySelector('nav');
      const bs = bar ? getComputedStyle(bar) : null;
      return {
        scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
        clipped: clipped.slice(0, 12),
        tabBar: bar ? { position: bs.position, bottom: bs.bottom, rect: bar.getBoundingClientRect().toJSON() } : null,
      };
    });
    rec('rating-mobile-measure', m);
    // scroll to the school criteria block and capture at viewport size
    await p.evaluate(() => { const h = [...document.querySelectorAll('*')].find((e) => /Ko'rsatkichlar bo/.test(e.textContent || '') && e.children.length < 4); if (h) h.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(1200);
    rec('rating-mobile-criteria', { shot: await shot(P, p, TAG, 'D-32-rating-criteria-labels-clipped', { vp: 'mobile', defect: 'D-32' }) });
    // scroll fully right to show there is content off-screen
    await p.evaluate(() => window.scrollTo(document.documentElement.scrollWidth, window.scrollY));
    await p.waitForTimeout(900);
    rec('rating-mobile-scrolled-right', { shot: await shot(P, p, TAG, 'D-32-rating-scrolled-right', { vp: 'mobile', defect: 'D-32' }), scrollX: await p.evaluate(() => window.scrollX) });
  });

  await T('therapy-mobile', async () => {
    await goto(P, p, `${B}/therapy`, TAG, 'D-33-therapy-viewport', { vp: 'mobile', defect: 'D-33' });
    const m = await p.evaluate(() => {
      const de = document.documentElement;
      const over = [...document.querySelectorAll('*')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > de.clientWidth + 2)
        .slice(0, 6).map((e) => ({ tag: e.tagName, cls: String(e.className).slice(0, 40), right: Math.round(e.getBoundingClientRect().right), text: (e.textContent || '').trim().slice(0, 30) }));
      return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, culprits: over };
    });
    rec('therapy-mobile-measure', m);
    await p.evaluate(() => window.scrollTo(document.documentElement.scrollWidth, 0));
    await p.waitForTimeout(900);
    rec('therapy-mobile-scrolled', { shot: await shot(P, p, TAG, 'D-33-therapy-scrolled-right', { vp: 'mobile', defect: 'D-33' }), scrollX: await p.evaluate(() => window.scrollX) });
  });

  await T('tabbar-tap', async () => {
    await goto(P, p, `${B}/`, TAG, 'mobile-dashboard-viewport', { vp: 'mobile' });
    const bar = await p.evaluate(() => {
      const nav = document.querySelector('nav');
      if (!nav) return null;
      const items = [...nav.querySelectorAll('a,button')].map((e) => { const r = e.getBoundingClientRect(); return { label: (e.innerText || '').trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height) }; });
      return { position: getComputedStyle(nav).position, rect: nav.getBoundingClientRect().toJSON(), items };
    });
    rec('mobile-tabbar', bar);
    // tap each tab by touch, not click
    const dest = [];
    for (const label of ['Kundalik', 'Galereya', 'Xabar', 'Bola', 'Bugun']) {
      const el = p.locator('nav a, nav button').filter({ hasText: new RegExp(`^${label}$`) }).first();
      if (!(await el.count())) { dest.push({ label, found: false }); continue; }
      const box = await el.boundingBox();
      await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await p.waitForTimeout(3000);
      dest.push({ label, found: true, url: new URL(p.url()).pathname, shot: await shot(P, p, TAG, `mobile-tab-${label}`, { vp: 'mobile' }) });
    }
    rec('mobile-tab-taps', dest);
  });
  await c.close();
}

// ── DESKTOP: the parent's own actions ─────────────────────────────────────
{
  const TAG = 'parent-desktop';
  const { c, p } = await ctx(P, browser, TAG, DESKTOP);
  const net = [];
  p.on('response', async (r) => { if (!/\/api\/v1\//.test(r.url()) || r.request().method() === 'GET') return; let b = ''; try { b = (await r.text()).slice(0, 200); } catch { /* noop */ } net.push({ m: r.request().method(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), s: r.status(), b }); });
  const since = () => { const n = [...net]; net.length = 0; return n; };
  await login(P, p, 'parent', 'otaona11@tmm3.uz', PW, TAG, { tab: /Ota-ona|Parent/i });

  await T('rate-teacher', async () => {
    await goto(P, p, `${B}/rating`, TAG, 'rate-teacher-before', { full: true });
    const stars = p.locator('button svg, button').filter({ hasText: '' });
    // the teacher star row: click the 5th star in the first rating group
    const clicked = await p.evaluate(() => {
      const groups = [...document.querySelectorAll('div')].filter((d) => d.querySelectorAll('svg').length >= 5 && d.querySelectorAll('button').length >= 5);
      if (!groups.length) return 0;
      const bs = [...groups[0].querySelectorAll('button')].slice(0, 5);
      if (bs[4]) bs[4].click();
      return bs.length;
    });
    await p.waitForTimeout(800);
    const ta = p.locator('textarea').first();
    if (await ta.count()) { await ta.click(); await ta.type('QA-P4B: tarbiyachi bilan aloqa yaxshi, farzandim mamnun.', { delay: 8 }); }
    const filled = await shot(P, p, TAG, 'rate-teacher-filled', { full: true });
    since();
    await p.locator('button', { hasText: /Fikrni yuborish/ }).first().click().catch(() => {});
    await p.waitForTimeout(5000);
    rec('rate-teacher', { starButtons: clicked, filled, net: since(), after: await shot(P, p, TAG, 'rate-teacher-result', { full: true }), toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|yuborildi[^\n]*|rahmat[^\n]*|xato[^\n]*)/i) || [])[0] ?? null });
  });

  await T('parent-chat-send', async () => {
    await goto(P, p, `${B}/chat`, TAG, 'parent-chat-before-send', { full: true });
    const ta = p.locator('textarea').last();
    await ta.click();
    await ta.type('QA-P4B: rahmat, uyda ham mashq qilamiz.', { delay: 8 });
    since();
    const send = p.locator('button[aria-label="Yuborish"], button').filter({ hasText: /Yubor/ }).first();
    await send.click().catch(async () => { await p.locator('button[aria-label="Yuborish"]').first().click(); });
    await p.waitForTimeout(5000);
    rec('parent-chat-send', { net: since(), after: await shot(P, p, TAG, 'parent-chat-sent', { full: true }) });
  });

  await T('parent-reads', async () => {
    for (const [route, action] of [['/journal', 'journal-content'], ['/irr', 'irr-readonly'], ['/media', 'media-empty'], ['/notifications', 'notifications-list'], ['/therapy', 'therapy-list'], ['/meals', 'meals-content'], ['/activities', 'activities-content']]) {
      const f = await goto(P, p, B + route, TAG, action, { full: true });
      const d = await p.evaluate(DUMP);
      rec(`read-${action}`, { route, shot: f, buttons: d.buttons.length, body: (await text(p)).replace(/\n/g, ' | ').slice(0, 240) });
    }
  });

  await T('parent-write-attempts', async () => {
    // a parent must not be able to write attendance or another child's data
    const probes = await p.evaluate(async () => {
      const r = async (u, body) => { const x = await fetch(u, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { u, s: x.status, b: (await x.text()).slice(0, 180) }; };
      return [
        await r('/api/v1/attendance', { records: [{ childId: '5eed0c9a-fe3e-4031-8f5c-aac195c36b31', date: '2026-08-13', status: 'absent' }] }),
        await r('/api/v1/teacher/journal/bulk', { subject: 'x', body: 'y', recipientIds: ['5eed0c9a-fe3e-4031-8f5c-aac195c36b31'] }),
      ];
    });
    const gets = await p.evaluate(async () => {
      const g = async (u) => { const x = await fetch(u, { credentials: 'include' }); const t = await x.text(); return { u, s: x.status, len: t.length, b: t.slice(0, 140) }; };
      return [await g('/api/v1/teacher/children'), await g('/api/v1/attendance?startDate=2026-08-14&endDate=2026-08-14')];
    });
    rec('parent-write-attempts', { posts: probes, gets });
  });

  await T('language-switch', async () => {
    await goto(P, p, `${B}/settings`, TAG, 'settings-before-lang', { full: true });
    const langs = await p.evaluate(() => [...document.querySelectorAll('button,select')].map((e) => (e.innerText || e.value || '').trim()).filter((t) => /uz|ru|en|O'zbek|Рус|Крил/i.test(t)).slice(0, 8));
    rec('language-controls', langs);
  });
  await c.close();
}

save(P, 'p4b.json', out);
await browser.close();
console.log('P4b DONE');
