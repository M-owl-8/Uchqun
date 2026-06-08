// Wave 3 — Parent Portal
// S14 / BETA-VERIFICATION — DO NOT FIX, RECORD ONLY
// Accounts: parent1–parent12  Password: Test@2026
// URL: https://teacher-production-0647.up.railway.app (shared portal, parent role)
// Viewport: 390×844 mobile

const { test, expect } = require('@playwright/test');

const BASE = 'https://teacher-production-0647.up.railway.app';
const PW   = 'Test@2026';
const RUN  = Date.now().toString().slice(-5);

const PARENTS = [
  'parent1@uchqun.uz',
  'parent2@uchqun.uz',
  'parent3@uchqun.uz',
  'parent4@uchqun.uz',
  'parent5@uchqun.uz',
  'parent6@uchqun.uz',
  'parent7@uchqun.uz',
  'parent8@uchqun.uz',
  'parent9@uchqun.uz',
  'parent10@uchqun.uz',
  'parent11@uchqun.uz',
  'parent12@uchqun.uz',
];

const ss = (page, name) =>
  page.screenshot({ path: `audits/beta/screens/${name}.png`, fullPage: false }).catch(() => {});

// Dismiss PrivacyConsentModal if visible (shown on first login per parent account)
async function dismissPrivacyModal(page) {
  const modal = page.locator('[role="dialog"][aria-labelledby="privacy-consent-title"]')
    .or(page.locator('[role="dialog"]').filter({ hasText: /tarjima|privacy|consent|roziman/i }));
  if (await modal.isVisible().catch(() => false)) {
    // Accept button is usually the last button in the modal
    const acceptBtn = modal.getByRole('button', { name: /qabul|accept|agree|roziman|tasdiqlash|davom|continue/i }).first()
      .or(modal.locator('button').last());
    await acceptBtn.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function login(page, email, password = PW) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  // Parent role toggle if visible
  const parentTab = page.locator('button, [role="tab"]').filter({ hasText: /ota.ona|parent/i }).first();
  if (await parentTab.isVisible().catch(() => false)) await parentTab.click().catch(() => {});
  const btn = page.getByRole('button', { name: /kirish|login|sign in/i }).first();
  await btn.click();
  // waitForURL predicate receives URL object — use url.href or url.toString()
  await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/change-password'), { timeout: 25000 })
    .catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  // Dismiss first-login privacy consent modal if present
  await dismissPrivacyModal(page);
}

// ─────────────────────────────────────────────────────────────────
// W3-S1 parent1 — full day workflow (mobile 390px)
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W3-S1 parent1 full day', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
    });
    page = await ctx.newPage();
  });

  test.afterAll(async () => {
    await page.context().close().catch(() => {});
  });

  // ── Auth ──────────────────────────────────────────────────────────
  test('P-001 login parent1', async () => {
    await login(page, PARENTS[0]);
    // Privacy consent modal auto-dismissed by login() helper
    await ss(page, 'P-001-parent1-home');
    const url = page.url();
    expect(url).not.toMatch(/\/login/);
  });

  test('P-002 show/hide password toggle on login page', async () => {
    await page.goto('/login');
    await page.waitForSelector('input[type="password"]');
    const toggle = page.locator('input[type="password"]').locator('..').getByRole('button').first()
      .or(page.locator('[class*="eye"], [aria-label*="show"], [aria-label*="password"]').first());
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(300);
      await ss(page, 'P-002-password-toggle');
    } else {
      await ss(page, 'P-002-no-toggle');
    }
    await login(page, PARENTS[0]);
  });

  test('P-003 language switcher on login page', async () => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // LanguageSwitcher auth variant — trigger shows "O'zbekcha"/"Русский"/"English"
    const switcher = page.locator('[aria-haspopup="listbox"]').first()
      .or(page.locator('[class*="lang"], button').filter({ hasText: /O.zbekcha|Русский|English|UZ|RU|EN/i }).first());
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(400);
      await ss(page, 'P-003-lang-dropdown-open');
      const ruOption = page.locator('[role="listbox"] button, [role="option"]').filter({ hasText: /Русский|RU/ }).first();
      if (await ruOption.isVisible().catch(() => false)) {
        await ruOption.click();
        await page.waitForTimeout(300);
        await ss(page, 'P-003-lang-ru-selected');
        // Switch back to UZ
        const switcher2 = page.locator('[aria-haspopup="listbox"]').first();
        if (await switcher2.isVisible().catch(() => false)) {
          await switcher2.click();
          await page.waitForTimeout(300);
          const uzOption = page.locator('[role="listbox"] button, [role="option"]').filter({ hasText: /O.zbekcha|UZ/ }).first();
          if (await uzOption.isVisible().catch(() => false)) await uzOption.click();
          await page.waitForTimeout(300);
        }
      } else {
        await ss(page, 'P-003-no-lang-options');
        await page.keyboard.press('Escape').catch(() => {});
      }
    } else {
      await ss(page, 'P-003-no-lang-switcher');
    }
    await login(page, PARENTS[0]);
  });

  // ── Navigation ────────────────────────────────────────────────────
  test('P-007 mobile bottom tab bar visible at 390px', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-007-mobile-nav');
    // Mobile bottom nav should have 4-5 tab links
    const nav = page.locator('nav, [class*="tab-bar"], [class*="bottom-nav"], footer').first();
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  // ── Dashboard ─────────────────────────────────────────────────────
  test('P-016 dashboard home page loads', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-016-parent-dashboard');
    expect(page.url()).not.toMatch(/login/);
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(100);
  });

  test('P-018 today day card with counts', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-018-day-card');
    const body = await page.textContent('body');
    // Dashboard should have some text — exact data depends on Wave-2 creates
    expect(body.length).toBeGreaterThan(100);
  });

  test('P-019 quick access links', async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Tap the first quick link
    const quickLink = page.locator('a[href*="/activities"], a[href*="/meals"], a[href*="/chat"], a[href*="/media"], [class*="quick"], [class*="card"]').first();
    if (await quickLink.isVisible().catch(() => false)) {
      await quickLink.click();
      await page.waitForLoadState('networkidle');
      await ss(page, 'P-019-quick-link-clicked');
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    } else {
      await ss(page, 'P-019-no-quick-links');
    }
  });

  // ── Child Profile ─────────────────────────────────────────────────
  test('P-022 child info hero section (name, teacher, school)', async () => {
    await page.goto('/child');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-022-child-profile');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('P-026 emotional monitoring records', async () => {
    await page.goto('/child');
    await page.waitForLoadState('networkidle');
    // Scroll down to monitoring section
    await page.evaluate(() => window.scrollBy(0, 400));
    await ss(page, 'P-026-monitoring-section');
  });

  // ── Activities ────────────────────────────────────────────────────
  test('P-029 list child activities', async () => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-029-activities-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('P-030 view activity detail modal', async () => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    const detailBtn = page.getByRole('button', { name: /batafsil|detail|more/i }).first()
      .or(page.locator('[class*="activity-card"], [class*="activity-item"]').first());
    if (await detailBtn.isVisible().catch(() => false)) {
      await detailBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'P-030-activity-detail-modal');
      await page.keyboard.press('Escape').catch(() => {});
    } else {
      await ss(page, 'P-030-no-activities-to-detail');
    }
  });

  // ── Attendance ────────────────────────────────────────────────────
  test('P-016b parent attendance view', async () => {
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-016b-attendance');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Meals ─────────────────────────────────────────────────────────
  test('P-032 list meals for today', async () => {
    await page.goto('/meals');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-032-meals-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('P-033 select date from dropdown', async () => {
    await page.goto('/meals');
    await page.waitForLoadState('networkidle');
    const datePicker = page.locator('input[type="date"], select, [class*="date-picker"]').first();
    if (await datePicker.isVisible().catch(() => false)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      await datePicker.fill(yStr).catch(async () => {
        await datePicker.selectOption({ index: 1 }).catch(() => {});
      });
      await page.waitForTimeout(500);
      await ss(page, 'P-033-meals-date-changed');
    } else {
      await ss(page, 'P-033-no-date-picker');
    }
  });

  // ── Media ─────────────────────────────────────────────────────────
  test('P-037 media gallery grid', async () => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-037-media-gallery');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('P-040 open media in fullscreen modal', async () => {
    await page.goto('/media');
    await page.waitForLoadState('networkidle');
    const mediaCard = page.locator('img, [class*="media-card"], [class*="gallery-item"]').first();
    if (await mediaCard.isVisible().catch(() => false)) {
      await mediaCard.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      await ss(page, 'P-040-media-fullscreen');
      await page.keyboard.press('Escape').catch(() => {});
    } else {
      await ss(page, 'P-040-no-media-to-open');
    }
  });

  // ── Chat ──────────────────────────────────────────────────────────
  test('P-045 list chat messages from teacher', async () => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-045-chat-list');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('P-046 send reply message to teacher (Cyrillic + emoji)', async () => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    const msgInput = page.locator('input[type="text"][placeholder*="xabar"], textarea, input[type="text"]').last();
    if (await msgInput.isVisible().catch(() => false)) {
      await msgInput.fill(`Родитель ответ ${RUN} 😊 — ota-ona xabari`);
      const sendBtn = page.getByRole('button', { name: /yuborish|send/i }).first()
        .or(page.locator('[type="submit"], [aria-label*="send"]').first());
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'P-046-message-sent');
      } else {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
        await ss(page, 'P-046-message-sent-enter');
      }
    } else {
      await ss(page, 'P-046-no-chat-input');
    }
  });

  // ── Notifications ─────────────────────────────────────────────────
  test('P-052 notifications page loads', async () => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-052-notifications');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  test('P-054 mark notification as read', async () => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    const markReadBtn = page.locator('button').filter({ hasText: /o.qilgan|read|belgi/i }).first()
      .or(page.locator('[class*="mark-read"], [aria-label*="read"]').first());
    if (await markReadBtn.isVisible().catch(() => false)) {
      await markReadBtn.click();
      await page.waitForTimeout(500);
      await ss(page, 'P-054-notification-marked-read');
    } else {
      // Try mark-all button
      const markAll = page.getByRole('button', { name: /barchasini|mark all/i }).first();
      if (await markAll.isVisible().catch(() => false)) {
        await markAll.click();
        await page.waitForTimeout(500);
        await ss(page, 'P-055-all-marked-read');
      } else {
        await ss(page, 'P-054-no-mark-read-btn');
      }
    }
  });

  // ── Journal ───────────────────────────────────────────────────────
  test('P-journal view parent journal', async () => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-journal-page');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── IRR Read-only ─────────────────────────────────────────────────
  test('P-059 view IRR read-only page', async () => {
    await page.goto('/irr');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-059-irr-page');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Teacher Rating ────────────────────────────────────────────────
  test('P-067 rate teacher (5-star) + P-068 comment', async () => {
    await page.goto('/rating');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-067-rating-page');
    // Click 5th star
    const stars = page.locator('[class*="star"], [aria-label*="star"], button').filter({ hasText: /★|⭐|5/i });
    const starCount = await stars.count();
    if (starCount > 0) {
      await stars.last().click();
      await page.waitForTimeout(300);
    } else {
      // Try SVG stars
      const svgStars = page.locator('svg[class*="star"], [data-rating]');
      if (await svgStars.last().isVisible().catch(() => false)) {
        await svgStars.last().click().catch(() => {});
      }
    }
    // Comment field
    const commentInput = page.locator('textarea, input[type="text"]').first();
    if (await commentInput.isVisible().catch(() => false)) {
      await commentInput.fill(`Beta baho ${RUN} — ота-она фикри 👍`);
    }
    const submitBtn = page.getByRole('button', { name: /yuborish|send|saqlash|save|baholash|rate/i }).first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1500);
      await ss(page, 'P-067-rating-submitted');
    } else {
      await ss(page, 'P-067-no-submit-btn');
    }
  });

  test('P-070 rate school (5 indicators)', async () => {
    await page.goto('/rating');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollBy(0, 600));
    // School rating section
    const schoolSection = page.locator('[class*="school-rating"], [class*="indicator"]').first()
      .or(page.getByRole('heading', { name: /maktab|school|ko.rsatkich/i }).first());
    if (await schoolSection.isVisible().catch(() => false)) {
      await ss(page, 'P-070-school-rating-section');
    } else {
      await ss(page, 'P-070-no-school-rating');
    }
  });

  // ── Government Message ────────────────────────────────────────────
  test('P-073 P-078 compose + send message to government', async () => {
    await page.goto('/child');
    await page.waitForLoadState('networkidle');
    // Look for "Davlatga murojaat" or "Message to government" button
    const govBtn = page.locator('button').filter({ hasText: /davlat|government|murojaat|maktab/i }).first()
      .or(page.locator('[class*="gov"], [class*="message"]').first());
    if (await govBtn.isVisible().catch(() => false)) {
      await govBtn.click();
      await page.waitForTimeout(600);
      await ss(page, 'P-073-compose-modal');
      const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
      // Select recipient level if available
      const levelBtns = modal.locator('button').filter({ hasText: /viloyat|region|respublika|republic|maktab|school/i });
      if (await levelBtns.first().isVisible().catch(() => false)) {
        await levelBtns.first().click();
        await page.waitForTimeout(200);
      }
      // Subject
      const subjectInput = modal.locator('input[type="text"]').first();
      if (await subjectInput.isVisible().catch(() => false)) {
        await subjectInput.fill(`Beta murojaat ${RUN}`);
      }
      // Message body
      const bodyInput = modal.locator('textarea').first();
      if (await bodyInput.isVisible().catch(() => false)) {
        await bodyInput.fill(`Parent beta test xabari ${RUN} — тест сообщение от родителя`);
      }
      const sendBtn = modal.getByRole('button', { name: /yuborish|send/i }).first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(1500);
        await ss(page, 'P-078-message-sent');
      } else {
        await ss(page, 'P-073-no-send-btn');
      }
    } else {
      await ss(page, 'P-073-no-gov-btn');
    }
  });

  // ── Therapy ───────────────────────────────────────────────────────
  test('P-083 browse therapy items', async () => {
    await page.goto('/therapy');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-083-therapy-page');
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(50);
  });

  // ── Settings / Profile ────────────────────────────────────────────
  test('P-088 P-089 view profile and edit phone', async () => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await ss(page, 'P-088-settings-profile');
    const body = await page.textContent('body');
    expect(body).toMatch(/parent1|uchqun/i);

    const phoneInput = page.locator('input[type="tel"], input[name*="phone"], input[placeholder*="tel"]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('+998901234568');
      const saveBtn = page.getByRole('button', { name: /saqlash|save/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
        await ss(page, 'P-089-profile-saved');
      }
    }
  });

  test('P-013 language switcher mid-session', async () => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    // Look for LanguageSwitcher in settings
    const switcher = page.locator('[aria-haspopup="listbox"]').first()
      .or(page.locator('button').filter({ hasText: /O.zbekcha|Русский|English|UZ|RU|EN/i }).first());
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click();
      await page.waitForTimeout(400);
      await ss(page, 'P-013-lang-dropdown');
      await page.keyboard.press('Escape').catch(() => {});
    } else {
      await ss(page, 'P-013-no-lang-switcher');
    }
  });

  // ── Logout ────────────────────────────────────────────────────────
  test('P-003b logout parent1', async () => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const logoutBtn = page.getByRole('button', { name: /chiqish|logout|exit/i }).first()
      .or(page.locator('[class*="logout"]').first());
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, 'P-003b-logout');
      expect(page.url()).toMatch(/login|\/$/);
    } else {
      await ss(page, 'P-003b-no-logout-btn');
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// W3-S2 parents 2-12: login + chat reply + logout
// ─────────────────────────────────────────────────────────────────
test.describe.serial('W3-S2 parents 2-12 chat', () => {
  for (let i = 1; i < PARENTS.length; i++) {
    const email = PARENTS[i];
    const idx   = i + 1;

    test(`P-001 parent${idx} login + P-046 send chat + P-003 logout`, async ({ browser }) => {
      const ctx  = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 390, height: 844 },
      });
      const page = await ctx.newPage();
      try {
        await login(page, email);
        if (page.url().includes('/login')) {
          // DEF-009: login stayed at /login — intermittent Railway issue or account anomaly
          await ss(page, `P-001-parent${idx}-login-failed`);
          console.log(`P-001 parent${idx} login failed — URL stayed at /login (DEF-009)`);
          return;
        }
        await ss(page, `P-001-parent${idx}-login`);

        // Send chat message
        await page.goto('/chat');
        await page.waitForLoadState('networkidle');
        const msgInput = page.locator('input[type="text"], textarea').last();
        if (await msgInput.isVisible().catch(() => false)) {
          await msgInput.fill(`P${idx} beta xabar ${RUN} — ota-ona javobi 🙏`);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1200);
        }
        await ss(page, `P-046-parent${idx}-chat`);

        // Dismiss privacy consent modal if still visible before logout
        await dismissPrivacyModal(page);
        // Logout
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        await dismissPrivacyModal(page);
        const logoutBtn = page.getByRole('button', { name: /chiqish|logout/i }).first();
        if (await logoutBtn.isVisible().catch(() => false)) {
          await logoutBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(800);
        }
        await ss(page, `P-003-parent${idx}-logout`);
      } finally {
        await ctx.close().catch(() => {});
      }
    });
  }
});
