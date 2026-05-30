/**
 * PROD-READINESS-05-S1B — Final targeted verification
 * Focus: G-026 expand+load-more, G-027 form submit, G-061 pagination
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const GOV_URL = 'https://government-production.up.railway.app';
const OUT = 'audits/prod-readiness/screenshots/government-s1b';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const shot = async (name) => {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`📸 ${name}.png`);
};

// Login
await page.goto(`${GOV_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.fill('input[type="email"]', 'gov.republic@uchqun.uz');
await page.fill('input[type="password"]', 'Test@2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);

// ── G-026 ─────────────────────────────────────────────────────────────────────
console.log('=== G-026: Load-more ===');
await page.goto(`${GOV_URL}/government/ratings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await shot('G-026-ratings-loaded');

// Total ratings count from summary cards
const statEls = await page.locator('p.text-2xl.font-semibold').all();
for (const el of statEls) {
  const t = await el.textContent().catch(() => '');
  console.log('  stat:', t.trim());
}

// Find school card buttons (they're inside .grid > Card elements, full-width)
// The expand button is inside a Card with className="p-6"
const expandBtns = page.locator('div.grid button.w-full');
const expandCount = await expandBtns.count();
console.log('Expand-like buttons in grid:', expandCount);

for (let i = 0; i < expandCount; i++) {
  const btn = expandBtns.nth(i);
  const txt = await btn.textContent().catch(() => '');
  const visible = await btn.isVisible().catch(() => false);
  console.log(`  grid btn[${i}]: visible=${visible} text="${txt.trim().slice(0,60)}"`);
}

// Click the first visible grid button to expand
if (expandCount > 0) {
  for (let i = 0; i < expandCount; i++) {
    const btn = expandBtns.nth(i);
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(2000);
      console.log('  Clicked expand btn', i);
      break;
    }
  }
  await shot('G-026-after-expand');

  // Look for load-more button
  const allBtns = await page.locator('button').all();
  for (const btn of allBtns) {
    const txt = await btn.textContent().catch(() => '');
    if (txt && (txt.includes('Ko\'proq') || txt.includes('Yana') || txt.includes('more') || txt.includes('More'))) {
      console.log('✓ G-026: Load-more button text:', JSON.stringify(txt.trim()));
    }
  }
}

// ── G-027: Submit a rating ──────────────────────────────────────────────────
console.log('\n=== G-027: Submit rating ===');
await page.goto(`${GOV_URL}/government/schools`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
const firstRow = page.locator('tr.cursor-pointer').first();
if (await firstRow.isVisible().catch(() => false)) {
  await firstRow.click();
  await page.waitForTimeout(2500);
  await shot('G-027-school-detail-final');

  const ranges = page.locator('input[type="range"]');
  const cnt = await ranges.count();
  console.log('Range sliders:', cnt);

  // Fill in the comment and submit
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible().catch(() => false)) {
    await textarea.fill('Maktab ko\'rsatkichlari yuqori darajada — test bahosi');
    await shot('G-027-form-filled');

    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      await shot('G-027-after-submit');
      const toasts = await page.locator('[role="alert"], .toast, [data-testid*="toast"]').all();
      console.log('Toasts/alerts after submit:', toasts.length);
      // Check for success indication on page
      const pageText = await page.textContent('body').catch(() => '');
      const hasSuccess = pageText.includes('muvaffaqiyatli') || pageText.includes('saqlandi') || pageText.includes('success');
      console.log('Page contains success text:', hasSuccess);
    }
  }
}

// ── G-061: Audit log pagination ──────────────────────────────────────────────
console.log('\n=== G-061: Audit log pagination ===');
await page.goto(`${GOV_URL}/government/audit-log`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await shot('G-061-audit-log-final');

const auditRows = await page.locator('tr').count();
console.log('Table rows (inc header):', auditRows);

const prevBtn = page.locator('[data-testid="prev-page"]');
const nextBtn = page.locator('[data-testid="next-page"]');
const prevVis = await prevBtn.isVisible().catch(() => false);
const nextVis = await nextBtn.isVisible().catch(() => false);
console.log('prev-page:', prevVis, '| next-page:', nextVis);

if (nextVis) {
  console.log('✓ G-061: Pagination controls visible');
  await nextBtn.click();
  await page.waitForTimeout(2000);
  await shot('G-061-page-2');
} else {
  console.log('⚠ G-061: Pagination not visible — checking entry count');
  const bodyText = await page.textContent('body').catch(() => '');
  const emptyMatch = bodyText.match(/Yozuvlar topilmadi|topilmad/);
  console.log('Empty state present:', !!emptyMatch);
}

// ── G-028 final (re-confirm direction toggle) ─────────────────────────────────
console.log('\n=== G-028: Direction toggle re-confirm ===');
await page.goto(`${GOV_URL}/government/ratings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
const toggle = page.locator('[data-testid="direction-toggle"]');
const govBtn = page.locator('[data-testid="direction-gov"]');
console.log('toggle visible:', await toggle.isVisible().catch(() => false));
console.log('gov-btn visible:', await govBtn.isVisible().catch(() => false));
await govBtn.click();
await page.waitForTimeout(2000);
await shot('G-028-gov-direction-final');

// ── G-063 final screenshot ─────────────────────────────────────────────────
console.log('\n=== G-063: Severity filter ===');
await page.goto(`${GOV_URL}/government/ai-warnings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
await shot('G-063-warnings-final');
const sevFilter = page.locator('[data-testid="severity-filter"]');
const sevVis = await sevFilter.isVisible().catch(() => false);
console.log('severity-filter visible:', sevVis, '(only shown when warnings.length > 0)');
if (!sevVis) {
  const warningCards = await page.locator('.bg-paper-card').count();
  console.log('Paper-card elements:', warningCards);
  // Code verified: pills render when warnings.length > 0; DATA-BLOCKED for demo screenshots
}

await browser.close();
console.log('\n✅ Done. Screenshots in', OUT);
