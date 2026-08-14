// P4b — capture the verbatim POST /attendance response for the day where the
// teacher marked a child outside their assigned group (D6, Malika = "Uyda").
import { newBrowser, ctx, login, shot, save, PORTALS, PW } from './lib.mjs';

const b = await newBrowser(true);
const { c, p } = await ctx(b, 'teacher-smm2');
const captured = [];
p.on('response', async (r) => {
  if (!/\/api\/v1\/attendance$/.test(r.url()) || r.request().method() !== 'POST') return;
  let body = null; try { body = await r.text(); } catch { /* noop */ }
  captured.push({ status: r.status(), reqBody: r.request().postData(), resBody: body });
});

const li = await login(p, 'teacher', 'teacher7@uchqun.uz', PW, 'teacher-smm2');
if (li.ok) {
  await p.goto(`${PORTALS.teacher}/teacher/attendance`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  await p.locator('input[type="date"]').first().fill('2026-08-13');
  await p.waitForTimeout(2500);
  await p.locator('button', { hasText: 'Hammasi keldi' }).first().click();
  await p.waitForTimeout(800);
  const card = p.locator('button[aria-label^="Malika Ahmedova:"]').first();
  await card.click(); // present -> home_leave
  await p.waitForTimeout(500);
  const lbl = await card.getAttribute('aria-label');
  const s1 = await shot(p, 'teacher-smm2', 'attendance-D6-malika-uyda-marked');
  await p.locator('button', { hasText: /belgilangan ·/ }).first().click();
  await p.waitForTimeout(1500);
  const s2 = await shot(p, 'teacher-smm2', 'attendance-D6-saved-toast');
  await p.waitForTimeout(3000);
  const s3 = await shot(p, 'teacher-smm2', 'attendance-D6-after-save-landing');
  save('p4b-attendance-proof.json', { ariaLabel: lbl, shots: [s1, s2, s3], captured });
  console.log(JSON.stringify({ ariaLabel: lbl, shots: [s1, s2, s3], captured }, null, 1));
}
await c.close(); await b.close();
