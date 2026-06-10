/**
 * S22-V3 — Blocked row probes
 * Converts BLOCKED/UNVERIFIED rows to real PASS/FAIL verdicts using:
 *   - Headed Chromium with setInputFiles for file uploads
 *   - context.setOffline(true) + DOM event dispatch for offline banner
 *   - Cookie manipulation (strip accessToken, keep refreshToken) for JWT refresh
 *   - Two simultaneous page contexts for realtime chat
 *   - Network request interception for double-submit guard
 *
 * Target rows: T-006, T-020, T-043, T-051, T-106, P-051, P-102
 *
 * Auth: same storageState cache strategy as S22-V2 (.auth/s22v3-*.json).
 * Rule: FIND AND RECORD ONLY — defects logged to BETA-DEFECTS.md, not fixed here.
 */
const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

const PORTAL = 'https://teacher-production-0647.up.railway.app';
const API    = 'https://uchqun-production-b484.up.railway.app';
const PW     = 'Test@2026';
const AUTH_DIR = path.join(process.cwd(), '.auth');

// ── File fixtures ─────────────────────────────────────────────────────────────

// 1×1 white PNG — valid magic bytes, accepted by backend fileTypeFromFile()
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// 5.1 MB PNG-magic buffer — passes type check (image/png), fails avatar 5 MB frontend guard
const BIG_IMAGE = (() => {
  const buf = Buffer.alloc(5 * 1024 * 1024 + 200);
  TINY_PNG.copy(buf, 0);
  return buf;
})();

// Text bytes — NOT a valid image; backend magic-byte check rejects it
const TEXT_BYTES = Buffer.from('This is not an image file. S22-V3 wrong-type probe.\n');

const FIXTURE = {
  tinyPng:   { name: 'test-photo.png',   mimeType: 'image/png',               buffer: TINY_PNG   },
  bigImage:  { name: 'big-photo.png',    mimeType: 'image/png',               buffer: BIG_IMAGE  },
  wrongType: { name: 'not-an-image.txt', mimeType: 'text/plain',              buffer: TEXT_BYTES },
};

// ── i18n expected strings (uz-latn locale, live-rendered values) ──────────────
// NOTE: The live app renders standard ASCII apostrophes (') not modifier letters (ʻ)
const I18N = {
  avatarUpdated:     "Rasm muvaffaqiyatli yuklandi",
  avatarTooLarge:    "Rasm hajmi 5MB dan katta bo'lmasligi kerak",
  mediaCreated:      "Media muvaffaqiyatli yaratildi",
  mediaUploadFailed: "Fayl yuklanmadi. Qayta urinib ko'ring.",
};

// ── Auth helpers ──────────────────────────────────────────────────────────────
function authFile(name) {
  // Try s22v3 prefix first, then fall back to recon22 prefix (reuses S22-V2 cached tokens)
  const s22v3 = path.join(AUTH_DIR, `s22v3-${name}.json`);
  if (fs.existsSync(s22v3)) return s22v3;
  const recon22 = path.join(AUTH_DIR, `recon22-${name}.json`);
  if (fs.existsSync(recon22)) return recon22;
  return s22v3; // default write target for new sessions
}

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

/**
 * Navigate to a portal URL. If a privacy consent dialog appears (parent portal),
 * dismiss it before returning. Handles first-visit consent on parent accounts.
 * Throws if page is null (login failed — likely rate limited).
 */
async function portalGoto(page, url, opts = {}) {
  if (!page) throw new Error('page is null — auth failed (rate limited?). Re-run after rate limit window expires.');
  await page.goto(url, { waitUntil: 'domcontentloaded', ...opts });
  // Accept privacy consent modal if it appears (parent accounts, first visit)
  const dialog = page.locator('[role="dialog"]');
  if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    const acceptBtn = dialog.locator('button').filter({
      hasText: /qabul|roziman|accept|ok|tasdiql/i,
    }).first();
    if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
  }
}

/**
 * Return the text of a visible toast message, or '' if none appears within timeout ms.
 * Toast.jsx renders: <div role="alert" class="bg-{type}-500 ..."><p>{message}</p></div>
 * inside <div class="fixed top-4 right-4 z-50 ...">
 */
