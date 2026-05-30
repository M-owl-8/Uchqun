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

await page.goto(`${APP}/rating`);
await page.waitForTimeout(3000);

const bodyText = await page.evaluate(() => document.body.innerText);
console.log('FULL RATING PAGE TEXT (1200):');
console.log(bodyText.substring(0, 1200));

const has404 = bodyText.includes('Sahifa topilmadi') && bodyText.includes('404');
const hasSchoolSection = bodyText.includes('Muassasa bahosi') || bodyText.includes('muassasa') || bodyText.includes('Maktab');
const hasSchoolError = bodyText.includes('Muassasa topilmadi');
const hasSchoolRatingForm = bodyText.includes("ko'rsatkich") || bodyText.includes('Bilim') || bodyText.includes('indicator');
const hasSchoolSummary = bodyText.includes("O'rtacha") && bodyText.includes('baho') && bodyText.includes('4');
const hasIndicators = bodyText.includes('parent_indicator') || bodyText.includes('Ko\'rsatkich') || bodyText.includes('1.');

console.log('\n--- School section checks ---');
console.log('has404:', has404);
console.log('hasSchoolSection:', hasSchoolSection);
console.log('hasSchoolError:', hasSchoolError);
console.log('hasSchoolRatingForm:', hasSchoolRatingForm);
console.log('hasSchoolSummary:', hasSchoolSummary);
console.log('hasIndicators:', hasIndicators);

await page.screenshot({ path: `${SS_DIR}/S5-P070-P072-rating-fixed-top.png` });
await page.evaluate(() => window.scrollTo(0, 800));
await page.waitForTimeout(400);
await page.screenshot({ path: `${SS_DIR}/S5-P070-P072-rating-fixed-scroll1.png` });
await page.evaluate(() => window.scrollTo(0, 1600));
await page.waitForTimeout(400);
await page.screenshot({ path: `${SS_DIR}/S5-P070-P072-rating-fixed-scroll2.png` });
await page.evaluate(() => window.scrollTo(0, 2400));
await page.waitForTimeout(400);
await page.screenshot({ path: `${SS_DIR}/S5-P070-P072-rating-fixed-bottom.png` });

await browser.close();
console.log('\nDone');
