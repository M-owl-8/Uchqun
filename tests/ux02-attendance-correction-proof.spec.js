/**
 * UX-02 — Attendance correction gate
 * Case (c): backend upserts correctly; fix adds UI affordance (alreadySaved badge + Update button).
 * Gate: mark a child Kasal, save, correct to Bor, save again, reload → status persists as Bor.
 * Also verifies badge renders in uz/ru/en without raw i18n keys.
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

async function goToAttendance(page) {
  await page.goto(`${TEACHER_BASE}/teacher/attendance`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Wait for attendance grid or no-children message
  await page.waitForSelector('.grid, [class*="noChildren"], [class*="text-center"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function switchLang(page, lang) {
  const labels = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };
  const trigger = page.locator('button[aria-haspopup="listbox"]').first();
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click();
  await page.waitForTimeout(200);
  await page.locator('[role="option"]').filter({ hasText: labels[lang] }).click();
  await page.waitForTimeout(600);
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

  test('mark first child Kasal and save', async () => {
    await goToAttendance(page);

    // Find first child card and cycle to Kasal (sick)
    const cards = page.locator('.grid > button');
    await cards.first().waitFor({ state: 'visible', timeout: 15000 });

    // Cycle card until it shows Kasal
    for (let i = 0; i < 6; i++) {
      const label = await cards.first().textContent();
      if (label.includes('Kasal') || label.includes('Болен') || label.includes('Sick')) break;
      await cards.first().click();
      await page.waitForTimeout(150);
    }

    // Verify Kasal state is shown
    const cardText = await cards.first().textContent();
    expect(cardText).toMatch(/Kasal|Болен|Sick/);

    // Save
    const saveBtn = page.locator('button').filter({ hasText: /Saqlash|Сохранить|Save|Yangilash|Обновить|Update/ }).last();
    await saveBtn.click();
    // After save navigates away — wait for navigation
    await page.waitForURL(url => !url.href.includes('/attendance'), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
  });

  test('return to attendance, alreadySaved badge visible, correct to Bor and save', async () => {
    await goToAttendance(page);

    // alreadySaved badge must be visible — proves today has saved data
    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saqlangan|Сохранено|Saved/ });
    await badge.waitFor({ state: 'visible', timeout: 15000 });
    const badgeText = await badge.textContent();
    // Badge must not be a raw i18n key
    expect(badgeText).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(badgeText).toMatch(/\S/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-already-saved-badge-uz.png' });

    // First card should show Kasal — cycle it to Bor (present)
    const cards = page.locator('.grid > button');
    for (let i = 0; i < 6; i++) {
      const label = await cards.first().textContent();
      if (label.includes('Bor') || label.includes('Присутствует') || label.includes('Present')) break;
      await cards.first().click();
      await page.waitForTimeout(150);
    }

    const cardText = await cards.first().textContent();
    expect(cardText).toMatch(/Bor|Присутствует|Present/);

    // Save button should say Yangilash/Обновить/Update (correction mode)
    const saveBtn = page.locator('button').filter({ hasText: /Yangilash|Обновить|Update/ }).last();
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtn.click();
    await page.waitForURL(url => !url.href.includes('/attendance'), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
  });

  test('reload attendance and confirm Bor persists', async () => {
    await goToAttendance(page);

    // First card must show Bor — the correction stuck
    const cards = page.locator('.grid > button');
    await cards.first().waitFor({ state: 'visible', timeout: 15000 });
    const cardText = await cards.first().textContent();
    expect(cardText).toMatch(/Bor|Присутствует|Present/);

    // alreadySaved badge still visible
    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saqlangan|Сохранено|Saved/ });
    await badge.waitFor({ state: 'visible', timeout: 10000 });

    await page.screenshot({ path: 'audits/beta/screens/ux02-correction-persisted-uz.png' });
  });

  test('badge renders in ru without raw keys', async () => {
    await switchLang(page, 'ru');
    await goToAttendance(page);

    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Сохранено/ });
    await badge.waitFor({ state: 'visible', timeout: 15000 });
    const text = await badge.textContent();
    expect(text).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(text).toMatch(/\s/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-already-saved-badge-ru.png' });
  });

  test('badge renders in en without raw keys', async () => {
    await switchLang(page, 'en');
    await goToAttendance(page);

    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saved/ });
    await badge.waitFor({ state: 'visible', timeout: 15000 });
    const text = await badge.textContent();
    expect(text).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(text).toMatch(/\s/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-already-saved-badge-en.png' });

    // Switch back to uz
    await switchLang(page, 'uz');
  });
});
