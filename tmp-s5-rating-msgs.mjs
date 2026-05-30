import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const APP = 'https://teacher-production-0647.up.railway.app';
const SS_DIR = 'audits/prod-readiness/screenshots/parent-s5';
mkdirSync(SS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.setViewportSize({ width: 375, height: 812 });

// Login
await page.goto(`${APP}/login`);
await page.fill('input[type="email"]', 'parent1@uchqun.uz');
await page.fill('input[type="password"]', 'Test@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// ── RATING PAGE (correct route) ──
await page.goto(`${APP}/rating`);
await page.waitForTimeout(2500);
const rText = await page.textContent('body');
await page.screenshot({ path: `${SS_DIR}/S5-P067-P069-rating-summary.png` });
console.log('\n== RATING PAGE ==');
console.log('URL:', page.url());

const hasStars = (await page.$$('[class*="star"]')).length;
const avgMatch = rText.match(/O'rtacha baho[\s\S]*?(\d[\d.]*)/);
const ratingCount = rText.match(/(\d+) ta baho/);
const hasComment = rText.includes('Zulfiya opa') || rText.includes('professional');
const hasSchool = rText.includes('maktab') || rText.includes('Maktab') || rText.includes('ko\'rsatkich');
console.log(`stars=${hasStars} avgMatch=${avgMatch?.[1]} count=${ratingCount?.[1]} hasComment=${hasComment} hasSchool=${hasSchool}`);

// Scroll down to see school section
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(500);
await page.screenshot({ path: `${SS_DIR}/S5-P070-P072-school-rating.png` });
const rText2 = await page.textContent('body');
const schoolIndicators = rText2.match(/ko'rsatkich|Maktab bahosi|Maktab reytingi|school.*rating/i);
console.log('School section match:', schoolIndicators?.[0]);
console.log('RATING TEXT FULL (600):', rText2.substring(0, 600));

// ── CHILD PROFILE — Messages Modal ──
await page.goto(`${APP}/child`);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SS_DIR}/S5-P079-child-profile-before.png` });

const msgsBtn = await page.$('button:has-text("Mening xabarlarim")');
console.log('\n== CHILD PROFILE ==');
console.log('msgsBtn found:', msgsBtn !== null);

if (msgsBtn) {
  await msgsBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SS_DIR}/S5-P079-msgs-modal.png` });
  const mText = await page.textContent('body');
  console.log('MODAL TEXT (400):', mText.substring(0, 400));

  const hasModalOpen = mText.includes('Xabarlarim') || mText.includes('xabar') || mText.includes('viloyat') || mText.includes('region');
  const hasMsgList = mText.includes('mavzu') || mText.includes('Mavzu') || mText.includes('subject') || mText.includes('S4') || mText.includes('Test');
  const hasEscalateBtn = await page.$('button:has-text("Yuqorilat"), button:has-text("yuqorilat"), button:has-text("Escalat")');
  console.log(`hasModalOpen=${hasModalOpen} hasMsgList=${hasMsgList} hasEscalate=${hasEscalateBtn !== null}`);

  // Check for message items
  const msgItems = await page.$$('[class*="message-item"], [class*="msg-card"], li[class*="message"]');
  console.log(`msgItems found: ${msgItems.length}`);

  await page.screenshot({ path: `${SS_DIR}/S5-P079-msgs-detail.png` });

  // Scroll down in modal
  await page.evaluate(() => {
    const modal = document.querySelector('[class*="modal"], [class*="overlay"], [class*="dialog"]');
    if (modal) modal.scrollTop = 200;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SS_DIR}/S5-P079-msgs-scrolled.png` });
}

await browser.close();
console.log('\nDone');
