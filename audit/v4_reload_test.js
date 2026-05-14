/**
 * Targeted reload persistence test
 * Tests whether session survives page reload in a proper browser context
 */
import { chromium } from 'playwright';

const FRONTENDS = {
  admin:      { url: 'https://admin-production-536f.up.railway.app',      email: 'admin@uchqun.uz',       pass: 'Admin@2026',       dashPath: '/admin' },
  teacher:    { url: 'https://teacher-production-0647.up.railway.app',    email: 'teacher@uchqun.uz',     pass: 'Teacher@2025',     dashPath: '/teacher' },
  reception:  { url: 'https://reception-production-ba41.up.railway.app',  email: 'reception@uchqun.uz',   pass: 'Reception@2025',   dashPath: '/reception' },
  government: { url: 'https://government-production.up.railway.app',      email: 'government@uchqun.uz',  pass: 'Government@2026',  dashPath: '/government' },
};

async function testReload(browser, name, config) {
  console.log(`\n══ ${name.toUpperCase()} RELOAD TEST ══`);
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const requests = [];
  page.on('request', r => { if (r.url().includes('auth/me')) requests.push({ method: r.method(), url: r.url(), time: Date.now() }); });
  page.on('response', async r => {
    if (r.url().includes('auth/me')) {
      const body = await r.json().catch(() => ({}));
      requests.push({ status: r.status(), url: r.url(), body: JSON.stringify(body).substring(0, 100), time: Date.now() });
    }
  });

  // Step 1: Fresh load → login
  await page.goto(config.url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log(`  After load: ${page.url()}`);

  const email = page.locator('input[type="email"]').first();
  const pass = page.locator('input[type="password"]').first();
  const submit = page.locator('button[type="submit"]').first();

  await email.fill(config.email);
  await pass.fill(config.pass);
  await submit.click();

  // Wait for dashboard to appear
  await page.waitForURL(`**${config.dashPath}**`, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log(`  After login: ${page.url()}`);

  // Log localStorage state
  const lsKeys = await page.evaluate(() => Object.keys(localStorage));
  const lsValues = {};
  for (const k of lsKeys) {
    lsValues[k] = (await page.evaluate(key => localStorage.getItem(key), k) || '').substring(0, 50);
  }
  console.log(`  localStorage keys: ${JSON.stringify(lsValues)}`);

  // Log cookies
  const cookies = await ctx.cookies();
  const authCookies = cookies.filter(c => c.name.includes('Token') || c.name.includes('token'));
  console.log(`  Auth cookies: ${authCookies.map(c => `${c.name}(httpOnly=${c.httpOnly},secure=${c.secure},domain=${c.domain})`).join(', ')}`);

  // Step 2: Reload
  requests.length = 0;
  await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log(`  After reload: ${page.url()}`);

  const authMeRequests = requests.filter(r => r.url?.includes('auth/me'));
  const authMeResponses = requests.filter(r => r.status !== undefined);
  console.log(`  /auth/me calls on reload: ${authMeRequests.length}`);
  authMeResponses.forEach(r => console.log(`    → ${r.status} ${r.body}`));

  const survived = !page.url().includes('/login');
  console.log(`  Session survived: ${survived}`);

  // Step 3: Try navigating back if we got redirected to login
  if (!survived) {
    // Try going directly to dashboard - what happens?
    await page.goto(`${config.url}${config.dashPath}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log(`  After direct nav to dashboard: ${page.url()}`);
  }

  await ctx.close();
  return survived;
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = {};
  try {
    for (const [name, config] of Object.entries(FRONTENDS)) {
      results[name] = await testReload(browser, name, config);
    }
  } finally {
    await browser.close();
  }
  console.log('\n══ RESULTS ══');
  for (const [n, r] of Object.entries(results)) {
    console.log(`  ${n}: ${r ? 'PASS' : 'FAIL'}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
