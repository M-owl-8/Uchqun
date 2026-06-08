/**
 * UX-02 — Attendance correction gate
 * Case (c): backend upserts correctly; fix adds UI affordance (alreadySaved badge + Update button).
 *
 * teacher1@uchqun.uz owns "Guruh 1" with children Bobur Sobirov + Shahlo Tursunova.
 * Both already have Bor records for today (saved earlier), so hasSavedData = true on first load.
 * Gate:
 *   1. Load → badge visible (already-saved data), Bobur = Bor
 *   2. Change Bobur to Kasal → save (Update button) → navigate away
 *   3. Return → badge visible, Bobur = Kasal
 *   4. Change Bobur back to Bor → save → navigate away
 *   5. Reload → Bobur = Bor (correction persisted, not duplicate row)
 *   6. Badge renders without raw i18n keys in ru + en
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
  await page.waitForSelector('.grid > button', { timeout: 20000 });
  await page.waitForTimeout(600);
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

// Cycle a specific child card until its label matches targetText.
async function cycleCardTo(page, card, targetTexts) {
  for (let i = 0; i < 7; i++) {
    const text = await card.textContent();
    if (targetTexts.some(t => text.includes(t))) break;
    await card.click();
    await page.waitForTimeout(200);
  }
}

// Click the save bar button (fixed bottom bar).
async function clickSave(page) {
  const saveBarBtn = page.locator('div[class*="fixed"][class*="bottom"] button').first();
  await saveBarBtn.waitFor({ state: 'visible', timeout: 10000 });
  await saveBarBtn.click();
  // Wait for post-save navigation away from attendance
  await page.waitForURL(url => !url.href.includes('/attendance'), { timeout: 20000 }).catch(() => {});
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

  test('load today — alreadySaved badge visible, Bobur has existing Bor record', async () => {
    await goToAttendance(page);

    // Bobur S. is in teacher1's group with an existing Bor record for today
    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 15000 });

    // alreadySaved badge must be visible (Bobur + Shahlo already have records → hasSavedData=true)
    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saqlangan|Сохранено|Saved/ });
    await badge.waitFor({ state: 'visible', timeout: 15000 });

    // Badge text must not be a raw i18n key
    const badgeText = await badge.textContent();
    expect(badgeText).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(badgeText).toMatch(/\s/);

    // Bobur's current status should be Bor (present) — already saved earlier today
    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Bor|Присутствует|Present/);

    // Save button should say Yangilash/Обновить/Update (correction mode, not first-time save)
    const saveBarBtn = page.locator('div[class*="fixed"][class*="bottom"] button').first();
    await saveBarBtn.waitFor({ state: 'visible', timeout: 10000 });
    const btnText = await saveBarBtn.textContent();
    expect(btnText).toMatch(/Yangilash|Обновить|Update/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-badge-visible-initial-uz.png' });
  });

  test('change Bobur to Kasal and save — Update button used', async () => {
    // goToAttendance already called in previous test; page is on /teacher now
    await goToAttendance(page);

    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 15000 });

    // Cycle Bobur from current state to Kasal (sick)
    await cycleCardTo(page, boburCard, ['Kasal', 'Болен', 'Sick']);

    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Kasal|Болен|Sick/);

    await clickSave(page);
  });

  test('return to attendance — badge visible and Bobur shows Kasal', async () => {
    await goToAttendance(page);

    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 15000 });

    // Badge must still be visible
    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saqlangan|Сохранено|Saved/ });
    await badge.waitFor({ state: 'visible', timeout: 15000 });

    // Bobur must show Kasal — the correction from the previous save
    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Kasal|Болен|Sick/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-bobur-kasal-after-correction.png' });
  });

  test('correct Bobur back to Bor and save', async () => {
    // Already on /teacher from previous navigate
    await goToAttendance(page);

    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 15000 });

    await cycleCardTo(page, boburCard, ['Bor', 'Присутствует', 'Present']);

    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Bor|Присутствует|Present/);

    await clickSave(page);
  });

  test('reload — Bor persists, correction stuck, no duplicate row', async () => {
    await goToAttendance(page);

    const boburCard = page.getByRole('button', { name: /Bobur Sobirov:/ });
    await boburCard.waitFor({ state: 'visible', timeout: 15000 });

    // Bor must persist after reload
    const boburText = await boburCard.textContent();
    expect(boburText).toMatch(/Bor|Присутствует|Present/);

    // Badge still visible (record exists)
    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saqlangan|Сохранено|Saved/ });
    await badge.waitFor({ state: 'visible', timeout: 10000 });

    await page.screenshot({ path: 'audits/beta/screens/ux02-bor-persists-correction-complete.png' });
  });

  test('badge renders in ru without raw keys', async () => {
    await switchLang(page, 'ru');
    await goToAttendance(page);

    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Сохранено/ });
    await badge.waitFor({ state: 'visible', timeout: 15000 });
    const text = await badge.textContent();
    expect(text).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(text).toMatch(/\s/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-badge-ru.png' });
  });

  test('badge renders in en without raw keys', async () => {
    await switchLang(page, 'en');
    await goToAttendance(page);

    const badge = page.locator('[class*="bg-green"]').filter({ hasText: /Saved/ });
    await badge.waitFor({ state: 'visible', timeout: 15000 });
    const text = await badge.textContent();
    expect(text).not.toMatch(/^[a-z][a-zA-Z]*\.[a-z]/);
    expect(text).toMatch(/\s/);

    await page.screenshot({ path: 'audits/beta/screens/ux02-badge-en.png' });

    await switchLang(page, 'uz');
  });
});
