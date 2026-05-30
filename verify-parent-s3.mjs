/**
 * PROD-READINESS-05-S3 — Parent portal session 2: P-021 to P-040
 * Child Profile, Activities, Meals, Media
 * Single session — no parallel contexts to stay within API rate limit
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEACHER_URL = 'https://teacher-production-0647.up.railway.app';
const PARENT_EMAIL = 'parent1@uchqun.uz';
const PARENT_PASS = 'Test@2026';
const OUT = 'audits/prod-readiness/screenshots/parent-s3';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`📸 ${name}.png`);
};

// Login
await page.goto(`${TEACHER_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
await page.fill('input[type="email"]', PARENT_EMAIL);
await page.fill('input[type="password"]', PARENT_PASS);
await page.click('button[type="submit"]');
await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
await page.waitForTimeout(2500);
console.log('Logged in →', page.url());

// ── SECTION 5: Child Profile (P-022 to P-027) ────────────────────────────────
console.log('\n=== /child page ===');
await page.goto(`${TEACHER_URL}/child`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000); // enough for all API calls to resolve
await shot('P-022-child-hero');

const childText = await page.textContent('body').catch(() => '');
console.log('Has "Bobur":', childText.includes('Bobur'));
console.log('Has teacher reference:', childText.includes('teacher') || childText.includes("o'qituvchi") || childText.includes('Teacher'));
console.log('Has school ref:', childText.includes('Maktab') || childText.includes('school') || childText.includes('School'));
console.log('Has disability type:', childText.includes('Аутистик') || childText.includes('autism') || childText.includes('buzilish'));
console.log('Has special needs text:', childText.includes('Ko\'p takror') || childText.includes('vizual'));
console.log('Has DOB:', childText.includes('2022') || childText.includes('15.01'));
console.log('Has emotional monitoring section:', childText.includes('hissiy') || childText.includes('emotional') || childText.includes('Hissiy'));
console.log('Has weekly stats:', childText.includes('faoliyat') || childText.includes('ovqat') || childText.includes('Haftalik'));

// P-022: Verify hero section visible
const heroPhoto = page.locator('img, [class*="avatar"], [class*="photo"]').first();
const heroVis = await heroPhoto.isVisible().catch(() => false);
console.log('P-022: Hero photo/avatar visible:', heroVis);

// P-023: Avatar upload modal
const photoArea = page.locator('div.cursor-pointer, button[class*="avatar"], div[class*="avatar"]').first();
const photoVis = await photoArea.isVisible().catch(() => false);
if (photoVis) {
  await photoArea.click();
  await page.waitForTimeout(1500);
  await shot('P-023-avatar-modal');
  const modalText = await page.textContent('body').catch(() => '');
  const hasAvatarModal = modalText.includes('rasm') || modalText.includes('avatar') || modalText.includes('profil') || modalText.includes('yuki');
  console.log('P-023: Avatar modal content visible:', hasAvatarModal);
  // Count avatar options
  const avatarOptions = await page.locator('button img, [data-testid="avatar-option"]').all();
  console.log('P-023: Avatar option count:', avatarOptions.length);
  // Close modal
  const closeBtn = page.locator('button[aria-label="Close"], button[class*="close"], button').filter({ hasText: /×|✕|close/i }).first();
  const closeVis = await closeBtn.isVisible().catch(() => false);
  if (closeVis) await closeBtn.click();
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
} else {
  await shot('P-023-no-click-target');
  console.log('P-023: No clickable photo area found');
}

await page.goto(`${TEACHER_URL}/child`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);
await shot('P-024-child-info-card');

// Scroll down to see more sections
await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(500);
await shot('P-025-special-needs');

await page.evaluate(() => window.scrollTo(0, 800));
await page.waitForTimeout(500);
await shot('P-026-P-027-emotional-weekly');

// Full page scroll check
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await shot('P-022-to-027-full-child-profile');

// ── P-029/P-031: Activities (empty state) ─────────────────────────────────────
console.log('\n=== /activities page ===');
await page.goto(`${TEACHER_URL}/activities`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await shot('P-029-P-031-activities');

const actText = await page.textContent('body').catch(() => '');
const hasEmptyAct = actText.includes("yo'q") || actText.includes('empty') || actText.includes('Faoliyat');
console.log('Activities body has content:', actText.length > 200);
console.log('Activities empty state text:', hasEmptyAct);
// Look for activity cards
const actCards = await page.locator('[class*="card"], [class*="Card"]').all();
console.log('Activity cards:', actCards.length);
// Look for Batafsil button
const batafsil = page.locator('button').filter({ hasText: /Batafsil|Detail/i }).first();
const batVis = await batafsil.isVisible().catch(() => false);
console.log('P-030: Batafsil button visible (needs data):', batVis);

// ── P-032/P-036: Meals (empty state) ─────────────────────────────────────────
console.log('\n=== /meals page ===');
await page.goto(`${TEACHER_URL}/meals`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await shot('P-032-P-036-meals');

const mealText = await page.textContent('body').catch(() => '');
const hasEmptyMeal = mealText.includes("yo'q") || mealText.includes('Ovqat') || mealText.includes('topilmad');
console.log('Meals body has content:', mealText.length > 200);
console.log('Meals empty state text:', hasEmptyMeal);
// Date dropdown
const dateSel = page.locator('select').first();
const dateSelVis = await dateSel.isVisible().catch(() => false);
const dateSelVal = await dateSel.inputValue().catch(() => '');
console.log('P-033: Date dropdown visible:', dateSelVis, '| value:', dateSelVal.slice(0,20));
// Look for meal cards/items
const mealCards = await page.locator('[class*="meal"], [class*="Meal"]').all();
console.log('Meal cards:', mealCards.length);

// ── P-037/P-044: Media (empty state) ─────────────────────────────────────────
console.log('\n=== /media page ===');
await page.goto(`${TEACHER_URL}/media`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await shot('P-037-P-044-media');

const mediaText = await page.textContent('body').catch(() => '');
const hasEmptyMedia = mediaText.includes("yo'q") || mediaText.includes('Media') || mediaText.includes('Rasm');
console.log('Media body has content:', mediaText.length > 200);
console.log('Media empty state text:', hasEmptyMedia);

// P-038: Filter buttons
const filterBtns = await page.locator('button').filter({ hasText: /Barchasi|Photo|Video|all|rasm|video/i }).all();
console.log('P-038: Filter buttons count:', filterBtns.length);
for (const btn of filterBtns.slice(0, 5)) {
  const t = await btn.textContent().catch(() => '');
  console.log('  filter btn:', t.trim());
}

// Media grid items
const mediaItems = await page.locator('img[src], [class*="media-item"], [class*="thumbnail"]').all();
console.log('Media items in grid:', mediaItems.length);

// ── Summary ────────────────────────────────────────────────────────────────────
console.log('\n=== SUMMARY for P-021 to P-040 ===');
console.log('Already ✅ (pre-verified): P-021, P-028, P-030');
console.log('Sections needing screenshots to review: P-022/024/025/026/027, P-031, P-036, P-038, P-044');
console.log('Likely DATA-BLOCKED (no seed data): P-029/033/034/035/037/039/040');

await browser.close();
console.log('\nDone. Screenshots in:', OUT);
