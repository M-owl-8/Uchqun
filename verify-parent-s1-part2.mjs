/**
 * PROD-READINESS-05-S2 — Follow-up: P-008, P-009, P-010, P-013, P-003, P-015, P-020
 * Items that crashed or had wrong selectors in part1
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEACHER_URL = 'https://teacher-production-0647.up.railway.app';
const PARENT_EMAIL = 'parent1@uchqun.uz';
const PARENT_PASS = 'Test@2026';
const TEACHER_EMAIL = 'teacher1@uchqun.uz';
const OUT = 'audits/prod-readiness/screenshots/parent-s1';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

const shot = async (page, name) => {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`📸 ${name}.png`);
};

async function loginAs(ctx, email, pass, waitForPath = '/') {
  const page = await ctx.newPage();
  await page.goto(`${TEACHER_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(u => !u.includes('/login'), { timeout: 12000 });
  } catch {
    console.log(`  ⚠ Login redirect timeout for ${email} — current URL: ${page.url()}`);
  }
  await page.waitForTimeout(2000);
  console.log(`  Logged in as ${email} → ${page.url()}`);
  return page;
}

// ── Desktop: P-008 + P-009 + P-010 ────────────────────────────────────────────
console.log('\n=== P-008/P-009/P-010: Desktop nav + badge + active route ===');
const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const desktopPage = await loginAs(desktopCtx, PARENT_EMAIL, PARENT_PASS);

await shot(desktopPage, 'P-008-desktop-dashboard');

// Verify top nav elements
const headerEl = desktopPage.locator('header');
const headerVis = await headerEl.isVisible().catch(() => false);
console.log('Header visible:', headerVis);

const navLinks = await desktopPage.locator('header nav a, header a').all();
console.log('Nav links in header:', navLinks.length);
for (const link of navLinks) {
  const text = await link.textContent().catch(() => '');
  const href = await link.getAttribute('href').catch(() => '');
  console.log('  nav link:', text.trim(), '→', href);
}

// Bell icon in header
const bellLink = desktopPage.locator('header a[aria-label="Bildirishnomalar"]');
const bellVis = await bellLink.isVisible().catch(() => false);
console.log('Bell link visible:', bellVis);

// Notification badge
const notifBadge = desktopPage.locator('header span').filter({ hasText: /^\d+$|^9\+$/ }).first();
const badgeText = await notifBadge.textContent().catch(() => '');
console.log('Notification badge text:', badgeText);
await shot(desktopPage, 'P-009-badge-on-dashboard');

// Settings icon in header
const settingsLink = desktopPage.locator('header a[aria-label="Sozlamalar"]');
const settingsVis = await settingsLink.isVisible().catch(() => false);
console.log('Settings link visible:', settingsVis);

// ChildSwitcher compact in header
const childSwitcher = desktopPage.locator('header').filter({ hasText: /Bobur/ });
const switcherVis = await childSwitcher.isVisible().catch(() => false);
console.log('ChildSwitcher (Bobur) in header:', switcherVis);

// P-010: desktop active route
await desktopPage.goto(`${TEACHER_URL}/activities`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await desktopPage.waitForTimeout(2000);
await shot(desktopPage, 'P-010-desktop-activities-nav');

// Check active class on nav link
const aktivityLink = desktopPage.locator('header nav a[href="/activities"]');
const activeClass = await aktivityLink.getAttribute('class').catch(() => '');
console.log('activities link class:', activeClass.slice(0, 80));
const isActiveStyle = activeClass.includes('brand-50') || activeClass.includes('brand-700') || activeClass.includes('bg-p');
console.log('Activities link has active brand styles:', isActiveStyle);

// ── P-013: Language switcher (select) ─────────────────────────────────────────
console.log('\n=== P-013: Language switcher ===');
const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const mobilePage = await loginAs(mobileCtx, PARENT_EMAIL, PARENT_PASS);

await mobilePage.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
await shot(mobilePage, 'P-013a-lang-select-uz');

const langSelect = mobilePage.locator('select');
const langSelectVis = await langSelect.isVisible().catch(() => false);
console.log('Language select visible:', langSelectVis);
const currentLang = await langSelect.inputValue().catch(() => '');
console.log('Current language:', currentLang);

if (langSelectVis) {
  // Switch to Russian
  await langSelect.selectOption('ru');
  await mobilePage.waitForTimeout(2000);
  await shot(mobilePage, 'P-013b-lang-ru');
  const ruText = await mobilePage.textContent('h1, h2').catch(() => '');
  console.log('After RU — heading text:', ruText.slice(0, 60));

  // Switch to English
  await langSelect.selectOption('en');
  await mobilePage.waitForTimeout(2000);
  await shot(mobilePage, 'P-013c-lang-en');

  // Back to UZ
  await langSelect.selectOption('uz');
  await mobilePage.waitForTimeout(1000);
}

// ── P-015: Edit profile (using type=tel selector) ─────────────────────────────
console.log('\n=== P-015: Edit profile ===');
await mobilePage.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);

const telInput = mobilePage.locator('input[type="tel"]');
const telVis = await telInput.isVisible().catch(() => false);
console.log('Tel input visible:', telVis);
const telVal = await telInput.inputValue().catch(() => '');
console.log('Current phone value:', telVal);

// Change first name to verify save
const firstNameInput = mobilePage.locator('input[type="text"]').first();
const firstNameVis = await firstNameInput.isVisible().catch(() => false);
if (firstNameVis) {
  await firstNameInput.fill('Hulkar');
  await telInput.fill('+998976723584');
  await shot(mobilePage, 'P-015-edit-filled');

  const saveBtn = mobilePage.locator('button').filter({ hasText: /Saqlash|Save/i }).first();
  const saveBtnVis = await saveBtn.isVisible().catch(() => false);
  console.log('Save button visible:', saveBtnVis);
  if (saveBtnVis) {
    await saveBtn.click();
    await mobilePage.waitForTimeout(2500);
    await shot(mobilePage, 'P-015-after-save');
    const afterText = await mobilePage.textContent('body').catch(() => '');
    const saved = afterText.includes('saqlandi') || afterText.includes('muvaffaqiyatli') || afterText.includes('Yangilandi') || afterText.includes('success');
    console.log('Success indication after save:', saved);
    if (!saved) {
      // Look for toast notification
      const toasts = await mobilePage.locator('[role="alert"]').all();
      console.log('Alert/toast elements:', toasts.length);
    }
  }
}

// ── P-003: Logout ─────────────────────────────────────────────────────────────
console.log('\n=== P-003: Logout ===');
await mobilePage.goto(`${TEACHER_URL}/child`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(3000);
await shot(mobilePage, 'P-003-child-page');

// Find logout / Chiqish button in ChildProfile.jsx
// ChildProfile renders LogoutModal — trigger button should be visible
const allBtns = await mobilePage.locator('button').all();
console.log('Total buttons on /child page:', allBtns.length);
for (const btn of allBtns) {
  const txt = await btn.textContent().catch(() => '');
  if (txt.trim()) console.log('  btn:', JSON.stringify(txt.trim().slice(0, 40)));
}

// Try any button containing logout-related text
const logoutTriggers = await mobilePage.locator('button').filter({ hasText: /[Cc]hiq|[Ll]ogout|[Ee]xit/i }).all();
console.log('Logout-trigger buttons:', logoutTriggers.length);

let loggedOut = false;
if (logoutTriggers.length > 0) {
  await logoutTriggers[0].click();
  await mobilePage.waitForTimeout(1500);
  await shot(mobilePage, 'P-003-logout-modal');

  // Find confirm button in modal
  const confirmBtns = await mobilePage.locator('button').all();
  for (const btn of confirmBtns) {
    const txt = await btn.textContent().catch(() => '');
    if (txt && (txt.includes('Ha,') || txt.toLowerCase().includes('chiq') || txt.toLowerCase().includes('confirm') || txt.toLowerCase().includes('yes'))) {
      const vis = await btn.isVisible().catch(() => false);
      if (vis) {
        console.log('Clicking confirm button:', JSON.stringify(txt.trim()));
        await btn.click();
        await mobilePage.waitForTimeout(2500);
        const postUrl = mobilePage.url();
        loggedOut = postUrl.includes('/login');
        console.log('URL after confirm:', postUrl);
        console.log('✓ P-003 redirected to /login:', loggedOut);
        await shot(mobilePage, 'P-003-after-logout');
        break;
      }
    }
  }
}

if (!loggedOut) {
  console.log('⚠ P-003: Could not find logout button — checking page structure');
  // LogoutModal is in ChildProfile — might need to scroll or find the account section
  const accountBtns = await mobilePage.locator('section button, div.account button').all();
  console.log('Account section buttons:', accountBtns.length);
}

// ── P-020: Real-time socket ────────────────────────────────────────────────────
console.log('\n=== P-020: Real-time dashboard refresh ===');
// Keep parent on dashboard
const parent20Ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const parent20Page = await loginAs(parent20Ctx, PARENT_EMAIL, PARENT_PASS);
await parent20Page.goto(`${TEACHER_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await parent20Page.waitForTimeout(2000);

const beforeText = await parent20Page.textContent('body').catch(() => '');
const beforeActivityNum = (beforeText.match(/Individual reja\s+(\d+)/) || ['', '0'])[1];
console.log('Before teacher action — activity count on dashboard:', beforeActivityNum);
await shot(parent20Page, 'P-020-before-teacher-action');

// Open teacher in separate context
const teacherCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const teacherPage = await loginAs(teacherCtx, TEACHER_EMAIL, PARENT_PASS);
await shot(teacherPage, 'P-020-teacher-logged-in');

// Navigate to chat (teacher sends message to parent1)
await teacherPage.goto(`${TEACHER_URL}/teacher/chat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await teacherPage.waitForTimeout(3000);
await shot(teacherPage, 'P-020-teacher-chat');

// Get socket connection status on parent page
const socketConnected = await parent20Page.evaluate(() => {
  // Check if the socket is connected by looking at the DOM state
  return document.querySelector('[data-socket-status]')?.dataset?.socketStatus;
}).catch(() => 'unknown');
console.log('Socket status from DOM:', socketConnected);

// Wait for any socket events
await parent20Page.waitForTimeout(4000);
const afterText = await parent20Page.textContent('body').catch(() => '');
console.log('Dashboard still loaded after teacher joined:', afterText.includes('BUGUNGI XULOSA'));
await shot(parent20Page, 'P-020-parent-after-teacher-online');

// Code verdict for P-020
console.log('P-020 CODE EVIDENCE: Dashboard.jsx:102-111 — listens to socket events:');
console.log('  activity:created/updated/deleted, meal:created/updated/deleted, media:created/updated/deleted, child:updated');
console.log('  On event: cache.invalidate + loadData() → refetches all 5 endpoints');

await browser.close();
console.log('\nDone. Screenshots in:', OUT);
