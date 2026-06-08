/**
 * UX-02 — Attendance correction gate
 * Case (c): backend upserts correctly; fix adds UI affordance (alreadySaved badge + Update button).
 *
 * teacher1@uchqun.uz owns "Guruh 1" with Bobur Sobirov + Shahlo Tursunova.
 * Both already have Bor records for today (saved by the seed/earlier session),
 * so hasSavedData = true on first load.
 *
 * Gate:
 *   1. Load → badge visible (already-saved), Bobur = Bor, button says Yangilash
 *   2. Change Bobur to Kasal → save (verify navigation)
 *   3. Return → badge visible, Bobur = Kasal (correction persisted)
 *   4. Change Bobur back to Bor → save (verify navigation)
 *   5. Reload → Bobur = Bor (round-trip complete, no duplicate row)
 *   6. Badge renders without raw keys in ru + en
 */
const { test, expect } = require('@playwright/test');

const TEACHER_BASE = 'https://teacher-production-0647.up.railway.app';
const EMAIL = 'teacher1@uchqun.uz';
const PW = 'Test@2026';

async function loginTeacher(page) {
  await page.goto(`${TEACHER_BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 25000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PW);
  await page.getByRole('button', { name: /kirish|login|sign in/i }).first().click();
  await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/change-password'), { timeout: 25000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

// Navigate to attendance and wait until the alreadySaved badge appears
// (badge visibility = states loaded from API for today, hasSavedData=true).
async function goToAttendanceWithBadge(page) {
  await page.goto(`${TEACHER_BASE}/teacher/attendance`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('.grid > button', { timeout: 20000 });
  // Wait for badge — guarantees the GET /attendance has returned and states are populated.
  const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saqlangan|Сохранено|Saved/ });
  await badge.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(300);
}

async function switchLang(page, lang) {
  // Teacher portal has no lang switcher in authenticated layout; set via localStorage.
  await page.evaluate(l => localStorage.setItem('dnp:lang', l), lang);
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

// Cycle a card until its textContent matches one of targetTexts (max 7 taps).
async function cycleCardTo(page, card, targetTexts) {
  for (let i = 0; i < 7; i++) {
    const text = await card.textContent();
    if (targetTexts.some(t => text.includes(t))) break;
    await card.click();
    await page.waitForTimeout(200);
  }
}

// Click the save bar button, capture the POST response, and assert navigation.
async function clickSaveAndWait(page, { expectKasal } = {}) {
  const saveBarBtn = page.locator('div[class*="fixed"][class*="bottom"] button').first();
  await saveBarBtn.waitFor({ state: 'visible', timeout: 10000 });

  const [response] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('/api/') && resp.url().includes('attendance') && resp.request().method() === 'POST',
      { timeout: 20000 }
    ),
    saveBarBtn.click(),
  ]);

  const body = await response.json().catch(() => null);
  expect(response.status()).toBe(201);

  if (expectKasal) {
    // Verify Bobur's Kasal save was included in results
    expect(body?.data?.saved).toBeGreaterThan(0);
  }

  await page.waitForURL(url => !url.href.includes('/attendance'), { timeout: 20000 });
  await page.waitForTimeout(400);
}

test.describe.serial('UX-02 Attendance correction', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginTeacher(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('load today — alreadySaved badge visible, Bobur = Bor, button says Yangilash', async () => {
    await goToAttendanceWithBadge(page);

    // Badge renders correctly (not a raw key)
    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saqlangan|Сохранено|Saved/ });
    const badgeText = await badge.textContent();
    expect(badgeText).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(badgeText).toMatch(/\s/);

    // Bobur's card shows Bor (existing record loaded from API)
    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Bor|Присутствует|Present/);

    // Save button says Yangilash (correction mode)
    const saveBarBtn = page.locator('div[class*="fixed"][class*="bottom"] button').first();
    const btnText = await saveBarBtn.textContent();
    expect(btnText).toMatch(/Yangilash|Обновить|Update/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-badge-visible-initial-uz.png' });
  });

  test('change Bobur to Kasal and save', async () => {
    await goToAttendanceWithBadge(page);

    // States are loaded (badge visible) — safe to cycle now
    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 10000 });

    // Cycle Bobur from Bor (present) to Kasal (sick)
    await cycleCardTo(page, boburCard, ['Kasal', 'Болен', 'Sick']);

    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Kasal|Болен|Sick/);

    await clickSaveAndWait(page, { expectKasal: true });
  });

  test('return — badge visible, Bobur shows Kasal (correction persisted)', async () => {
    await goToAttendanceWithBadge(page);

    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 10000 });

    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Kasal|Болен|Sick/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-bobur-kasal-after-correction.png' });
  });

  test('correct Bobur back to Bor and save', async () => {
    await goToAttendanceWithBadge(page);

    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 10000 });

    await cycleCardTo(page, boburCard, ['Bor', 'Присутствует', 'Present']);

    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Bor|Присутствует|Present/);

    await clickSaveAndWait(page);
  });

  test('reload — Bor persists, round-trip complete', async () => {
    await goToAttendanceWithBadge(page);

    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 10000 });

    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Bor|Присутствует|Present/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-bor-persists-round-trip.png' });
  });

  test('badge renders in ru without raw keys', async () => {
    await switchLang(page, 'ru');
    await goToAttendanceWithBadge(page);

    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Сохранено/ });
    const text = await badge.textContent();
    expect(text).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(text).toMatch(/\s/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-badge-ru.png' });
  });

  test('badge renders in en without raw keys', async () => {
    await switchLang(page, 'en');
    await goToAttendanceWithBadge(page);

    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saved/ });
    const text = await badge.textContent();
    expect(text).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(text).toMatch(/\s/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-badge-en.png' });

    await switchLang(page, 'uz');
  });
});
