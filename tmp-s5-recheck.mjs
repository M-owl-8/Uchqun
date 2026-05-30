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
console.log('After login URL:', page.url());

// ── /rating ──
await page.goto(`${APP}/rating`);
await page.waitForTimeout(2500);
const rText = await page.textContent('body');
console.log('\nRATING URL:', page.url());
console.log('RATING TEXT (400):', rText.substring(0, 400));
await page.screenshot({ path: `${SS_DIR}/S5-P067-rating-correct.png` });

const hasStars = (await page.$$('[class*="star"]')).length;
const hasRatingSummary = rText.includes('reyting') || rText.includes('Reyting') || rText.includes('o\'rtacha');
const hasSchoolSection = rText.includes('maktab') || rText.includes('Maktab') || rText.includes('ko\'rsatkich') || rText.includes('Bilim');
const has404 = rText.includes('404') || rText.includes('topilmadi');
console.log(`hasStars=${hasStars} hasRatingSummary=${hasRatingSummary} hasSchoolSection=${hasSchoolSection} has404=${has404}`);

// ── /child ──
await page.goto(`${APP}/child`);
await page.waitForTimeout(2500);
const cText = await page.textContent('body');
console.log('\nCHILD URL:', page.url());
console.log('CHILD TEXT (400):', cText.substring(0, 400));
await page.screenshot({ path: `${SS_DIR}/S5-child-profile-correct.png` });

// Find all button texts
const btns = await page.$$eval('button', els => els.map(e => e.textContent.trim()).filter(t => t.length > 0));
console.log('Child profile buttons:', btns.slice(0, 20));

// Try to find messages button
const msgBtn = await page.$('button:has-text("xabar"), button:has-text("Xabar"), button:has-text("mening")');
console.log('msgBtn found:', msgBtn !== null);

await browser.close();
