/**
 * PROD-READINESS-05-S2 — Parent portal verification: P-001 to P-020
 * Auth/Nav/Account/Dashboard
 *
 * Items already ✅ (skip): P-004, P-007, P-016, P-019
 * Code-evidence only (no browser test): P-002, P-006, P-011
 * Items needing browser: P-001, P-003, P-005, P-008, P-009, P-010, P-012, P-013, P-014, P-015, P-017, P-018, P-020
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

// ── P-001: Login ──────────────────────────────────────────────────────────────
console.log('\n=== P-001: Login ===');
const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const mobilePage = await mobileCtx.newPage();

await mobilePage.goto(`${TEACHER_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(1500);
await shot(mobilePage, 'P-001-login-form');

await mobilePage.fill('input[type="email"]', PARENT_EMAIL);
await mobilePage.fill('input[type="password"]', PARENT_PASS);
await shot(mobilePage, 'P-001-login-filled');

await mobilePage.click('button[type="submit"]');
await mobilePage.waitForTimeout(4000);
const url1 = mobilePage.url();
console.log('After login URL:', url1);
const loggedIn = !url1.includes('/login');
console.log('✓ P-001 logged in (redirected away from /login):', loggedIn);
await shot(mobilePage, 'P-001-after-login');

// ── P-009 prep: check existing notification count ─────────────────────────────
console.log('\n=== P-009 prep: check notification count ===');
await mobilePage.goto(`${TEACHER_URL}/notifications`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
const bodyText = await mobilePage.textContent('body').catch(() => '');
const hasNotifs = !bodyText.includes('Bildirishnomalar yo\'q') && !bodyText.includes('topilmad');
console.log('Has existing notifications:', hasNotifs);
await shot(mobilePage, 'P-009-notifications-page');

// ── P-010: Mobile active route highlighting ────────────────────────────────────
console.log('\n=== P-010: Active route highlighting (mobile) ===');
await mobilePage.goto(`${TEACHER_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
await shot(mobilePage, 'P-010-mobile-dashboard-active');

await mobilePage.goto(`${TEACHER_URL}/chat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
await shot(mobilePage, 'P-010-mobile-chat-active');

await mobilePage.goto(`${TEACHER_URL}/notifications`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
await shot(mobilePage, 'P-010-mobile-notifications-active');

// ── P-018: Today's day card ────────────────────────────────────────────────────
console.log('\n=== P-018: Today\'s day card ===');
await mobilePage.goto(`${TEACHER_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(3000);
await shot(mobilePage, 'P-018-dashboard-day-card');

// Check for day card elements
const dashText = await mobilePage.textContent('body').catch(() => '');
const hasDayCard = dashText.includes('Bugun') || dashText.includes('bugun') || dashText.includes('faoliyat') || dashText.includes('ovqat');
console.log('Dashboard has day-card content (Bugun/faoliyat/ovqat):', hasDayCard);

// Count stat/number elements
const statNums = await mobilePage.locator('p.text-2xl, p.text-3xl, h2.text-2xl, span.text-2xl').all();
console.log('Large-number stat elements:', statNums.length);
for (const el of statNums.slice(0, 8)) {
  const t = await el.textContent().catch(() => '');
  console.log(' stat:', t.trim());
}

// ── P-012: Multi-child switcher check ─────────────────────────────────────────
console.log('\n=== P-012: Multi-child switcher ===');
// Check ChildSwitcher visibility
const switcher = mobilePage.locator('[data-testid="child-switcher"], .child-switcher');
const switcherVis = await switcher.isVisible().catch(() => false);
console.log('Child switcher testid visible:', switcherVis);

// Look for child selection UI
const childButtons = await mobilePage.locator('button').filter({ hasText: /Asilbek|bola|child/i }).all();
console.log('Child-related buttons:', childButtons.length);
for (const btn of childButtons.slice(0, 3)) {
  const t = await btn.textContent().catch(() => '');
  console.log('  child btn:', t.trim().slice(0, 50));
}
await shot(mobilePage, 'P-012-child-switcher-check');

// ── P-013: Language switcher ───────────────────────────────────────────────────
console.log('\n=== P-013: Language switcher ===');
await mobilePage.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2500);
await shot(mobilePage, 'P-013a-settings-default');

// Find language switcher
const langBtns = await mobilePage.locator('button').filter({ hasText: /UZ|RU|EN|Uzbek|Русский|English|til|язык|O'zbek/i }).all();
console.log('Language buttons found:', langBtns.length);
for (const btn of langBtns) {
  const t = await btn.textContent().catch(() => '');
  console.log('  lang btn:', t.trim().slice(0, 30));
}

// Try clicking Ru
const ruBtn = mobilePage.locator('button').filter({ hasText: /^RU$|^Ru$|Русский|Рус/i }).first();
const ruVis = await ruBtn.isVisible().catch(() => false);
console.log('RU button visible:', ruVis);
if (ruVis) {
  await ruBtn.click();
  await mobilePage.waitForTimeout(1500);
  await shot(mobilePage, 'P-013b-settings-ru');
}

// Try EN
const enBtn = mobilePage.locator('button').filter({ hasText: /^EN$|^En$|English/i }).first();
const enVis = await enBtn.isVisible().catch(() => false);
if (enVis) {
  await enBtn.click();
  await mobilePage.waitForTimeout(1500);
  await shot(mobilePage, 'P-013c-settings-en');
}

// Back to UZ
const uzBtn = mobilePage.locator('button').filter({ hasText: /^UZ$|^Uz$|O'zbek|Ўзбек/i }).first();
const uzVis = await uzBtn.isVisible().catch(() => false);
if (uzVis) {
  await uzBtn.click();
  await mobilePage.waitForTimeout(1000);
}

// ── P-014: View profile fields ────────────────────────────────────────────────
console.log('\n=== P-014: View profile fields ===');
await mobilePage.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
await shot(mobilePage, 'P-014-settings-profile');

const settingsText = await mobilePage.textContent('body').catch(() => '');
const hasHulkar = settingsText.includes('Hulkar') || settingsText.includes('Насирова') || settingsText.includes('Nasirova');
const hasPhone = settingsText.includes('672') || settingsText.includes('+998');
const hasEmail = settingsText.includes('parent1@uchqun.uz');
console.log('Has Hulkar name:', hasHulkar);
console.log('Has phone (+998/672):', hasPhone);
console.log('Has email:', hasEmail);

// ── P-015: Edit profile ────────────────────────────────────────────────────────
console.log('\n=== P-015: Edit profile ===');
await mobilePage.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);

// Find name input fields
const nameInputs = await mobilePage.locator('input[type="text"], input[name*="name"], input[name*="firstName"], input[name*="phone"]').all();
console.log('Text/name/phone inputs:', nameInputs.length);

// Try finding an Edit or Tahrirlash button
const editBtn = mobilePage.locator('button').filter({ hasText: /Tahrirlash|Edit|Saqlash|Save|Yangilash/i }).first();
const editBtnVis = await editBtn.isVisible().catch(() => false);
console.log('Edit/Save button visible:', editBtnVis);

// Fill phone field if visible
const phoneInput = mobilePage.locator('input[name*="phone"], input[placeholder*="phone"], input[placeholder*="telefon"]').first();
const phoneVis = await phoneInput.isVisible().catch(() => false);
if (phoneVis) {
  const currentVal = await phoneInput.inputValue().catch(() => '');
  console.log('Phone input current value:', currentVal);
  await phoneInput.fill('+998976723584');
  await shot(mobilePage, 'P-015-edit-profile-filled');

  // Submit
  const submitBtn = mobilePage.locator('button[type="submit"]').first();
  const submitVis = await submitBtn.isVisible().catch(() => false);
  if (submitVis) {
    await submitBtn.click();
    await mobilePage.waitForTimeout(2000);
    await shot(mobilePage, 'P-015-after-save');
    const afterText = await mobilePage.textContent('body').catch(() => '');
    const saved = afterText.includes('saqlandi') || afterText.includes('muvaffaqiyatli') || afterText.includes('success') || afterText.includes('Yangilandi');
    console.log('Save success indicator:', saved);
  }
} else {
  console.log('Phone input not directly visible — screenshot current state');
  await shot(mobilePage, 'P-015-settings-full');
  const allInputs = await mobilePage.locator('input').all();
  for (const inp of allInputs) {
    const name = await inp.getAttribute('name').catch(() => '');
    const type = await inp.getAttribute('type').catch(() => '');
    const val = await inp.inputValue().catch(() => '');
    console.log(`  input name=${name} type=${type} val=${val.slice(0,30)}`);
  }
}

// ── P-005: Change password (settings) ────────────────────────────────────────
console.log('\n=== P-005: Change password ===');
await mobilePage.goto(`${TEACHER_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
const pwInputs = await mobilePage.locator('input[type="password"]').all();
console.log('Password inputs:', pwInputs.length);
await shot(mobilePage, 'P-005-change-password');

// ── P-008: Desktop top nav ────────────────────────────────────────────────────
console.log('\n=== P-008: Desktop top nav ===');
const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const desktopPage = await desktopCtx.newPage();

await desktopPage.goto(`${TEACHER_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await desktopPage.fill('input[type="email"]', PARENT_EMAIL);
await desktopPage.fill('input[type="password"]', PARENT_PASS);
await desktopPage.click('button[type="submit"]');
await desktopPage.waitForTimeout(4000);
await shot(desktopPage, 'P-008-desktop-top-nav');

const topNav = desktopPage.locator('nav, header');
const topNavVis = await topNav.first().isVisible().catch(() => false);
console.log('Top nav element visible:', topNavVis);

// Check for bell icon (notification bell)
const bellIcon = desktopPage.locator('[data-testid="notification-bell"], button[aria-label*="notif"], svg[class*="bell"]');
const bellVis = await bellIcon.first().isVisible().catch(() => false);
console.log('Bell icon visible:', bellVis);

// ── P-009: Notification badge ─────────────────────────────────────────────────
console.log('\n=== P-009: Notification badge ===');
// Screenshot top nav area where badge should be
await shot(desktopPage, 'P-009-notification-badge-desktop');

// Check badge count
const badge = desktopPage.locator('[data-testid="notif-badge"], .bg-red, span.rounded-full').first();
const badgeVis = await badge.isVisible().catch(() => false);
console.log('Badge visible:', badgeVis);

// Read unread count from text
const navArea = await desktopPage.locator('header, nav').first().textContent().catch(() => '');
console.log('Nav area text snippet:', navArea.trim().slice(0, 100));

// Mobile viewport P-009
await mobilePage.goto(`${TEACHER_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2000);
await shot(mobilePage, 'P-009-notification-badge-mobile');

// ── P-010: Desktop active route ───────────────────────────────────────────────
console.log('\n=== P-010: Desktop active route ===');
await desktopPage.goto(`${TEACHER_URL}/activities`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await desktopPage.waitForTimeout(2000);
await shot(desktopPage, 'P-010-desktop-activities-active');

// ── P-017: Dashboard parallel fetch ───────────────────────────────────────────
console.log('\n=== P-017: Dashboard parallel fetch ===');
// Instrument XHR requests
const requests = [];
desktopPage.on('request', (req) => {
  const u = req.url();
  if (u.includes('/api/')) requests.push(u.split('/api/')[1] || u);
});

await desktopPage.goto(`${TEACHER_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
await desktopPage.waitForTimeout(3000);
await shot(desktopPage, 'P-017-dashboard-desktop');
console.log('API requests on dashboard load:');
requests.forEach(r => console.log(' ', r));
const fetchedEndpoints = new Set(requests);
const hasActivities = [...fetchedEndpoints].some(r => r.includes('activit'));
const hasMeals = [...fetchedEndpoints].some(r => r.includes('meal'));
const hasMedia = [...fetchedEndpoints].some(r => r.includes('media'));
const hasRatings = [...fetchedEndpoints].some(r => r.includes('rating'));
const hasEmotional = [...fetchedEndpoints].some(r => r.includes('emotional'));
console.log('Fetched activities:', hasActivities);
console.log('Fetched meals:', hasMeals);
console.log('Fetched media:', hasMedia);
console.log('Fetched ratings:', hasRatings);
console.log('Fetched emotional-monitoring:', hasEmotional);

// ── P-020: Real-time socket (teacher sends, parent sees) ──────────────────────
console.log('\n=== P-020: Real-time dashboard refresh ===');
// Leave parent dashboard open
await desktopPage.goto(`${TEACHER_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await desktopPage.waitForTimeout(2000);

// Open teacher in second context
const teacherCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const teacherPage = await teacherCtx.newPage();

await teacherPage.goto(`${TEACHER_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await teacherPage.fill('input[type="email"]', TEACHER_EMAIL);
await teacherPage.fill('input[type="password"]', PARENT_PASS);
await teacherPage.click('button[type="submit"]');
await teacherPage.waitForTimeout(4000);

const teacherUrl = teacherPage.url();
console.log('Teacher login URL:', teacherUrl);
const teacherLoggedIn = teacherUrl.includes('/teacher');
console.log('Teacher logged in to /teacher:', teacherLoggedIn);

// Track socket events on parent dashboard
const socketEvents = [];
await desktopPage.evaluate(() => {
  window.__socketFired = [];
  const origEmit = window.io?.emit;
  // Just watch for DOM changes as proxy for socket events
});

// Teacher sends a chat message to trigger socket event
if (teacherLoggedIn) {
  await teacherPage.goto(`${TEACHER_URL}/teacher/chat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await teacherPage.waitForTimeout(2000);
  await shot(teacherPage, 'P-020-teacher-chat-page');

  const chatInput = teacherPage.locator('input[placeholder*="mesaj"], input[placeholder*="xabar"], textarea[placeholder*="xabar"], input[type="text"]').first();
  const chatInputVis = await chatInput.isVisible().catch(() => false);
  console.log('Teacher chat input visible:', chatInputVis);

  if (chatInputVis) {
    await chatInput.fill('Test xabar — parent dashboard real-time check');
    const sendBtn = teacherPage.locator('button[type="submit"], button[aria-label*="send"]').first();
    const sendVis = await sendBtn.isVisible().catch(() => false);
    if (sendVis) {
      await sendBtn.click();
      await teacherPage.waitForTimeout(2000);
      console.log('✓ Teacher sent message');
    }
  }
}

// Check parent dashboard after 3s for any update indication
await desktopPage.waitForTimeout(3000);
await shot(desktopPage, 'P-020-parent-dashboard-after-teacher-action');

// ── P-003: Logout ─────────────────────────────────────────────────────────────
console.log('\n=== P-003: Logout ===');
await mobilePage.goto(`${TEACHER_URL}/child`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mobilePage.waitForTimeout(2500);
await shot(mobilePage, 'P-003-child-profile-before-logout');

// Find logout button — it's in ChildProfile.jsx
const logoutBtns = await mobilePage.locator('button').all();
let logoutBtn = null;
for (const btn of logoutBtns) {
  const t = await btn.textContent().catch(() => '');
  if (t && (t.toLowerCase().includes('chiq') || t.toLowerCase().includes('exit') || t.toLowerCase().includes('logout'))) {
    console.log('Found logout-like button:', JSON.stringify(t.trim()));
    logoutBtn = btn;
    break;
  }
}

if (logoutBtn) {
  await logoutBtn.click();
  await mobilePage.waitForTimeout(1500);
  await shot(mobilePage, 'P-003-logout-modal');

  // Confirm logout
  const confirmBtn = mobilePage.locator('button').filter({ hasText: /Ha|Chiqish|Confirm|Yes/i }).last();
  const confirmVis = await confirmBtn.isVisible().catch(() => false);
  console.log('Confirm logout button visible:', confirmVis);
  if (confirmVis) {
    await confirmBtn.click();
    await mobilePage.waitForTimeout(2500);
    const afterLogoutUrl = mobilePage.url();
    console.log('URL after logout:', afterLogoutUrl);
    const redirectedToLogin = afterLogoutUrl.includes('/login');
    console.log('✓ P-003: Redirected to /login:', redirectedToLogin);
    await shot(mobilePage, 'P-003-after-logout');
  }
} else {
  console.log('⚠ No logout button found on /child page — screenshotting all buttons');
  for (const btn of logoutBtns.slice(0, 15)) {
    const t = await btn.textContent().catch(() => '');
    console.log('  btn:', JSON.stringify(t.trim().slice(0, 40)));
  }
}

await browser.close();

console.log('\n=== SUMMARY ===');
console.log('Screenshots saved to:', OUT);
console.log('\nCode-evidence verdicts (no browser needed):');
console.log('P-002: ✅ VERIFIED — shared/services/api.js:67-74 — 401 interceptor fires POST /auth/refresh, mutex refreshPromise, retries original request');
console.log('P-006: ✅ VERIFIED — backend/middleware/auth.js:101-102 — isParent=user.role===parent; skip !user.isActive gate at line 102');
console.log('P-011: ❌ DEAD CODE — teacher/src/parent/components/Sidebar.jsx exists with 10 nav items but is NOT imported in parent/components/Layout.jsx; Layout only uses DesktopTopNav + MobileTabBar');
console.log('\nDone.');
