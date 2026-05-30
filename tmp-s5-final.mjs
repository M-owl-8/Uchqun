import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const APP = 'https://teacher-production-0647.up.railway.app';
const SS_DIR = 'audits/prod-readiness/screenshots/parent-s5';
mkdirSync(SS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 375, height: 812 });

await page.goto(`${APP}/login`);
await page.fill('input[type="email"]', 'parent1@uchqun.uz');
await page.fill('input[type="password"]', 'Test@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// ── RATING PAGE: scroll to school section ──
await page.goto(`${APP}/rating`);
await page.waitForTimeout(2500);

// Get full page text
const rFull = await page.evaluate(() => document.body.innerText);
console.log('\n=== FULL RATING PAGE TEXT (1500 chars) ===');
console.log(rFull.substring(0, 1500));

await page.screenshot({ path: `${SS_DIR}/S5-P067-rating-full-top.png` });
await page.evaluate(() => window.scrollTo(0, 1200));
await page.waitForTimeout(400);
await page.screenshot({ path: `${SS_DIR}/S5-P070-school-rating-scroll.png` });
await page.evaluate(() => window.scrollTo(0, 2400));
await page.waitForTimeout(400);
await page.screenshot({ path: `${SS_DIR}/S5-P072-school-rating-bottom.png` });

// ── CHILD PROFILE: scroll to messages button then click ──
await page.goto(`${APP}/child`);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SS_DIR}/S5-P079-child-top.png` });

// Scroll to bottom to find messages button
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
await page.screenshot({ path: `${SS_DIR}/S5-P079-child-bottom.png` });

const msgsBtn = await page.$('button:has-text("Mening xabarlarim")');
if (msgsBtn) {
  const box = await msgsBtn.boundingBox();
  console.log('\nMeng xabarlarim button box:', JSON.stringify(box));
  await msgsBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await msgsBtn.click();
  await page.waitForTimeout(2500);

  // Check if a modal/overlay appeared
  const fixedEls = await page.$$('[class*="fixed"], [class*="modal"], [class*="overlay"], [class*="dialog"]');
  console.log(`Fixed/modal elements after click: ${fixedEls.length}`);

  const fullText = await page.evaluate(() => document.body.innerText);
  console.log('\nAfter click body text (600):', fullText.substring(0, 600));

  await page.screenshot({ path: `${SS_DIR}/S5-P079-after-msgs-click.png` });

  // Look for message items
  const msgItems = await page.$$eval('*', els =>
    els.filter(e => e.textContent.includes('Viloyat') || e.textContent.includes('viloyat') ||
                    e.textContent.includes('Respublika') || e.textContent.includes('region'))
       .map(e => ({ tag: e.tagName, cls: e.className.substring(0, 50), text: e.textContent.substring(0, 80) }))
       .slice(0, 5)
  );
  console.log('Region-related elements:', JSON.stringify(msgItems, null, 2));
}

await browser.close();
