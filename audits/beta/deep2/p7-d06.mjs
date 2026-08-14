// P7 / D-06 — the document upload error path. Campaign I recorded that the
// 502 + DOCUMENT_UPLOAD_STORAGE_FAILED path "never fires because the throw
// escapes the controller into errorHandler.js:82", with the throw site
// [UNVERIFIED] because D-08 hid the logs. D-08 is fixed; test it.
import { phase, newBrowser, ctx, login, goto, shot, text, save, ev, PORTALS, pwFor } from './lib.mjs';
import fs from 'fs'; import path from 'path';
const P = phase('P7'); const out = {};
const rec = (k,v)=>{out[k]=v;ev(P,{kind:'p7-d06',step:k,v});console.log(k,JSON.stringify(v).slice(0,520));};
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea735d4a00000000049454e44ae426082','hex');
const F = path.resolve('audits/beta/deep2/P7/fixtures'); fs.mkdirSync(F,{recursive:true});
const FILE = path.join(F,'SIM-d06-doc.png'); fs.writeFileSync(FILE, PNG);
const browser = await newBrowser(true); const { c, p } = await ctx(P, browser, 'd06');
const net=[]; p.on('response', async r=>{ if(!/document|upload/i.test(r.url()))return; let b=''; try{b=(await r.text()).slice(0,300);}catch{} net.push({m:r.request().method(),u:r.url().replace(/^https?:\/\/[^/]+/,''),s:r.status(),b}); });
await login(P,p,'reception','qabul@tmm3.uz',pwFor('qabul@tmm3.uz'),'d06');
await goto(P,p,`${PORTALS.reception}/reception/documents`,'d06','D-06-documents-page',{full:true});
const fi = p.locator('input[type="file"]');
rec('file-inputs', await fi.count());
if (await fi.count()) {
  await fi.first().setInputFiles(FILE);
  await p.waitForTimeout(1500);
  net.length=0;
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.offsetParent&&/Yuklash|Saqlash|Yubor/.test(x.innerText)&&!x.disabled); if(b.length)b[b.length-1].click();});
  await p.waitForTimeout(9000);
  rec('upload', { net:[...net], shot: await shot(P,p,'d06','D-06-document-upload-result',{full:true}),
    message: ((await text(p)).match(/[^\n]*(xato|yuklanmadi|muvaffaqiyat|qayta urinib)[^\n]*/i)||[])[0]?.trim().slice(0,140) ?? null });
}
save(P,'p7-d06.json',out); await c.close(); await browser.close();
