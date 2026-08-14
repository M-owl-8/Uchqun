// P5 — R2 part 2: absence chat thread (teacher→parent→teacher), photo upload
// and cross-account retrieval, plus one edit path and one withdraw path.
import { newBrowser, ctx, login, shot, save, ev, text, acceptParentConsent, PORTALS, PW, RUN } from './lib.mjs';

const b = await newBrowser(true);
const out = {};
const T = PORTALS.teacher;

function rec(k, v) { out[k] = v; ev({ kind: 'comms', step: k, v }); console.log(k, JSON.stringify(v).slice(0, 300)); }

// ── 1. Teacher opens the chat with Sanjar's parent and raises the D3 absence
{
  const { c, p } = await ctx(b, 'teacher-smm2');
  const li = await login(p, 'teacher', 'teacher7@uchqun.uz', PW, 'teacher-smm2');
  if (li.ok) {
    try {
      await p.goto(`${T}/teacher/xabar?tab=chat`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4000);
      await shot(p, 'teacher-smm2', 'chat-conversation-list');
      await p.locator('button', { hasText: 'Rano Yusupova' }).first().click();
      await p.waitForTimeout(3000);
      await shot(p, 'teacher-smm2', 'chat-thread-opened');
      const msg = "SIM-Absence-D3-01 — Sanjar 2026-08-10 kuni kasal deb belgilandi. Ahvoli qanday?";
      await p.locator('textarea').last().fill(msg);
      await shot(p, 'teacher-smm2', 'chat-absence-message-typed');
      await p.locator('button[aria-label="Yuborish"]').first().click();
      await p.waitForTimeout(4000);
      const f = await shot(p, 'teacher-smm2', 'chat-absence-message-sent');
      rec('1-teacher-sends', { msg, shot: f, body: (await text(p)).slice(-500) });
    } catch (e) { rec('1-teacher-sends', { error: e.message }); }

    // ── 3. Photo upload for Sanjar
    try {
      await p.goto(`${T}/teacher/media`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
      await p.locator('button', { hasText: "Media qo'shish" }).first().click();
      await p.waitForTimeout(2000);
      const form = p.locator('form').first();
      await p.locator('select').first().selectOption('78d1f578-956c-42c7-81f5-9eafc994219b');
      await p.locator('input[placeholder="Enter media title"]').fill('SIM-Media-D4 Sanjar mashgulot');
      await p.locator('textarea').first().fill('SIM- beta simulyatsiya surati, 2026-08-11');
      const dt = p.locator('input[type="date"]');
      if (await dt.count()) await dt.first().fill('2026-08-11');
      await p.locator('input[type="file"]').setInputFiles(`${RUN}/sim-photo.png`);
      await p.waitForTimeout(1200);
      await shot(p, 'teacher-smm2', 'media-upload-form-filled');
      await (await form.count() ? form.locator('button[type="submit"]') : p.locator('button', { hasText: 'Yaratish' })).first().click();
      await p.waitForTimeout(1500);
      await shot(p, 'teacher-smm2', 'media-upload-1s-after-submit');
      await p.waitForTimeout(6000);
      const f = await shot(p, 'teacher-smm2', 'media-upload-result');
      rec('3-teacher-uploads-photo', { shot: f, body: (await text(p)).slice(0, 500) });
    } catch (e) { rec('3-teacher-uploads-photo', { error: e.message }); }
  }
  await c.close();
}

// ── 2. Parent reads the absence message and replies; 6. withdraw path
{
  const { c, p } = await ctx(b, 'parent-smm2');
  const li = await login(p, 'parent', 'parent10@uchqun.uz', PW, 'parent-smm2', { tab: /Ota-ona|Parent|Родител/i });
  if (li.ok) {
    await acceptParentConsent(p, 'parent-smm2');
    try {
      await p.goto(`${T}/chat`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4500);
      const f0 = await shot(p, 'parent-smm2', 'chat-sees-teacher-absence-message');
      const seen = (await text(p)).includes('SIM-Absence-D3-01');
      const reply = "SIM-Absence-D3-02 — Rahmat, Sanjar isitmaladi, ertaga keladi.";
      await p.locator('textarea').last().fill(reply);
      await p.locator('button[aria-label="Yuborish"]').first().click();
      await p.waitForTimeout(4000);
      const f = await shot(p, 'parent-smm2', 'chat-parent-reply-sent');
      rec('2-parent-replies', { teacherMsgVisible: seen, reply, shots: [f0, f] });
    } catch (e) { rec('2-parent-replies', { error: e.message }); }

    // 4. parent retrieves the photo the teacher uploaded
    try {
      await p.goto(`${T}/media`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(5000);
      const body = await text(p);
      const f = await shot(p, 'parent-smm2', 'media-gallery-sees-teacher-photo', true);
      rec('4-parent-sees-photo', { visible: body.includes('SIM-Media-D4'), shot: f, body: body.slice(0, 500) });
    } catch (e) { rec('4-parent-sees-photo', { error: e.message }); }

    // 6. withdraw path — send a message, then delete it
    try {
      await p.goto(`${T}/chat`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4500);
      await p.locator('textarea').last().fill('SIM-Withdraw-01 — bu xabar qaytarib olinadi');
      await p.locator('button[aria-label="Yuborish"]').first().click();
      await p.waitForTimeout(4000);
      const fs1 = await shot(p, 'parent-smm2', 'chat-withdraw-message-sent');
      // edit path first
      const editBtns = p.locator('button[aria-label="Tahrirlash"]');
      let fEdit = null;
      if (await editBtns.count()) {
        await editBtns.last().click();
        await p.waitForTimeout(1200);
        const ta = p.locator('textarea');
        await ta.first().fill('SIM-Withdraw-01 — TAHRIRLANDI');
        await shot(p, 'parent-smm2', 'chat-edit-inline-open');
        const saveB = p.locator('button[aria-label]').filter({ hasNotText: 'x' });
        await p.locator('button[aria-label="Saqlash"], button[aria-label="Save"]').first().click().catch(async () => {
          await saveB.last().click();
        });
        await p.waitForTimeout(3500);
        fEdit = await shot(p, 'parent-smm2', 'chat-edit-saved');
      }
      // withdraw (delete) path
      const delBtns = p.locator("button[aria-label=\"O'chirish\"]");
      let fDel = null;
      if (await delBtns.count()) {
        await delBtns.last().click();
        await p.waitForTimeout(1500);
        await shot(p, 'parent-smm2', 'chat-withdraw-confirm-dialog');
        const confirm = p.locator('button', { hasText: /O'chirish|Ha|Tasdiqlash/ }).last();
        await confirm.click();
        await p.waitForTimeout(4000);
        fDel = await shot(p, 'parent-smm2', 'chat-withdraw-done');
      }
      rec('6-parent-edit-and-withdraw', {
        sent: fs1, edited: fEdit, withdrawn: fDel,
        finalBody: (await text(p)).slice(-600),
      });
    } catch (e) { rec('6-parent-edit-and-withdraw', { error: e.message }); }
  }
  await c.close();
}

// ── 5. Teacher sees the parent reply (fresh session) and edits the media title
{
  const { c, p } = await ctx(b, 'teacher-smm2');
  const li = await login(p, 'teacher', 'teacher7@uchqun.uz', PW, 'teacher-smm2');
  if (li.ok) {
    try {
      await p.goto(`${T}/teacher/xabar?tab=chat`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4000);
      await p.locator('button', { hasText: 'Rano Yusupova' }).first().click();
      await p.waitForTimeout(3500);
      const body = await text(p);
      const f = await shot(p, 'teacher-smm2', 'chat-sees-parent-reply');
      rec('5-teacher-sees-reply', { replyVisible: body.includes('SIM-Absence-D3-02'), shot: f });
    } catch (e) { rec('5-teacher-sees-reply', { error: e.message }); }
  }
  await c.close();
}

save('p5-comms.json', out);
await b.close();
console.log('P5 DONE');