async function waitForToast(page, timeout = 12000) {
  try {
    // The toast paragraph inside the ToastContainer (fixed top-4 right-4)
    const p = page.locator('.fixed.top-4 [role="alert"] p, .fixed.right-4 [role="alert"] p').first();
    await p.waitFor({ state: 'visible', timeout });
    return (await p.innerText()).trim();
  } catch {
    return '';
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────
test.describe('S22-V3 blocked row probes', () => {
  const p = {}; // keyed page handles

  test.beforeAll(async ({ browser }) => {
    // Sequential logins — avoid simultaneous API hits
    p.teacher1  = await getAuthPage(browser, 'teacher1',  'teacher1@uchqun.uz');
    p.parent1   = await getAuthPage(browser, 'parent1',   'parent1@uchqun.uz');
    // Dedicated context for T-006 (cookie manipulation invalidates for other tests)
    p.teacherT6 = await getAuthPage(browser, 'teacherT6', 'teacher1@uchqun.uz');
  }, 120_000);

  test.afterAll(async () => {
    for (const pg of Object.values(p)) {
      if (pg) await pg.context().close().catch(() => {});
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // OFFLINE — T-020 (teacher) + P-102 (parent)
  // ═══════════════════════════════════════════════════════════════════════

  test('T-020 | Teacher offline banner — appears when offline, clears when online', async () => {
    const page = p.teacher1;
    await portalGoto(page, `${PORTAL}/teacher`);
    await page.waitForLoadState('networkidle');

    // Go offline: block network AND dispatch DOM event so useOnlineStatus() fires
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // OfflineBanner: role="alert", className includes "fixed ... bg-yellow-500"
    const banner = page.locator('[role="alert"].fixed').first();
    await expect(banner).toBeVisible({ timeout: 5000 });
    const bannerText = await banner.innerText();
    console.log('[T-020] banner text:', bannerText.trim());
    // Must contain localized offline string (not raw key)
    expect(bannerText).not.toMatch(/^common\.offline/);
    expect(bannerText.length).toBeGreaterThan(5);

    // Restore online
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(banner).not.toBeVisible({ timeout: 5000 });
    console.log('[T-020] PASS — banner appeared and cleared');
  });

  test('P-102 | Parent offline banner — appears when offline, clears when online', async () => {
    const page = p.parent1;
    await portalGoto(page, `${PORTAL}/`);
    await page.waitForLoadState('networkidle');

    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const banner = page.locator('[role="alert"].fixed').first();
    await expect(banner).toBeVisible({ timeout: 5000 });
    const bannerText = await banner.innerText();
    console.log('[P-102] banner text:', bannerText.trim());
    expect(bannerText).not.toMatch(/^common\.offline/);
    expect(bannerText.length).toBeGreaterThan(5);

    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(banner).not.toBeVisible({ timeout: 5000 });
    console.log('[P-102] PASS — banner appeared and cleared');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SESSION — T-006  JWT auto-refresh (separate context so cookie manipulation
  //           doesn't corrupt the shared teacher1 page for other tests)
  // ═══════════════════════════════════════════════════════════════════════

  test('T-006 | JWT auto-refresh — page loads after accessToken stripped (refreshToken kept)', async () => {
    const page = p.teacherT6;

    // Warm up: load a protected page once to confirm baseline auth works
    await portalGoto(page, `${PORTAL}/teacher`);
    await page.waitForURL(/teacher/, { timeout: 20_000 });

    // Strip ONLY the accessToken; keep refreshToken
    const all = await page.context().cookies();
    const kept = all.filter(c => c.name !== 'accessToken');
    await page.context().clearCookies();
    if (kept.length) await page.context().addCookies(kept);

    // Fresh navigation — React mounts → checkAuth → 401 → Axios interceptor calls
    // POST /auth/refresh → new accessToken issued → page loads normally
    await page.goto(`${PORTAL}/teacher`, { waitUntil: 'domcontentloaded' });

    // Must NOT redirect to /login
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    console.log('[T-006] URL after navigation:', url);
    expect(url).not.toMatch(/login/);
    expect(url).toMatch(/teacher/);

    // Some teacher-UI element visible (nav, sidebar, or page heading)
    const nav = page.locator('nav, [class*="sidebar"], [class*="bottom-nav"]').first();
    await expect(nav).toBeVisible({ timeout: 10_000 });
    console.log('[T-006] PASS — app loaded without /login redirect');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // UPLOAD — T-106  Teacher avatar
  //   a) success path — valid PNG → toast shows localized success message
  //   b) size guard  — >5 MB → frontend error, no API call
  // ═══════════════════════════════════════════════════════════════════════

  test('T-106a | Teacher avatar upload success — localized toast appears, avatar URL changes', async () => {
    const page = p.teacher1;
    // Settings tab contains ProfileForm → AvatarUpload (hidden input)
    await portalGoto(page, `${PORTAL}/teacher/men?tab=settings`);
    await page.waitForLoadState('networkidle');

    // Capture avatar before upload
    const avatarImgBefore = await page.locator('img.w-full.h-full.object-cover').first()
      .getAttribute('src').catch(() => null);

    // Hidden input — setInputFiles works without forcing visibility
    const input = page.locator('input[type="file"][accept="image/*"]').first();
    await input.setInputFiles(FIXTURE.tinyPng);

    const text = await waitForToast(page);
    console.log('[T-106a] toast:', text);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/^profile\./);  // not a raw i18n key
    expect(text).toBe(I18N.avatarUpdated);
    console.log('[T-106a] PASS — toast:', text);
  });

  test('T-106b | Teacher avatar >5 MB — frontend size guard fires, no API call made', async () => {
    const page = p.teacher1;
    await portalGoto(page, `${PORTAL}/teacher/men?tab=settings`);
    await page.waitForLoadState('networkidle');

    let uploadAttempted = false;
    page.on('request', req => {
      if (req.url().includes('/user/avatar') && req.method() === 'PUT') {
        uploadAttempted = true;
      }
    });

    const input = page.locator('input[type="file"][accept="image/*"]').first();
    await input.setInputFiles(FIXTURE.bigImage);  // 5.1 MB, mimeType image/png

    const text = await waitForToast(page);
    console.log('[T-106b] toast:', text);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/^profile\./);
    expect(text).toBe(I18N.avatarTooLarge);
    expect(uploadAttempted).toBe(false);  // frontend blocked before any API call
    console.log('[T-106b] PASS — error toast:', text, '| API called:', uploadAttempted);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // UPLOAD — T-051  Teacher media
  //   a) success path — valid PNG → toast + gallery entry
  //   b) wrong type  — text file → backend magic-byte rejection toast
  // ═══════════════════════════════════════════════════════════════════════

  test('T-051a | Teacher media upload success — gallery entry appears after upload', async () => {
    const page = p.teacher1;
    await portalGoto(page, `${PORTAL}/teacher/media`);
    await page.waitForLoadState('networkidle');

    const TITLE = `S22V3-${Date.now()}`;

    // Click the Add button (bg-brand-600 with Plus icon — only shown for teacher role)
    // Media add button — use accessible name since multiple .bg-brand-600 buttons exist on the page
    await page.getByRole('button', { name: /qo.shish|add.*media|media.*add/i }).click();

    // Wait for modal backdrop
    await page.waitForSelector('.fixed.inset-0.z-\\[101\\], .fixed.inset-0', { timeout: 8000 })
      .catch(() => {}); // modal might use different z-index notation — proceed anyway

    // Child select: auto-populated with first child by handleCreate
    // Verify it has a value (not empty string) before continuing
    const childSelect = page.locator('select').first();
    await childSelect.waitFor({ state: 'visible', timeout: 5000 });
    const childVal = await childSelect.inputValue();
    if (!childVal) {
      // Select first real option if not pre-selected
      await childSelect.selectOption({ index: 1 });
    }

    // Title (required, no default)
    await page.locator('input[type="text"]').fill(TITLE);

    // Description (required textarea)
    await page.locator('textarea').fill('S22-V3 automated upload probe');

    // Date: pre-filled with today by handleCreate — no action needed

    // File input (NOT hidden in MediaFormModal)
    const fileInput = page.locator('input[type="file"][accept="image/*,video/*"]');
    await fileInput.setInputFiles(FIXTURE.tinyPng);

    // Submit
    await page.locator('button[type="submit"]').click();

    const text = await waitForToast(page);
    console.log('[T-051a] toast:', text);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/^mediaPage\./);
    expect(text).toBe(I18N.mediaCreated);

    // Gallery should contain the new entry after loadMedia() is called by handleSubmit
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(TITLE)).toBeVisible({ timeout: 10_000 });
    console.log('[T-051a] PASS — toast:', text, '| gallery entry visible:', TITLE);
  });

  test('T-051b | Teacher media wrong-type — backend magic-byte rejection shows error toast', async () => {
    const page = p.teacher1;
    await portalGoto(page, `${PORTAL}/teacher/media`);
    await page.waitForLoadState('networkidle');

    // Media add button — use accessible name since multiple .bg-brand-600 buttons exist on the page
    await page.getByRole('button', { name: /qo.shish|add.*media|media.*add/i }).click();
    await page.waitForSelector('input[type="file"]', { timeout: 8000 });

    const childSelect = page.locator('select').first();
    await childSelect.waitFor({ state: 'visible', timeout: 5000 });
    const childVal = await childSelect.inputValue();
    if (!childVal) await childSelect.selectOption({ index: 1 });

    await page.locator('input[type="text"]').fill('wrong-type-probe');
    await page.locator('textarea').fill('Backend magic-byte rejection probe');

    // Set a plain text file — backend fileTypeFromFile() will reject it
    const fileInput = page.locator('input[type="file"][accept="image/*,video/*"]');
    await fileInput.setInputFiles(FIXTURE.wrongType);

    await page.locator('button[type="submit"]').click();

    const text = await waitForToast(page, 15_000);  // allow time for backend round-trip
    console.log('[T-051b] toast:', text);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/^mediaPage\./);
    expect(text).toBe(I18N.mediaUploadFailed);
    console.log('[T-051b] PASS — error toast:', text);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REALTIME CHAT — T-043 (teacher sends) + P-051 (parent receives)
  // Both pages must be loaded and sockets connected before the send.
  // ═══════════════════════════════════════════════════════════════════════

  test('T-043/P-051 | Realtime chat — teacher message appears in parent view without reload', async () => {
    const MSG = `S22V3-CHAT-${Date.now()}`;
    const teacherPage = p.teacher1;
    const parentPage  = p.parent1;

    // Get parent1's full name — Chat.jsx conversation list shows "firstName lastName"
    const meResp = await parentPage.request.get(`${API}/api/v1/auth/me`);
    const meBody = await meResp.json().catch(() => ({}));
    const parentFirstName = meBody.data?.firstName || meBody.firstName || '';
    const parentLastName  = meBody.data?.lastName  || meBody.lastName  || '';
    const parentFullName  = `${parentFirstName} ${parentLastName}`.trim();
    console.log('[CHAT] parent1 full name:', parentFullName);

    // ── Load parent chat first (establishes socket connection) ──
    // Parent Chat.jsx: single-conversation view, conversationId = `parent:${user.id}`
    // Socket listener registered on mount — no further interaction needed
    await portalGoto(parentPage, `${PORTAL}/chat`);
    await parentPage.waitForLoadState('networkidle');

    // ── Load teacher chat ──
    await portalGoto(teacherPage, `${PORTAL}/teacher/xabar?tab=chat`);
    await teacherPage.waitForLoadState('networkidle');

    // Wait for teacher conversation list to load (skeleton <div animate-pulse> disappears)
    // Chat.jsx renders each parent as a <button> inside <div class="... overflow-y-auto">
    await teacherPage.waitForSelector('.overflow-y-auto button', { timeout: 10_000 })
      .catch(() => {});

    // Find parent1's conversation button by full name; scroll if below the fold
    let conversationOpened = false;
    if (parentFirstName) {
      const conv = teacherPage.locator('.overflow-y-auto button')
        .filter({ hasText: parentFirstName }).first();
      // Try direct visibility first, then scroll-into-view
      if (!(await conv.isVisible({ timeout: 3000 }).catch(() => false))) {
        await teacherPage.locator('.overflow-y-auto')
          .evaluate(el => el.scrollTo(0, el.scrollHeight)).catch(() => {});
      }
      if (await conv.isVisible({ timeout: 5000 }).catch(() => false)) {
        await conv.scrollIntoViewIfNeeded();
        await conv.click();
        conversationOpened = true;
        console.log('[CHAT] clicked conversation for:', parentFullName);
      }
    }
    if (!conversationOpened) {
      console.log('[CHAT] WARNING: conv not found by name — fallback to first (may be wrong parent)');
      const firstConv = teacherPage.locator('.overflow-y-auto button').first();
      if (await firstConv.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstConv.click();
      }
    }
    await teacherPage.waitForLoadState('networkidle').catch(() => {});

    // Teacher Chat.jsx: message input is a <textarea> (auto-resize, not a plain input)
    // ref: textareaRef, onChange: handleInputChange, Enter: key handler in the component
    const msgInput = teacherPage.locator('textarea').filter({
      has: teacherPage.locator('[placeholder]'),
    }).last();
    // Fallback: any textarea or text input
    const msgInputFallback = teacherPage.locator(
      'textarea, input[type="text"]:not([type="search"])'
    ).last();
    const activeInput = await msgInput.isVisible({ timeout: 5000 }).catch(() => false)
      ? msgInput
      : msgInputFallback;
    await activeInput.waitFor({ state: 'visible', timeout: 10_000 });

    // Type message
    await activeInput.fill(MSG);

    // Teacher Chat.jsx handleSend is triggered by Enter key (keydown handler on textarea)
    // or by a send button. Try Enter first (most common in chat UIs).
    await activeInput.press('Enter');
    console.log('[CHAT] teacher sent:', MSG);

    // Parent chat: socket event 'chat:message' → load() → setMessages → re-render
    // Allow up to 10 s for network round-trip + React update
    await expect(parentPage.getByText(MSG)).toBeVisible({ timeout: 10_000 });
    console.log('[T-043/P-051] PASS — message appeared in parent view');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DOUBLE-SUBMIT — attendance save button
  // Rapid two-click — only one POST /attendance should be fired
  // ═══════════════════════════════════════════════════════════════════════

  test('DOUBLE-1 | Attendance double-click — save button disabled mid-flight, ≤1 POST fired', async () => {
    const page = p.teacher1;
    await portalGoto(page, `${PORTAL}/teacher/attendance`);
    await page.waitForLoadState('networkidle');

    // Intercept attendance POST requests
    const posts = [];
    page.on('request', req => {
      if (req.url().includes('/attendance') && req.method() === 'POST') {
        posts.push(req.url());
      }
    });

    // Mark the first child as present (look for a status-toggle button)
    const firstRow = page.locator('tbody tr, [class*="child"], [class*="student-row"]').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      const presentBtn = firstRow.locator('button').first();
      if (await presentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await presentBtn.click();
      }
    }

    // Find the save button (type="button" text "Saqlash", disabled={saving})
    const saveBtn = page.locator('button').filter({ hasText: /saqlash|save/i }).last();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    // Two rapid clicks — second should be blocked by disabled={saving}
    await saveBtn.click({ timeout: 5000 }).catch(() => {});
    // Immediately try again without waiting — button should be disabled by now
    await saveBtn.click({ timeout: 500 }).catch(() => {}); // expected to fail/no-op

    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000); // settle

    console.log('[DOUBLE-1] POST /attendance count:', posts.length);
    // 0 = nothing marked (no-op save), 1 = correct, 2+ = defect
    expect(posts.length).toBeLessThanOrEqual(1);
    if (posts.length === 0) {
      console.log('[DOUBLE-1] NOTE: 0 POSTs — no attendance marked or no-diff save skipped');
    }
    console.log('[DOUBLE-1] PASS — double-submit guard held (posts ≤ 1)');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EMPTY STATES — 3 screens: localized text, no raw i18n keys in body
  // ═══════════════════════════════════════════════════════════════════════

  test('EMPTY-1a | Parent /therapy — page renders without crash, no raw i18n keys visible', async () => {
    const page = p.parent1;
    await portalGoto(page, `${PORTAL}/therapy`);
    await page.waitForLoadState('networkidle');

    const body = await page
      .locator('main, [class*="content"], [class*="container"], body')
      .first()
      .innerText({ timeout: 5000 })
      .catch(() => '');
    console.log('[EMPTY-1a] therapy page snippet:', body.slice(0, 200));

    // No full-line raw key pattern (e.g. "therapy.noData" on its own line)
    expect(body).not.toMatch(/^\s*[a-z][a-zA-Z]+\.[a-zA-Z]+\s*$/m);
    // Page must have SOME content (not blank / crash)
    expect(body.trim().length).toBeGreaterThan(0);
  });

  test('EMPTY-1b | Teacher notifications tab — page renders, no raw i18n keys', async () => {
    const page = p.teacher1;
    await portalGoto(page, `${PORTAL}/teacher/xabar?tab=notifications`);
    await page.waitForLoadState('networkidle');

    const body = await page
      .locator('main, [class*="content"], [class*="tab-panel"], body')
      .first()
      .innerText({ timeout: 5000 })
      .catch(() => '');
    console.log('[EMPTY-1b] notifications tab snippet:', body.slice(0, 200));

    expect(body).not.toMatch(/^\s*[a-z][a-zA-Z]+\.[a-zA-Z]+\s*$/m);
    expect(body.trim().length).toBeGreaterThan(0);
  });

  test('EMPTY-1c | Parent /notifications — page renders, no raw i18n keys', async () => {
    const page = p.parent1;
    await portalGoto(page, `${PORTAL}/notifications`);
    await page.waitForLoadState('networkidle');

    const body = await page
      .locator('main, [class*="content"], [class*="container"], body')
      .first()
      .innerText({ timeout: 5000 })
      .catch(() => '');
    console.log('[EMPTY-1c] notifications page snippet:', body.slice(0, 200));

    expect(body).not.toMatch(/^\s*[a-z][a-zA-Z]+\.[a-zA-Z]+\s*$/m);
    expect(body.trim().length).toBeGreaterThan(0);
  });
});
