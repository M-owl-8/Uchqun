/**
 * Deep login debug for reception and government frontends
 */
import { chromium } from 'playwright';
import fs from 'fs';

const FRONTENDS = {
  reception:  { url: 'https://reception-production-ba41.up.railway.app', email: 'reception@uchqun.uz', pass: 'Reception@2025' },
  government: { url: 'https://government-production.up.railway.app',     email: 'government@uchqun.uz', pass: 'Government@2026' },
};

async function debugLogin(browser, name, config) {
  console.log(`\n══ ${name.toUpperCase()} ══`);
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const consoleLogs = [];
  const networkLogs = [];

  page.on('console', m => { consoleLogs.push(`[${m.type()}] ${m.text()}`); console.log(`  CONSOLE: [${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => { consoleLogs.push(`[PAGE_ERROR] ${e.message}`); console.log(`  PAGE_ERROR: ${e.message}`); });
  page.on('request', r => {
    if (r.url().includes('uchqun') || r.url().includes('railway')) {
      const entry = `REQ: ${r.method()} ${r.url()}`;
      networkLogs.push(entry);
      console.log(`  ${entry}`);
    }
  });
  page.on('response', async r => {
    if (r.url().includes('uchqun') || r.url().includes('railway')) {
      let body = '';
      try { body = await r.text().then(t => t.substring(0, 200)); } catch {}
      const entry = `RES: ${r.status()} ${r.url()} — ${body}`;
      networkLogs.push(entry);
      console.log(`  ${entry}`);
    }
  });

  console.log(`  Loading ${config.url}...`);
  await page.goto(config.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log(`  goto err: ${e.message}`));
  await page.waitForTimeout(3000);
  console.log(`  URL after load: ${page.url()}`);
  await page.screenshot({ path: `C:\\work\\Uchqun\\audit\\evidence\\v4\\screenshots\\debug_${name}_01_load.png` }).catch(() => {});

  // Find all inputs
  const inputs = await page.$$eval('input', els => els.map(el => ({ type: el.type, name: el.name, placeholder: el.placeholder, id: el.id, className: el.className.substring(0, 50) })));
  console.log('  Inputs found:', JSON.stringify(inputs));

  // Find all buttons
  const buttons = await page.$$eval('button', els => els.map(el => ({ type: el.type, text: el.textContent.trim().substring(0, 50), className: el.className.substring(0, 50) })));
  console.log('  Buttons found:', JSON.stringify(buttons));

  // Fill form
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="ail"], input[placeholder*="login"], input[placeholder*="Login"]').first();
  const passInput = page.locator('input[type="password"]').first();

  const emailVisible = await emailInput.isVisible().catch(() => false);
  const passVisible = await passInput.isVisible().catch(() => false);
  console.log(`  Email input visible: ${emailVisible}, Pass input visible: ${passVisible}`);

  if (emailVisible && passVisible) {
    await emailInput.fill(config.email);
    await passInput.fill(config.pass);
    console.log(`  Filled email=${config.email}, pass=***`);

    // Find and click submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Kirish"), button:has-text("Login"), button:has-text("Войти"), button:has-text("Kir"), button:has-text("Submit")').first();
    const submitVisible = await submitBtn.isVisible().catch(() => false);
    console.log(`  Submit button visible: ${submitVisible}`);

    if (!submitVisible) {
      // Try clicking any button
      const allBtns = await page.$$('button');
      console.log(`  Total buttons on page: ${allBtns.length}`);
      for (const btn of allBtns) {
        const txt = await btn.textContent().catch(() => '');
        const typ = await btn.getAttribute('type').catch(() => '');
        console.log(`    button: "${txt.trim()}" type="${typ}"`);
      }
      // Try pressing Enter
      console.log('  Trying Enter key to submit...');
      await passInput.press('Enter');
    } else {
      await submitBtn.click();
      console.log('  Clicked submit button');
    }

    await page.waitForTimeout(5000);
    console.log(`  URL after submit: ${page.url()}`);
    await page.screenshot({ path: `C:\\work\\Uchqun\\audit\\evidence\\v4\\screenshots\\debug_${name}_02_after_submit.png` }).catch(() => {});
  }

  // Save logs
  fs.writeFileSync(`C:\\work\\Uchqun\\audit\\evidence\\v4\\consolelogs\\debug_${name}.txt`,
    [...consoleLogs, '===NETWORK===', ...networkLogs].join('\n'));

  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [name, config] of Object.entries(FRONTENDS)) {
      await debugLogin(browser, name, config);
    }
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });
