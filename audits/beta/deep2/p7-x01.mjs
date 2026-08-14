// P7.6 — X-01 probe. All four APPWRITE_* variables are set (a change from
// Campaign I). Does an actual upload through the product succeed?
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, pwFor } from './lib.mjs';
import fs from 'fs'; import path from 'path';
const P = phase('P7'); const out = {};
const rec = (k, v) => { out[k] = v; ev(P, { kind: 'p7-x01', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 500)); };
// a 1x1 PNG — the smallest lawful image; never a photograph of a real child
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea735d4a00000000049454e44ae426082', 'hex');
const F = path.resolve('audits/beta/deep2/P7/fixtures'); fs.mkdirSync(F, { recursive: true });
const FILE = path.join(F, 'SIM-x01-probe.png'); fs.writeFileSync(FILE, PNG);

const browser = await newBrowser(true);
const { c, p } = await ctx(P, browser, 'x01');
const net = []; p.on('response', async (r) => { if (!/media|upload|document/i.test(r.url())) return; let b=''; try{b=(await r.text()).slice(0,220);}catch{} net.push({ m:r.request().method(), u:r.url().replace(/^https?:\/\/[^/]+/,''), s:r.status(), b }); });
await login(P, p, 'teacher', 'tarbiyachi1@tmm3.uz', pwFor('tarbiyachi1@tmm3.uz'), 'x01');
await goto(P, p, `${PORTALS.teacher}/teacher/media`, 'x01', 'X-01-media-page', { full: true });
await p.locator('button', { hasText: /Media qo'shish|Yuklash|Qo'shish/i }).first().click();
await p.waitForTimeout(2600);
const modal = await shot(P, p, 'x01', 'X-01-upload-modal', { full: true });
const fi = p.locator('input[type="file"]');
rec('file-input', await fi.count());
if (await fi.count()) {
  await fi.first().setInputFiles(FILE);
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    const set = (el, v) => { const pr = el.tagName==='SELECT'?HTMLSelectElement:el.tagName==='TEXTAREA'?HTMLTextAreaElement:HTMLInputElement; Object.getOwnPropertyDescriptor(pr.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
    for (const e of [...document.querySelectorAll('input,select,textarea')].filter(x=>x.offsetParent && x.type!=='file')) {
      if (e.tagName==='SELECT'){const o=[...e.options].map(x=>x.value).filter(Boolean); if(o.length) set(e,o[0]);}
      else if (e.type==='date') set(e,'2026-08-14');
      else set(e,'SIM-X01 tekshiruv rasmi');
    }
  });
  const filled = await shot(P, p, 'x01', 'X-01-upload-filled', { full: true });
  net.length = 0;
  await p.evaluate(() => { const b=[...document.querySelectorAll('button')].filter(x=>x.offsetParent && /Saqlash|Yuklash|Yaratish/.test(x.innerText) && !x.disabled); if(b.length) b[b.length-1].click(); });
  await p.waitForTimeout(9000);
  rec('upload', { filled, modal, net: [...net], after: await shot(P, p, 'x01', 'X-01-upload-result', { full: true }),
    toast: ((await text(p)).match(/(muvaffaqiyat[^\n]*|xato[^\n]*|yuklandi[^\n]*)/i)||[])[0] ?? null });
}
save(P, 'p7-x01.json', out); await c.close(); await browser.close();
