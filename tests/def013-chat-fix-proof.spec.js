/**
 * DEF-013 fix proof — realtime chat teacher→parent delivery
 *
 * Root cause: chatController.js:92 called emitToUser(parseInt(parentId,10), ...)
 *   parseInt(uuid, 10) → small int → wrong socket room → parent never received.
 * Fix: pass parentId (UUID string) directly, removing parseInt.
 *
 * Auth pattern mirrors s22v3-blocked-rows.spec.js exactly:
 *   try refresh → save state → return; if 401 → fresh login → save state → return.
 *
 * Tests:
 *   T1 — teacher → parent  (the broken direction, now fixed)
 *   T2 — parent  → teacher (regression — was always working)
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const PORTAL  = 'https://teacher-production-0647.up.railway.app';
const API     = 'https://uchqun-production-b484.up.railway.app';
const AUTH_DIR = path.join(__dirname, '..', '.auth');
const PW      = 'Test@2026';

function authFile(name) {
  for (const prefix of ['recon22-', 's22v3-', '']) {
    const f = path.join(AUTH_DIR, `${prefix}${name}.json`);
    if (fs.existsSync(f)) return f;
  }
  return path.join(AUTH_DIR, `recon22-${name}.json`);
}

// Exact same auth helper as s22v3 spec
async function getAuthPage(browser, name, email) {
  const file = authFile(name);
  if (fs.existsSync(file)) {
    try {
      const ctx  = await browser.newContext({ ignoreHTTPSErrors: true, storageState: file });
      const page = await ctx.newPage();
      await page.goto('about:blank');
      const rr = await page.request.post(`${API}/api/v1/auth/refresh`);
      if (rr.status() === 200) {
        await ctx.storageState({ path: file });
        console.log(`[auth] ${name}: cache hit + refreshed`);
        return page;
      }
      await ctx.close();
      console.log(`[auth] ${name}: refresh expired (${rr.status()}), re-logging in`);
    } catch (e) {
      console.log(`[auth] ${name}: cache error — ${e.message}`);
    }
  }
  try {
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const resp = await page.request.post(`${API}/api/v1/auth/login`, {
      data: { email, password: PW },
      headers: { 'Content-Type': 'application/json' },
    });
    if (resp.status() !== 200) {
      const body = await resp.json().catch(() => null);
      console.error(`[auth] ${name}: login HTTP ${resp.status()} — ${JSON.stringify(body)}`);
      await ctx.close();
      return null;
    }
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await ctx.storageState({ path: file });
    await page.goto('about:blank');
    console.log(`[auth] ${name}: fresh login → saved`);
    return page;
  } catch (e) {
    console.error(`[auth] ${name}: login error — ${e.message}`);
    return null;
  }
}

async function portalGoto(page, url) {
  if (!page) throw new Error('page is null — auth failed');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40_000 });
  // Dismiss PrivacyConsentModal if it appears (parent portal, first-visit consent)
  try {
    const btn = page.locator('[role="dialog"] button').filter({
      hasText: /qabul|accept|agree|roziman/i,
    }).first();
    if (await btn.isVisible({ timeout: 5_000 })) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch { /* no modal */ }
}

// WebSocket frame capture — returns hasPayload(needle) to check if string appeared in WS frames
function attachWsCapture(page) {
  const frames = [];
  page.on('websocket', (ws) => {
    ws.on('framereceived', (frame) => {
      if (frame.payload) frames.push(String(frame.payload));
    });
  });
  return {
    hasPayload: (needle) => frames.some((f) => f.includes(needle)),
    dump: () => frames.slice(-10),
  };
}

// ─── Shared state ─────────────────────────────────────────────────────────────
let browser;
const p = {};  // { teacher1, parent1 } — pages reused across tests

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: false });
  // Sequential logins — avoid simultaneous API hits
  p.teacher1 = await getAuthPage(browser, 'teacher1', 'teacher1@uchqun.uz');
  p.parent1  = await getAuthPage(browser, 'parent1',  'parent1@uchqun.uz');
});

test.afterAll(async () => {
  await browser.close();
});

