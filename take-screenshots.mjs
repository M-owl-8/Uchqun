import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'https://teacher-production-0647.up.railway.app';
const OUT = 'C:\\tmp\\after';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

async function gotoAndShot(url, filename, fullPage = true) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}\\${filename}`, fullPage });
    console.log(`OK: ${filename}`);
  } catch (e) {
    console.error(`FAILED ${filename}: ${e.message}`);
    // Try to take screenshot anyway
    try { await page.screenshot({ path: `${OUT}\\${filename}`, fullPage }); } catch {}
  }
}

// Login
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}\\login.png` });
console.log('OK: login.png');

await page.fill('input[type="email"], input[name="email"]', 'parent@uchqun.uz');
await page.fill('input[type="password"], input[name="password"]', 'Parent@2025');
await page.click('button[type="submit"]');

// Wait for navigation after login
try {
  await page.waitForURL(`${BASE}/**`, { timeout: 20000 });
  console.log('Login navigation succeeded, URL:', page.url());
} catch (e) {
  console.error('waitForURL failed:', e.message, 'current URL:', page.url());
}
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}\\after-login.png` });
console.log('OK: after-login.png');

// Dashboard
await gotoAndShot(`${BASE}/`, 'dashboard.png');

// Chat
await gotoAndShot(`${BASE}/chat`, 'chat.png');

// Activities
await gotoAndShot(`${BASE}/activities`, 'activities.png');

// Notifications
await gotoAndShot(`${BASE}/notifications`, 'notifications.png');

// IRR page
await gotoAndShot(`${BASE}/irr`, 'irr.png');

// Settings
await gotoAndShot(`${BASE}/settings`, 'settings.png');

// Mobile viewport - MobileTabBar
await page.setViewportSize({ width: 375, height: 812 });
await gotoAndShot(`${BASE}/`, 'mobile-home.png', false);

await browser.close();
console.log('Screenshots complete. Files in', OUT);
