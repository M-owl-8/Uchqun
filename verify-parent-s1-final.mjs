/**
 * PROD-READINESS-05-S2 — Final targeted shots: P-003, P-008, P-009, P-010, P-013, P-015
 * Minimal API calls — sequential contexts, no parallel sessions
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TEACHER_URL = 'https://teacher-production-0647.up.railway.app';
const PARENT_EMAIL = 'parent1@uchqun.uz';
const PARENT_PASS = 'Test@2026';
const OUT = 'audits/prod-readiness/screenshots/parent-s1';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`📸 ${name}.png`);
};

async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${TEACHER_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  await page.fill('input[type="email"]', PARENT_EMAIL);
  await page.fill('input[type="password"]', PARENT_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2500);
  console.log('  Logged in → ', page.url());
  return page;
}

// ── Session A: Mobile — P-009 badge + P-003 logout + P-013 language ───────────
console.log('\n=== Session A: mobile ===');
const ctxA = await browser.newContext({ viewport: { width: 375, height: 812 } });
const pageA = await login(ctxA);

// P-009: notification badge on Bugun tab
await pageA.goto(`${TEACHER_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await pageA.waitForTimeout(3000);
await shot(pageA, 'P-009-home-tab-badge');
// Check count from notification context
const homeTabBadge = pageA.locator('nav a[href="/"] span').first();
const badgeText = await homeTabBadge.textContent().catch(() => '');
const notifCount = await pageA.evaluate(() => {
  // NotificationContext updates the count on mount
  const spans = document.querySelectorAll('nav a span');
  return [...spans].map(s => s.textContent).join(',');
});
console.log('Nav spans (possible badges):', notifCount);
console.log('Home tab badge text:', badgeText);

// P-013: Language switcher
await pageA.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await pageA.waitForTimeout(2000);
await shot(pageA, 'P-013a-settings-uz');

const langSel = pageA.locator('select').first();
const langVal = await langSel.inputValue().catch(() => '');
console.log('Language select current value:', langVal);

await langSel.selectOption('ru');
await pageA.waitForTimeout(1500);
await shot(pageA, 'P-013b-settings-ru');

await langSel.selectOption('en');
await pageA.waitForTimeout(1500);
await shot(pageA, 'P-013c-settings-en');

await langSel.selectOption('uz');
await pageA.waitForTimeout(800);

// P-015: Edit profile (save)
await pageA.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await pageA.waitForTimeout(1500);
const telInp = pageA.locator('input[type="tel"]');
const firstInp = pageA.locator('input[type="text"]').first();
await firstInp.fill('Hulkar');
await telInp.fill('+998976723584');
await shot(pageA, 'P-015-filled');
// Find and click the Saqlash button in the profile section (first form's save btn)
const saveBtns = await pageA.locator('button').filter({ hasText: /Saqlash/i }).all();
console.log('Saqlash buttons:', saveBtns.length);
if (saveBtns.length > 0) {
  await saveBtns[0].click();
  await pageA.waitForTimeout(2500);
  await shot(pageA, 'P-015-after-save');
  const afterTxt = await pageA.textContent('body').catch(() => '');
  console.log('After save — success hint:', afterTxt.includes('saqlandi') || afterTxt.includes('muvaffaqiyatli') || afterTxt.includes('Yangilandi'));
}

// P-003: Logout (on /child page)
await pageA.goto(`${TEACHER_URL}/child`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await pageA.waitForTimeout(3000);
await shot(pageA, 'P-003-child-loaded');

// Find the error-red styled button (LogOut button)
const allBtnsA = await pageA.locator('button').all();
console.log('Buttons on /child:', allBtnsA.length);
for (const b of allBtnsA) {
  const txt = await b.textContent().catch(() => '');
  const cls = await b.getAttribute('class').catch(() => '');
  if (cls && (cls.includes('error') || cls.includes('red') || txt.toLowerCase().includes('exit') || txt.toLowerCase().includes('chiq') || txt.toLowerCase().includes('tizim'))) {
    console.log('  Logout-like button:', JSON.stringify(txt.trim()), 'class includes error:', cls.includes('error'));
  }
}

const logoutBtn = pageA.locator('button.bg-error-50, button[class*="error-50"]').first();
const logoutVis = await logoutBtn.isVisible().catch(() => false);
console.log('Logout button (error-50) visible:', logoutVis);

if (logoutVis) {
  await logoutBtn.click();
  await pageA.waitForTimeout(1500);
  await shot(pageA, 'P-003-logout-modal');

  // Click the red confirm button in the modal
  const confirmBtn = pageA.locator('button.bg-error-600, button[class*="bg-error-600"]').first();
  const confirmVis = await confirmBtn.isVisible().catch(() => false);
  console.log('Confirm button visible:', confirmVis);
  if (confirmVis) {
    await confirmBtn.click();
    await pageA.waitForTimeout(3000);
    const postUrl = pageA.url();
    console.log('✓ P-003 after confirm URL:', postUrl);
    console.log('Redirected to /login:', postUrl.includes('/login'));
    await shot(pageA, 'P-003-after-logout');
  } else {
    // Try by text
    const haBtn = pageA.locator('button').filter({ hasText: /Ha|Chiq|Confirm/i }).last();
    const haVis = await haBtn.isVisible().catch(() => false);
    if (haVis) {
      console.log('Ha/Confirm button text:', await haBtn.textContent());
      await haBtn.click();
      await pageA.waitForTimeout(3000);
      await shot(pageA, 'P-003-after-logout');
      console.log('URL after Ha:', pageA.url());
    }
  }
} else {
  console.log('Logout button not found — listing all buttons:');
  for (const b of allBtnsA) {
    const txt = await b.textContent().catch(() => '');
    if (txt.trim()) console.log(' ', JSON.stringify(txt.trim().slice(0, 50)));
  }
  await shot(pageA, 'P-003-child-debug');
}

await ctxA.close();

// ── Session B: Desktop — P-008 nav + P-009 desktop badge + P-010 active ──────
console.log('\n=== Session B: desktop ===');
const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageB = await login(ctxB);

// P-008: Desktop top nav
await shot(pageB, 'P-008-desktop-nav');
const headerVis = await pageB.locator('header').isVisible().catch(() => false);
console.log('Header visible:', headerVis);
const navLinks = await pageB.locator('header nav a').all();
console.log('Nav links in header:', navLinks.length);
for (const l of navLinks) {
  const t = await l.textContent().catch(() => '');
  const h = await l.getAttribute('href').catch(() => '');
  console.log('  link:', t.trim(), '→', h);
}
// Bell icon
const bellVis = await pageB.locator('header a[aria-label="Bildirishnomalar"]').isVisible().catch(() => false);
console.log('Bell icon visible:', bellVis);
// Settings icon
const settingsVis = await pageB.locator('header a[aria-label="Sozlamalar"]').isVisible().catch(() => false);
console.log('Settings icon visible:', settingsVis);

// P-009: notification badge on desktop bell
const bellBadge = pageB.locator('header a[aria-label="Bildirishnomalar"] span').first();
const bellBadgeTxt = await bellBadge.textContent().catch(() => '');
console.log('Bell badge text:', bellBadgeTxt);
await shot(pageB, 'P-009-desktop-badge');

// P-010: desktop active route
const homeLink = pageB.locator('header nav a[href="/"]');
const homeCls = await homeLink.getAttribute('class').catch(() => '');
console.log('Home link active class (on / route):', homeCls.includes('brand') ? 'HAS brand color ✓' : homeCls.slice(0, 80));

await pageB.goto(`${TEACHER_URL}/activities`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await pageB.waitForTimeout(1500);
await shot(pageB, 'P-010-desktop-activities-active');
const actLink = pageB.locator('header nav a[href="/activities"]');
const actCls = await actLink.getAttribute('class').catch(() => '');
console.log('Activities nav active class:', actCls.includes('brand') ? 'HAS brand color ✓' : actCls.slice(0, 80));

await ctxB.close();

await browser.close();
console.log('\nDone. All screenshots in', OUT);