// ═══════════════════════════════════════════════════════════════════════
// T1 — teacher → parent  (the previously broken direction)
// Before fix: parseInt(uuid) → wrong room → parent never received
// After fix:  UUID passed directly → rooms match → delivered
// ═══════════════════════════════════════════════════════════════════════
test('DEF-013-T1 | teacher sends → parent receives live without reload', async () => {
  const MSG = `DEF013-T1-${Date.now()}`;
  const teacherPage = p.teacher1;
  const parentPage  = p.parent1;

  // ── Parent: open /chat FIRST to establish socket before teacher sends ──
  await portalGoto(parentPage, `${PORTAL}/chat`);
  // Wait for the chat page to render the message textarea (proves auth + page load)
  await parentPage.waitForSelector('textarea', { timeout: 20_000 });
  console.log('[T1] parent chat loaded');

  // Attach WS capture AFTER page is loaded (catches future frames)
  const wsCapture = attachWsCapture(parentPage);

  // ── Teacher: navigate to chat tab ──
  await portalGoto(teacherPage, `${PORTAL}/teacher/xabar?tab=chat`);
  await teacherPage.waitForSelector('.overflow-y-auto button', { timeout: 15_000 }).catch(() => {});

  // Get parent1's first name to identify conversation
  const meResp = await parentPage.request.get(`${API}/api/v1/auth/me`);
  const meBody = await meResp.json().catch(() => ({}));
  const parentFirstName = meBody.data?.firstName || meBody.firstName || 'Hulkar';
  console.log('[T1] parent1 name:', parentFirstName);

  // Click the conversation for parent1
  const conv = teacherPage.locator('.overflow-y-auto button').filter({ hasText: parentFirstName }).first();
  if (await conv.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await conv.scrollIntoViewIfNeeded();
    await conv.click();
    console.log('[T1] opened conversation for:', parentFirstName);
  } else {
    console.log('[T1] name not found — using first conversation');
    const first = teacherPage.locator('.overflow-y-auto button').first();
    if (await first.isVisible({ timeout: 5_000 }).catch(() => false)) await first.click();
  }

  // Type and send
  const teacherTextarea = teacherPage.locator('textarea').last();
  await teacherTextarea.waitFor({ state: 'visible', timeout: 12_000 });
  await teacherTextarea.fill(MSG);
  await teacherTextarea.press('Enter');
  console.log('[T1] teacher sent:', MSG);

  await teacherPage.screenshot({
    path: path.join(__dirname, '..', 'audits', 'beta', 'screens', 'DEF-013-T1-teacher-sent.png'),
  });

  // ── Primary assertion: message appears in parent DOM without reload ──
  // Parent Chat.jsx: socket event 'chat:message' → handleMessage → load() → setMessages
  // Allow 20 s for: HTTP response + socket emit + React re-render + GET /chat/messages
  try {
    await expect(parentPage.getByText(MSG)).toBeVisible({ timeout: 20_000 });
    console.log('[T1] PASS — message appeared in parent DOM live');
    await parentPage.screenshot({
      path: path.join(__dirname, '..', 'audits', 'beta', 'screens', 'DEF-013-T1-parent-received.png'),
    });
  } catch (err) {
    // DOM timed out — dump WS frames for diagnosis
    console.log('[T1] WS frames (last 10):', wsCapture.dump());
    console.log('[T1] socket delivered MSG:', wsCapture.hasPayload(MSG));
    await parentPage.screenshot({
      path: path.join(__dirname, '..', 'audits', 'beta', 'screens', 'DEF-013-T1-parent-timeout.png'),
    });
    throw err;
  }

  // ── Secondary: verify socket WS frame also arrived (belt-and-suspenders) ──
  const socketDelivered = wsCapture.hasPayload(MSG);
  console.log('[T1] socket WS frame check:', socketDelivered);
});

// ═══════════════════════════════════════════════════════════════════════
// T2 — parent → teacher  (regression: was working before, must still work)
// ═══════════════════════════════════════════════════════════════════════
test('DEF-013-T2 | parent sends → teacher receives live without reload (regression)', async () => {
  const MSG = `DEF013-T2-${Date.now()}`;
  const teacherPage = p.teacher1;
  const parentPage  = p.parent1;

  // Teacher: re-open conversation (may have navigated away during T1 teardown)
  const meResp = await parentPage.request.get(`${API}/api/v1/auth/me`);
  const meBody = await meResp.json().catch(() => ({}));
  const parentFirstName = meBody.data?.firstName || meBody.firstName || 'Hulkar';

  // If teacher isn't on chat tab, navigate there
  if (!teacherPage.url().includes('xabar')) {
    await portalGoto(teacherPage, `${PORTAL}/teacher/xabar?tab=chat`);
    await teacherPage.waitForSelector('.overflow-y-auto button', { timeout: 15_000 }).catch(() => {});
  }
  const conv = teacherPage.locator('.overflow-y-auto button').filter({ hasText: parentFirstName }).first();
  if (await conv.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await conv.scrollIntoViewIfNeeded();
    await conv.click();
  }
  // Wait for teacher's message panel textarea
  await teacherPage.locator('textarea').last().waitFor({ state: 'visible', timeout: 12_000 });

  // Parent: navigate back to /chat if needed
  if (!parentPage.url().endsWith('/chat')) {
    await portalGoto(parentPage, `${PORTAL}/chat`);
    await parentPage.waitForSelector('textarea', { timeout: 15_000 });
  }

  // Parent sends message
  const parentTextarea = parentPage.locator('textarea').last();
  await parentTextarea.waitFor({ state: 'visible', timeout: 10_000 });
  await parentTextarea.fill(MSG);
  await parentTextarea.press('Enter');
  console.log('[T2] parent sent:', MSG);

  // Teacher should receive via socket (parent→teacher was never broken)
  await expect(teacherPage.getByText(MSG)).toBeVisible({ timeout: 20_000 });
  console.log('[T2] PASS — parent message appeared in teacher view live');

  await teacherPage.screenshot({
    path: path.join(__dirname, '..', 'audits', 'beta', 'screens', 'DEF-013-T2-teacher-received.png'),
  });
});
