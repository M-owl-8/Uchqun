// S32 gates — cold-load production screenshots:
//   Gate 1: login pages of all portals (government shows real IHMA logo)
//   Gate 2: republic dashboard regional breakdown shows real regions;
//           region accounts still scoped (S22-V1 re-assert)
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'audits/beta/screens';
fs.mkdirSync(OUT, { recursive: true });

const GOV = 'https://government-production.up.railway.app';
const PORTALS = [
  { name: 'government', url: `${GOV}/login` },
  { name: 'admin', url: 'https://admin-production-536f.up.railway.app/login' },
  { name: 'teacher', url: 'https://teacher-production-0647.up.railway.app/login' },
  { name: 'reception', url: 'https://reception-production-ba41.up.railway.app/login' },
];
const PASSWORD = 'Test@2026';

const browser = await chromium.launch({ headless: true });
const results = [];

async function coldPage() {
  // fresh context per shot = cold load, no cache/cookies
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  return { ctx, page: await ctx.newPage() };
}

// ── Gate 1: login pages ──────────────────────────────────────────────
for (const p of PORTALS) {
  const { ctx, page } = await coldPage();
  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/S32-login-${p.name}.png`, fullPage: false });
    if (p.name === 'government') {
      const logo = await page.locator('img[alt="IHMA"]').count();
      results.push(`government login img[alt=IHMA] count=${logo} ${logo >= 1 ? 'PASS' : 'FAIL'}`);
    }
    results.push(`OK login-${p.name}`);
  } catch (e) {
    results.push(`FAIL login-${p.name}: ${e.message}`);
  }
  await ctx.close();
}

// parent portal = teacher app login with parent tab active
{
  const { ctx, page } = await coldPage();
  try {
    await page.goto('https://teacher-production-0647.up.railway.app/login', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1000);
    const tabs = page.locator('button', { hasText: /Ota-ona|Parent|Родитель/i });
    if (await tabs.count()) await tabs.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/S32-login-parent.png`, fullPage: false });
    results.push('OK login-parent (teacher app, parent tab)');
  } catch (e) {
    results.push(`FAIL login-parent: ${e.message}`);
  }
  await ctx.close();
}

// ── Gate 2: government dashboards ────────────────────────────────────
async function govDashboard(email, label) {
  const { ctx, page } = await coldPage();
  try {
    await page.goto(`${GOV}/login`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.fill('#email', email);
    await page.fill('#password', PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL('**/government**', { timeout: 30000 });
    await page.waitForTimeout(4000); // let overview/schools requests settle
    await page.screenshot({ path: `${OUT}/S32-dashboard-${label}.png`, fullPage: true });
    const body = await page.locator('body').innerText();
    const hasUnknown = /Noma'lum mintaqa|Nomaʼlum mintaqa/i.test(body);
    const hasTosh = /Toshkent shahri/.test(body);
    const hasSam = /Samarqand viloyati/.test(body);
    results.push(`${label}: unknownRegion=${hasUnknown} toshkent=${hasTosh} samarqand=${hasSam}`);
    return body;
  } catch (e) {
    results.push(`FAIL dashboard-${label}: ${e.message}`);
    try { await page.screenshot({ path: `${OUT}/S32-dashboard-${label}.png`, fullPage: true }); } catch { /* ignore */ }
    return '';
  } finally {
    await ctx.close();
  }
}

const repub = await govDashboard('gov.republic@uchqun.uz', 'republic');
results.push(`republic counts: toshkent-schools=${(repub.match(/Toshkent Maxsus Maktab/g) || []).length} samarqand-schools=${(repub.match(/Samarqand Maxsus Maktab/g) || []).length}`);

const tosh = await govDashboard('gov.toshkent@uchqun.uz', 'gov-toshkent');
results.push(`gov.toshkent scoping: sees-samarqand-school=${/Samarqand Maxsus Maktab/.test(tosh)} (expect false)`);

const sam = await govDashboard('gov.samarqand@uchqun.uz', 'gov-samarqand');
results.push(`gov.samarqand scoping: sees-toshkent-school=${/Toshkent Maxsus Maktab/.test(sam)} (expect false)`);

await browser.close();
console.log(results.join('\n'));
