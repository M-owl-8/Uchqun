// P5b — edit path and withdraw path on the parent's own chat message.
// The action row only renders after tapping your own bubble (Chat.jsx isOpen toggle).
import { newBrowser, ctx, login, shot, save, text, acceptParentConsent, PORTALS, PW } from './lib.mjs';

const b = await newBrowser(true);
const { c, p } = await ctx(b, 'parent-smm2');
const out = {};
const li = await login(p, 'parent', 'parent10@uchqun.uz', PW, 'parent-smm2', { tab: /Ota-ona|Parent|Родител/i });
if (li.ok) {
  await acceptParentConsent(p, 'parent-smm2');
  await p.goto(`${PORTALS.teacher}/chat`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  out.before = await shot(p, 'parent-smm2', 'chat-before-edit');

  // EDIT PATH
  try {
    const bubble = p.locator('button', { hasText: 'SIM-Withdraw-01' }).last();
    await bubble.click();
    await p.waitForTimeout(1200);
    out.actionRow = await shot(p, 'parent-smm2', 'chat-own-message-action-row');
    await p.locator('button[aria-label="Tahrirlash"]').last().click();
    await p.waitForTimeout(1200);
    const ta = p.locator('textarea').first();
    await ta.fill('SIM-Withdraw-01 — TAHRIRLANDI 2026-08-14');
    out.editOpen = await shot(p, 'parent-smm2', 'chat-edit-open');
    await p.locator('button[aria-label="Saqlash"]').first().click();
    await p.waitForTimeout(4000);
    out.editDone = await shot(p, 'parent-smm2', 'chat-edit-saved');
    out.editVisible = (await text(p)).includes('TAHRIRLANDI');
  } catch (e) { out.editErr = e.message; }

  // WITHDRAW PATH
  try {
    const bubble2 = p.locator('button', { hasText: 'SIM-Withdraw-01' }).last();
    await bubble2.click();
    await p.waitForTimeout(1200);
    await p.locator("X").last().click();
    await p.waitForTimeout(1500);
    out.confirmDialog = await shot(p, 'parent-smm2', 'chat-withdraw-confirm');
    const yes = p.locator('button', { hasText: /^O'chirish$|^Ha$|^Tasdiqlash$/ }).last();
    await yes.click();
    await p.waitForTimeout(4500);
    out.withdrawDone = await shot(p, 'parent-smm2', 'chat-withdraw-done');
    out.stillVisible = (await text(p)).includes('SIM-Withdraw-01');
  } catch (e) { out.withdrawErr = e.message; }
  out.finalBody = (await text(p)).slice(-700);
}
save('p5b-edit-withdraw.json', out);
console.log(JSON.stringify(out, null, 1).slice(0, 2000));
await c.close(); await b.close();
