// P5c — withdraw path only. Delete/edit aria-labels use a typographic
// apostrophe (O’chirish, U+2019), so match on the icon-row button text.
import { newBrowser, ctx, login, shot, save, text, acceptParentConsent, PORTALS, PW } from './lib.mjs';

const b = await newBrowser(true);
const { c, p } = await ctx(b, 'parent-smm2');
const out = {};
const li = await login(p, 'parent', 'parent10@uchqun.uz', PW, 'parent-smm2', { tab: /Ota-ona|Parent|Родител/i });
if (li.ok) {
  await acceptParentConsent(p, 'parent-smm2');
  await p.goto(`${PORTALS.teacher}/chat`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  try {
    await p.locator('button', { hasText: 'SIM-Withdraw-01' }).last().click();
    await p.waitForTimeout(1200);
    out.actionRow = await shot(p, 'parent-smm2', 'chat-withdraw-action-row');
    await p.locator('button', { hasText: /chirish/ }).last().click();
    await p.waitForTimeout(1800);
    out.confirm = await shot(p, 'parent-smm2', 'chat-withdraw-confirm-dialog');
    out.confirmText = (await text(p)).slice(-400);
    const yes = p.locator('button', { hasText: /chirish|^Ha$|Tasdiq/ }).last();
    await yes.click();
    await p.waitForTimeout(5000);
    out.done = await shot(p, 'parent-smm2', 'chat-withdraw-done');
    out.stillVisible = (await text(p)).includes('SIM-Withdraw-01');
    out.finalBody = (await text(p)).slice(-600);
  } catch (e) { out.err = e.message; }
}
save('p5c-withdraw.json', out);
console.log(JSON.stringify(out, null, 1).slice(0, 1800));
await c.close(); await b.close();
