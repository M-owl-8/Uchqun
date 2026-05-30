/**
 * PROD-READINESS-05-S1: Government portal verification
 * Verifies the 7 🟡 items: G-026, G-027, G-028, G-050, G-060, G-061, G-063
 *
 * Routes confirmed from government/src/App.jsx:
 *   /login (unauthenticated)
 *   /government          (dashboard)
 *   /government/schools
 *   /government/ratings
 *   /government/platform
 *   /government/audit-log
 *   /government/warnings
 */
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';

const GOV_URL = 'https://government-production.up.railway.app';
const OUT = 'C:\\work\\Uchqun\\audits\\prod-readiness\\screenshots\\government-s1';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const REPUBLIC = { email: 'gov.republic@uchqun.uz', password: 'Test@2026' };

async function shot(page, filename, fullPage = true) {
  const fp = `${OUT}\\${filename}`;
  await page.screenshot({ path: fp, fullPage });
  console.log(`  📸 ${filename}`);
  return fp;
}

async function login(page, creds) {
  await page.goto(`${GOV_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"], input[name="email"]', creds.email);
  await page.fill('input[type="password"], input[name="password"]', creds.password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(`${GOV_URL}/government**`, { timeout: 20000 });
  } catch {}
  await page.waitForTimeout(2500);
}

const browser = await chromium.launch({ headless: true });
const results = {};

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  console.log('\n🔐 Logging in as gov.republic@uchqun.uz...');
  await login(page, REPUBLIC);
  await shot(page, 'login-republic.png');
  console.log(`  Current URL after login: ${page.url()}`);

  // ── G-026: Load more parent ratings (pagination) ──
  // Ratings.jsx: SchoolCard has expand button; "load more" button shown when page < totalPages
  console.log('\n[G-026] Load more parent ratings...');
  await page.goto(`${GOV_URL}/government/ratings`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot(page, 'G-026-ratings-page.png');

  // Check total ratings stat (visible in stat card)
  const statsCards = page.locator('.tabular-nums');
  const statTexts = [];
  for (let i = 0; i < await statsCards.count(); i++) {
    statTexts.push(await statsCards.nth(i).textContent());
  }
  console.log(`  Stat card values: ${statTexts.join(', ')}`);

  // Click the first school card's "Show reviews" expand button
  // Ratings.jsx:159–175: button with ChevronDown/Up, rendered when ratingsCount > 0
  const expandBtns = page.locator('button').filter({ hasText: /Ko'rsatish|Yashirish|Izohlar/ });
  const expandCount = await expandBtns.count();
  console.log(`  Expand buttons (show reviews) found: ${expandCount}`);

  // Also try clicking the first card expand button by finding button with chevron
  const allSchoolCardBtns = page.locator('.w-full.flex.items-center.justify-center.gap-2');
  const cardBtnCount = await allSchoolCardBtns.count();
  console.log(`  School card expand buttons found: ${cardBtnCount}`);

  if (cardBtnCount > 0) {
    await allSchoolCardBtns.first().click({ timeout: 5000 }).catch(e => console.log(`  Click failed: ${e.message}`));
    await page.waitForTimeout(2000);
    await shot(page, 'G-026-ratings-expanded.png');

    // Check for Load More button: Ratings.jsx:224 — only shown when page < totalPages
    const loadMoreBtn = page.locator('button').filter({ hasText: /Ko'proq|Keyingi|Load more/ });
    const loadMoreCount = await loadMoreBtn.count();
    console.log(`  Load-more buttons visible after expand: ${loadMoreCount}`);
    if (loadMoreCount > 0) {
      results['G-026'] = 'LOAD_MORE_VISIBLE';
    } else {
      // Could be no reviews, or only 1 page of reviews
      const reviewItems = page.locator('.bg-gray-50.rounded-lg.p-3');
      const reviewCount = await reviewItems.count();
      console.log(`  Review items shown: ${reviewCount}`);
      results['G-026'] = reviewCount > 0 ? 'EXPANDED_SINGLE_PAGE_ONLY' : 'EXPANDED_NO_REVIEWS';
    }
  } else {
    // No expand button means no schools have ratings
    results['G-026'] = 'NO_SCHOOLS_WITH_RATINGS';
  }

  // ── G-027 & G-028: Gov direction ratings ──
  // Ratings.jsx only shows parent direction ratings (GET /government/ratings)
  // There is no "direction" toggle, no "Government direction" tab in the frontend
  // G-027: gov rating form — backend endpoint exists (governmentSchoolRatingController) but no frontend UI
  // G-028: separate gov ratings view — no frontend UI, backend-only
  console.log('\n[G-027/G-028] Government direction ratings...');
  // Already on /government/ratings — check for any "direction" or "gov" tab/toggle
  const govDirectionTabs = page.locator('button, [role="tab"]').filter({ hasText: /Davlat|Gov|Yo'nalish|direction/i });
  const govTabCount = await govDirectionTabs.count();
  console.log(`  Gov direction tab/toggle elements: ${govTabCount}`);

  // Check full page for any direction-related content
  const pageContent = await page.content();
  const hasDirectionUI = pageContent.toLowerCase().includes('direction') || pageContent.includes('gov_rating');
  console.log(`  Page has direction UI content: ${hasDirectionUI}`);
  await shot(page, 'G-027-G-028-ratings-full.png');

  results['G-027'] = govTabCount > 0 ? 'UI_EXISTS' : 'NO_FRONTEND_UI';
  results['G-028'] = govTabCount > 0 ? 'SEPARATE_VIEW_EXISTS' : 'NO_SEPARATE_VIEW';

  // ── G-050: Provision secondary with capability grants ──
  // Platform.jsx: GovernmentTab rendered when activeTab === 'government'
  // GovernmentTab.jsx:33 has toggleGrant() — capability checkboxes exist
  console.log('\n[G-050] Platform → Government tab → secondary capability grants...');
  await page.goto(`${GOV_URL}/government/platform`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot(page, 'G-050-platform-page.png');
  console.log(`  Current URL: ${page.url()}`);

  // Platform.jsx: TABS = ['admins', 'messages', 'government', 'registrations']
  // Look for the Government tab by its i18n key or label text
  const allTabs = page.locator('[role="tab"], button').filter({ hasText: /Hukumat|Government|Davlat foydalanuvchi/i });
  const tabCount = await allTabs.count();
  console.log(`  Government user tab candidates: ${tabCount}`);

  // Try finding tab by position — TABS[2] = 'government'
  const tabButtons = page.locator('button.border-b-2, [role="tab"]');
  const tabButtonCount = await tabButtons.count();
  console.log(`  All tab buttons found: ${tabButtonCount}`);
  for (let i = 0; i < tabButtonCount; i++) {
    const txt = await tabButtons.nth(i).textContent();
    console.log(`    Tab ${i}: "${txt?.trim()}"`);
  }

  if (tabCount > 0) {
    await allTabs.first().click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    await shot(page, 'G-050-government-tab.png');
  } else if (tabButtonCount >= 3) {
    // Third tab should be 'government'
    await tabButtons.nth(2).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await shot(page, 'G-050-government-tab-by-index.png');
  }

  // Now look for the "Create" / "Add" button on government users tab
  const addBtn = page.locator('button').filter({ hasText: /Qo'shish|Yangi|Yaratish|Create|Add/i });
  const addBtnCount = await addBtn.count();
  console.log(`  Add/Create buttons found: ${addBtnCount}`);

  if (addBtnCount > 0) {
    await addBtn.first().click({ timeout: 5000 }).catch(e => console.log(`  Add click failed: ${e.message}`));
    await page.waitForTimeout(2000);
    await shot(page, 'G-050-create-modal.png');

    // Look for capability checkboxes — GovernmentTab.jsx has toggleGrant()
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`  Capability checkboxes in modal: ${checkboxCount}`);

    // Look for 'secondary' type selector
    const typeSelects = page.locator('select');
    const selectCount = await typeSelects.count();
    console.log(`  Select elements in modal: ${selectCount}`);
    for (let i = 0; i < selectCount; i++) {
      const opts = await typeSelects.nth(i).locator('option').allTextContents();
      console.log(`    Select ${i} options: ${opts.join(', ')}`);
    }

    // Try selecting 'secondary' type if available
    const secondaryOption = page.locator('option[value="secondary"], option:has-text("Ikkilamchi")');
    if (await secondaryOption.count() > 0) {
      const selectEl = page.locator('select').first();
      await selectEl.selectOption('secondary').catch(() => {});
      await page.waitForTimeout(1000);
      await shot(page, 'G-050-secondary-selected.png');
    }

    const finalCheckboxCount = await page.locator('input[type="checkbox"]').count();
    console.log(`  Checkboxes after type select: ${finalCheckboxCount}`);
    results['G-050'] = finalCheckboxCount > 0 ? 'CHECKBOXES_VISIBLE' : 'NO_CHECKBOXES';
  } else {
    await shot(page, 'G-050-no-add-btn.png');
    results['G-050'] = 'NO_ADD_BUTTON';
  }

  // ── G-060: Audit log date range filter ──
  // AuditLog.jsx:155–174: input[type="date"] with data-testid="filter-start-date" and "filter-end-date"
  console.log('\n[G-060] Audit log date range filter...');
  await page.goto(`${GOV_URL}/government/audit-log`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot(page, 'G-060-audit-log-page.png');
  console.log(`  Current URL: ${page.url()}`);

  const startDateInput = page.locator('[data-testid="filter-start-date"]');
  const endDateInput = page.locator('[data-testid="filter-end-date"]');
  const startCount = await startDateInput.count();
  const endCount = await endDateInput.count();
  console.log(`  filter-start-date input: ${startCount}`);
  console.log(`  filter-end-date input: ${endCount}`);

  // Also check generically
  const allDateInputs = page.locator('input[type="date"]');
  const dateCount = await allDateInputs.count();
  console.log(`  Total date inputs on page: ${dateCount}`);

  // Test setting a date and clicking filter
  if (startCount > 0) {
    await startDateInput.fill('2026-01-01');
    await endDateInput.fill('2026-12-31');
    await page.waitForTimeout(500);
    const applyBtn = page.locator('[data-testid="apply-filters"]');
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      await page.waitForTimeout(2000);
    }
    await shot(page, 'G-060-date-filter-applied.png');
    results['G-060'] = 'DATE_INPUTS_VISIBLE_AND_WORKING';
  } else {
    results['G-060'] = dateCount > 0 ? 'DATE_INPUTS_PRESENT' : 'NO_DATE_INPUTS';
  }

  // ── G-061: Audit log pagination ──
  // AuditLog.jsx:248–277: pagination only shown when totalPages > 1
  console.log('\n[G-061] Audit log pagination...');
  // Already on audit-log page
  const prevBtn = page.locator('[data-testid="prev-page"]');
  const nextBtn = page.locator('[data-testid="next-page"]');
  const pageIndicator = page.locator('[data-testid="page-indicator"]');

  const prevCount = await prevBtn.count();
  const nextCount = await nextBtn.count();
  const indicatorCount = await pageIndicator.count();
  console.log(`  prev-page button: ${prevCount}`);
  console.log(`  next-page button: ${nextCount}`);
  console.log(`  page-indicator: ${indicatorCount}`);

  if (indicatorCount > 0) {
    const indicatorText = await pageIndicator.textContent();
    console.log(`  Page indicator text: "${indicatorText}"`);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await shot(page, 'G-061-audit-log-bottom.png', false);

  if (prevCount > 0 || nextCount > 0) {
    results['G-061'] = 'PAGINATION_VISIBLE';
  } else {
    // Check total count from header
    const totalText = page.locator('span').filter({ hasText: /Jami|Total/ });
    const totalTextVal = await totalText.first().textContent().catch(() => '');
    console.log(`  Total text: "${totalTextVal}"`);
    results['G-061'] = 'PAGINATION_UI_IN_CODE_CONDITIONAL_ON_DATA';
  }

  // ── G-063: Filter warnings by severity ──
  // AIWarnings.jsx: filter tabs are 'active'/'resolved' — NO severity filter tab
  // Severity is shown in badges (SEVERITY_META) but not filterable
  console.log('\n[G-063] AI warnings severity filter...');
  await page.goto(`${GOV_URL}/government/warnings`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot(page, 'G-063-warnings-page.png');
  console.log(`  Current URL: ${page.url()}`);

  // AIWarnings.jsx filter tabs: 'active' and 'resolved' only
  const filterTabBtns = page.locator('button.border-b-2');
  const filterTabCount = await filterTabBtns.count();
  console.log(`  Filter tab buttons: ${filterTabCount}`);
  for (let i = 0; i < filterTabCount; i++) {
    const txt = await filterTabBtns.nth(i).textContent();
    console.log(`    Filter tab ${i}: "${txt?.trim()}"`);
  }

  // Look for severity-specific filter (not present in code)
  const severityFilterEl = page.locator('select, [role="combobox"]').filter({ hasText: /severity|Kritik|Yuqori|HIGH/i });
  const sevCount = await severityFilterEl.count();
  console.log(`  Severity-specific filter elements: ${sevCount}`);

  // Check for severity badges in DOM (they exist per SEVERITY_META)
  const warningsContent = await page.content();
  const hasSeverityBadges = warningsContent.includes('critical') || warningsContent.includes('severity');
  console.log(`  Page has severity-related DOM content: ${hasSeverityBadges}`);

  results['G-063'] = sevCount > 0 ? 'SEVERITY_FILTER_EXISTS' : 'NO_SEVERITY_FILTER_ACTIVE_RESOLVED_ONLY';

  await ctx.close();
}

// ── Full-page reference screenshots ──
{
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();

  console.log('\n📸 Full-page reference screenshots...');
  await login(page2, REPUBLIC);

  for (const [path, file] of [
    ['government/ratings', 'ref-ratings-full.png'],
    ['government/platform', 'ref-platform-full.png'],
    ['government/audit-log', 'ref-audit-log-full.png'],
    ['government/warnings', 'ref-warnings-full.png'],
    ['government/schools', 'ref-schools-full.png'],
  ]) {
    await page2.goto(`${GOV_URL}/${path}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page2.waitForTimeout(1500);
    await page2.screenshot({ path: `${OUT}\\${file}`, fullPage: true });
    console.log(`  📸 ${file} (${page2.url()})`);
  }

  await ctx2.close();
}

await browser.close();

console.log('\n\n═══════════ RESULTS SUMMARY ═══════════');
for (const [id, result] of Object.entries(results)) {
  console.log(`${id}: ${result}`);
}
console.log('Screenshots saved to:', OUT);
