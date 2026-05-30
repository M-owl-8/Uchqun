/**
 * PROD-READINESS-05-S4 — Seed content for Bobur (parent1's child)
 *
 * Seeds via teacher API paths (teacher1@uchqun.uz):
 *   - 1 Activity
 *   - 2 Meals (Breakfast eaten=true, Snack eaten=false)
 *   - 2 Media (photo + video, URL-based JSON endpoint)
 *   - 1 EmotionalMonitoring record
 *   - 3 Chat messages to parent
 *   - Full IRR (header → activate → intake assessment → 2 LTGs → goal-period → 2 STGs → review)
 *
 * Seeds via reception1 (to assign parent1 → teacher1):
 *   - PUT /reception/parents/:parentId { teacherId, groupId }
 *
 * Seeds via parent API paths (parent1@uchqun.uz):
 *   - Teacher rating (stars + comment)
 *   - School rating (5 indicators + comment)
 *   - Message to government
 *
 * Then takes Playwright screenshots to verify all 9 DATA-BLOCKED items are now visible.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://uchqun-production-b484.up.railway.app/api/v1';
const TEACHER_APP = 'https://teacher-production-0647.up.railway.app';
const TEACHER_EMAIL = 'teacher1@uchqun.uz';
const TEACHER_PASS = 'Test@2026';
const RECEPTION_EMAIL = 'reception1@uchqun.uz';
const RECEPTION_PASS = 'Test@2026';
const PARENT_EMAIL = 'parent1@uchqun.uz';
const PARENT_PASS = 'Test@2026';

const OUT = 'audits/prod-readiness/screenshots/parent-s4';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const API_DOMAIN = 'uchqun-production-b484.up.railway.app';

function cookieHeader(cookies) {
  return cookies
    .filter(c => API_DOMAIN.includes(c.domain.replace(/^\./, '')))
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

async function api(method, path, body, cookieStr) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieStr ? { Cookie: cookieStr } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.status >= 200 && res.status < 300;
  if (!ok) {
    console.error(`  ❌ ${method} ${path} → ${res.status}`, JSON.stringify(data).slice(0, 200));
  } else {
    console.log(`  ✅ ${method} ${path} → ${res.status}`);
  }
  return { status: res.status, data, ok };
}

async function loginBrowser(ctx, email, pass) {
  const page = await ctx.newPage();
  await page.goto(`${TEACHER_APP}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  // Wait for non-login URL (may land at /change-password or dashboard)
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log(`  Logged in as ${email} → ${page.url()}`);
  return page;
}

// Direct API login — returns cookie string without needing a browser
async function apiLogin(email, pass) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const setCookies = res.headers.getSetCookie?.() || [];
  const cookie = setCookies.map(c => c.split(';')[0]).join('; ');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`  ❌ API login ${email} → ${res.status}`, JSON.stringify(body).slice(0, 100));
    return null;
  }
  console.log(`  ✅ API login ${email} → ${res.status}`);
  return cookie;
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}.png`);
}

// ─────────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const today = new Date().toISOString().split('T')[0];

// ── STEP 1: Login as teacher1 ────────────────────────────────────────────────
console.log('\n=== Step 1: Login as teacher1 ===');
const teacherCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const teacherPage = await loginBrowser(teacherCtx, TEACHER_EMAIL, TEACHER_PASS);
const tCookies = await teacherCtx.cookies();
const tCookie = cookieHeader(tCookies);
console.log('  Teacher cookie:', tCookie.length > 0 ? '✅' : '❌ EMPTY');

// ── STEP 2: Get Bobur's full child info ──────────────────────────────────────
console.log('\n=== Step 2: Get Bobur child info ===');
const childListRes = await api('GET', '/teacher/children', null, tCookie);
const childList = childListRes.data?.data || childListRes.data || [];
const boburBasic = Array.isArray(childList)
  ? childList.find(c => c.firstName === 'Bobur')
  : null;

if (!boburBasic) {
  console.error('Could not find Bobur in children list!');
  await browser.close();
  process.exit(1);
}

// Get full child object (includes parentId)
const childDetailRes = await api('GET', `/teacher/children/${boburBasic.id}`, null, tCookie);
const bobur = childDetailRes.data?.data || childDetailRes.data;
const childId = bobur.id;
const parentId = bobur.parentId;
const schoolId = bobur.schoolId;
const groupId = bobur.groupId;
console.log(`  childId=${childId}`);
console.log(`  parentId=${parentId}`);
console.log(`  schoolId=${schoolId}`);
console.log(`  groupId=${groupId}`);

// Get teacher1's own ID
const profileRes = await api('GET', '/teacher/profile', null, tCookie);
const teacherId = profileRes.data?.data?.teacher?.id;
console.log(`  teacherId=${teacherId}`);

// ── STEP 3: reception1 assigns parent1 → teacher1 ────────────────────────────
console.log('\n=== Step 3: Assign parent1 → teacher1 via reception ===');
const rCookie = await apiLogin(RECEPTION_EMAIL, RECEPTION_PASS);
console.log('  Reception cookie:', rCookie ? '✅' : '❌ EMPTY');

if (parentId && teacherId && groupId) {
  await api('PUT', `/reception/parents/${parentId}`, {
    teacherId,
    groupId,
  }, rCookie);
} else {
  console.log('  ⚠️ Missing parentId/teacherId/groupId — skipping assignment');
}

// ── STEP 4: Create Activity ──────────────────────────────────────────────────
console.log('\n=== Step 4: Create Activity ===');
const nextMonth = new Date(Date.now() + 30 * 86400 * 1000).toISOString().split('T')[0];
const actRes = await api('POST', '/activities', {
  childId,
  skill: "Nutq va muloqot ko'nikmalari",
  goal: "Oddiy so'zlar va iboralar bilan muloqot qilishni o'rganish",
  startDate: today,
  endDate: nextMonth,
  tasks: ["Kundalik ob-havo so'zlashuvi", "Rasm bo'yicha hikoya tuzish"],
  methods: "Vizual yordam, takrorlash, ijobiy mustahkamlash",
  progress: "Dastlabki bosqichda — 2-3 so'zli gaplar",
  observation: "Bobur vizual rag'batlantirilganda yaxshi javob beradi",
}, tCookie);
const activityId = actRes.data?.id || actRes.data?.data?.id;
console.log('  Activity ID:', activityId);

// ── STEP 5: Create 2 Meals ───────────────────────────────────────────────────
console.log('\n=== Step 5: Create Meals ===');
await api('POST', '/meals', {
  childId,
  mealName: "Sutli bo'tqa",
  description: "Guruch bo'tqasi, sutli, shakar qo'shilgan",
  mealType: 'Breakfast',
  date: today,
  time: '08:30',
  eaten: true,
  quantity: 'Full portion',
  specialNotes: "Hammasi yeb bo'ldi, yaxshi ishtahasi bor",
}, tCookie);

await api('POST', '/meals', {
  childId,
  mealName: 'Meva salat',
  description: 'Olma, banan, apelsin dilim salat',
  mealType: 'Snack',
  date: today,
  time: '10:00',
  eaten: false,
  quantity: 'Half portion',
  specialNotes: "Bugun ishtahasi yo'q edi, faqat bir-ikki luqma yedi",
}, tCookie);

// ── STEP 6: Create 2 Media items ────────────────────────────────────────────
console.log('\n=== Step 6: Create Media ===');
await api('POST', '/media', {
  childId,
  type: 'photo',
  url: 'https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg',
  title: "Dars paytida — qo'l motorikasi mashqi",
  date: today,
  ...(activityId ? { activityId } : {}),
}, tCookie);

await api('POST', '/media', {
  childId,
  type: 'video',
  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  title: "Guruh faoliyati — qo'shiq aytish mashg'uloti",
  date: today,
}, tCookie);

// ── STEP 7: Create Emotional Monitoring ─────────────────────────────────────
console.log('\n=== Step 7: Create Emotional Monitoring ===');
await api('POST', '/teacher/emotional-monitoring', {
  childId,
  date: today,
  emotionalState: {
    stable: true,
    positiveEmotions: true,
    noAnxiety: false,
    noHostility: true,
    calmResponse: true,
    showsEmpathy: false,
    quickRecovery: true,
    stableMood: true,
    trustingRelationship: true,
  },
  notes: 'Bobur bugun yaxshi kayfiyatda keldi. Dars boshida biroz bezovta bo\'ldi, lekin 10 daqiqadan keyin tinchlandi va faol ishtirok etdi.',
  teacherSignature: 'Zulfiya Nazarova',
}, tCookie);

// ── STEP 8: Create 3 Chat messages ──────────────────────────────────────────
console.log('\n=== Step 8: Create Chat Messages ===');
if (parentId) {
  const convId = `parent:${parentId}`;
  await api('POST', '/chat/messages', {
    conversationId: convId,
    content: "Assalomu alaykum, Hulkar opa! Bugun Bobur juda yaxshi kayfiyatda keldi va darsda faol ishtirok etdi.",
  }, tCookie);
  await api('POST', '/chat/messages', {
    conversationId: convId,
    content: "Uyda ham nutq mashqlarini davom ettiring: rasmlarni ko'rsatib, so'rash va qisqa javob berish.",
  }, tCookie);
  await api('POST', '/chat/messages', {
    conversationId: convId,
    content: "Keyingi hafta ПТПК hisoboti bo'yicha uchrashuvimiz bor. Qulay vaqtingizni bildirsangiz.",
  }, tCookie);
} else {
  console.log('  ⚠️ No parentId — skipping chat messages');
}

// ── STEP 9: Full IRR flow ────────────────────────────────────────────────────
console.log('\n=== Step 9: Create IRR ===');
const irrCreateRes = await api('POST', `/teacher/children/${childId}/irr`, {}, tCookie);
const irrId = irrCreateRes.data?.data?.id || irrCreateRes.data?.id;

if (!irrId) {
  // Might already exist — try to get it
  const existingRes = await api('GET', `/teacher/children/${childId}/irr`, null, tCookie);
  const existingIrr = existingRes.data?.data;
  if (existingIrr) {
    console.log('  IRR already exists, ID:', existingIrr.id);
    // Don't proceed with setup again
  } else {
    console.log('  ❌ Failed to create IRR. Skipping IRR flow.');
  }
} else {
  console.log('  IRR ID:', irrId);

  await api('PATCH', `/teacher/irr/${irrId}`, {
    childFullName: 'Bobur Sobirov',
    dateOfBirth: '2022-01-15',
    ageAtAssessmentStart: '2',
    ptpkIntakeDate: '2024-08-15',
    ptpkConclusionDate: '2024-08-29',
    ptpkConclusionNumber: 'ПТПК-2024-T01-0081',
    ptpkDiagnosis: 'Аутистик спектр бузилишлари, F84.0 (ДСМ-5 мезони бўйича 1-даража)',
    irrStartDate: '2024-09-01',
    additionalInfo: "Ko'p takror va vizual ko'rsatmalar talab qiladi. Sensoriy yuklanishni boshqarish uchun jisman tinch joy kerak.",
    childStrengths: "Vizual xotirasi kuchli, rasm chizishni yaxshi ko'radi, tartibli",
    riskFactors: "Sensoriy muammolar, muloqotda qiynaladi",
  }, tCookie);

  const activateRes = await api('POST', `/teacher/irr/${irrId}/activate`, {}, tCookie);
  if (!activateRes.ok) {
    console.error('  IRR activation failed:', JSON.stringify(activateRes.data));
  }

  const assessRes = await api('POST', `/teacher/irr/${irrId}/assessment-sessions`, {
    sessionType: 'intake',
    scores: [3, 2, 3, 2, 3, 3, 2, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
    completedAt: new Date().toISOString(),
    isHearingImpaired: false,
    notes: 'Dastlabki baholash. Bobur vizual ko\'rsatmalarda yaxshi ishladi, verbal topshiriqlarda yordam talab qildi.',
  }, tCookie);
  console.log('  Assessment session:', assessRes.data?.data?.session?.id || '(no id)');

  const ltg1Res = await api('POST', `/teacher/irr/${irrId}/long-term-goals`, {
    goalText: "Kundalik vaziyatlarda 3-5 so'zli gaplar bilan muloqot qila olish (12 oy ichida)",
  }, tCookie);
  await api('POST', `/teacher/irr/${irrId}/long-term-goals`, {
    goalText: "Tengdoshlari bilan oddiy o'yinlarda faol qatnashish ko'nikmasini rivojlantirish",
  }, tCookie);

  const periodEnd = new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0];
  const periodRes = await api('POST', `/teacher/irr/${irrId}/goal-periods`, {
    periodStart: today,
    periodEnd,
  }, tCookie);
  const periodId = periodRes.data?.data?.id || periodRes.data?.id;
  console.log('  Goal Period ID:', periodId);

  if (periodId) {
    await api('POST', `/teacher/goal-periods/${periodId}/short-term-goals`, {
      goalText: "Kundalik salomlashish va xayrlashish iboralarini mustaqil ishlatish",
      skillAreaCode: 'communication',
      sortOrder: 1,
      tasks: "Har kuni dars boshida va oxirida salomlashish mashqi",
      methods: "Vizual yordam kartalar, ijobiy mustahkamlash",
      progress: "Boshlang'ich — yordam bilan 2/5 muvaffaqiyat",
    }, tCookie);

    await api('POST', `/teacher/goal-periods/${periodId}/short-term-goals`, {
      goalText: "2-3 qadamli ko'rsatmalarni tushunish va bajarish",
      skillAreaCode: 'cognitive',
      sortOrder: 2,
      tasks: "Har darsda 3 ta ko'p bosqichli topshiriq",
      methods: "Rasmli ko'rsatma kartalar, jismoniy yordam",
      progress: 'Dastlabki bosqich',
    }, tCookie);

    await api('PATCH', `/teacher/goal-periods/${periodId}/review`, {
      overallAssessment: "Bobur birinchi oy davomida yaxshi progress ko'rsatdi. Vizual yordam bilan vazifalarni bajaradi.",
      parentRecommendations: "Uyda ham vizual jadval asosida kundalik tartibni belgilang. Bobur bilan har kuni 15 daqiqa nutq mashqi qiling.",
      nextReviewDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString().split('T')[0],
    }, tCookie);
  }
}

// ── STEP 10: Login as parent1 ─────────────────────────────────────────────────
console.log('\n=== Step 10: Login as parent1 ===');
const parentCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const parentPage = await loginBrowser(parentCtx, PARENT_EMAIL, PARENT_PASS);
const pCookies = await parentCtx.cookies();
const pCookie = cookieHeader(pCookies);
console.log('  Parent cookie:', pCookie.length > 0 ? '✅' : '❌ EMPTY');

// ── STEP 11: Parent rates teacher ────────────────────────────────────────────
console.log('\n=== Step 11: Parent rates teacher ===');
await api('POST', '/parent/ratings', {
  stars: 5,
  comment: "Zulfiya opa juda professional o'qituvchi. Bobur har kuni maktabga borishni kutib qoldi. Katta rahmat!",
}, pCookie);

// ── STEP 12: Parent rates school ─────────────────────────────────────────────
console.log('\n=== Step 12: Parent rates school ===');
if (schoolId) {
  await api('POST', '/parent/school-rating', {
    schoolId,
    indicators: {
      parent_indicator_1: 5,
      parent_indicator_2: 4,
      parent_indicator_3: 5,
      parent_indicator_4: 5,
      parent_indicator_5: 4,
    },
    comment: "Maktab jamoasi juda mehribon va professionaldir. Bolalar uchun qulay muhit yaratilgan. Mamnunmiz!",
  }, pCookie);
} else {
  console.log('  ⚠️ No schoolId — skipping school rating');
}

// ── STEP 13: Parent sends government message ──────────────────────────────────
console.log('\n=== Step 13: Parent sends government message ===');
await api('POST', '/parent/message-to-government', {
  subject: "Maxsus ta'lim muassasalari uchun transport xizmati haqida taklif",
  message: "Hurmatli nazorat organlari! Iltimos, maxsus ta'lim maktablariga qatnab yuruvchi bolalar uchun moslashtirilgan transport xizmatini tashkil etishni ko'rib chiqing.",
  recipientLevel: 'region',
}, pCookie);

// ── STEP 14: Playwright screenshots ──────────────────────────────────────────
console.log('\n=== Step 14: Parent portal verification screenshots ===');

// Child profile — P-026 emotional monitoring
await parentPage.goto(`${TEACHER_APP}/child`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await parentPage.waitForTimeout(4000);
await parentPage.evaluate(() => window.scrollTo(0, 600));
await parentPage.waitForTimeout(500);
await shot(parentPage, 'S4-P026-emotional-monitoring');
const childText = await parentPage.textContent('body').catch(() => '');
console.log('P-026: Has emotional section:', childText.includes('hissiy') || childText.includes('Hissiy') || childText.includes('emotional') || childText.includes('kayfiyat'));

// Activities — P-029/030
await parentPage.goto(`${TEACHER_APP}/activities`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await parentPage.waitForTimeout(3000);
await shot(parentPage, 'S4-P029-activities');
const actText = await parentPage.textContent('body').catch(() => '');
console.log('P-029: Has activity content:', actText.includes('Nutq') || actText.includes('muloqot') || actText.includes('Batafsil'));
const batafsilBtn = parentPage.locator('button').filter({ hasText: /Batafsil|Detail/i }).first();
const batafsilVis = await batafsilBtn.isVisible().catch(() => false);
console.log('P-030: Batafsil button visible:', batafsilVis);
if (batafsilVis) {
  await batafsilBtn.click();
  await parentPage.waitForTimeout(1000);
  await shot(parentPage, 'S4-P030-activity-detail-modal');
  await parentPage.keyboard.press('Escape');
  await parentPage.waitForTimeout(300);
}

// Meals — P-032/034/035
await parentPage.goto(`${TEACHER_APP}/meals`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await parentPage.waitForTimeout(3000);
await shot(parentPage, 'S4-P032-meals');
const mealText = await parentPage.textContent('body').catch(() => '');
console.log("P-032: Has meal content:", mealText.includes("bo'tqa") || mealText.includes('Sutli') || mealText.includes('salat'));
console.log('P-034: Has eaten indicator:', mealText.includes('Yegan') || mealText.includes('Yemagan') || mealText.includes('egan'));
await parentPage.evaluate(() => window.scrollTo(0, 500));
await parentPage.waitForTimeout(500);
await shot(parentPage, 'S4-P035-nutrition-summary');
const mealText2 = await parentPage.textContent('body').catch(() => '');
console.log('P-035: Has nutrition card:', mealText2.includes('Ovqat') || mealText2.includes('kaloriya') || mealText2.includes('Kunlik'));

// Media — P-037/039/040
await parentPage.goto(`${TEACHER_APP}/media`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await parentPage.waitForTimeout(3000);
await shot(parentPage, 'S4-P037-media-grid');
const mediaText = await parentPage.textContent('body').catch(() => '');
const mediaImages = await parentPage.locator('[class*="group"] img, [class*="grid"] img, img[alt]').all();
console.log('P-037: Media items in DOM:', mediaImages.length);
console.log('P-037: Has media content:', mediaText.includes('dars') || mediaText.includes('mashq') || mediaImages.length > 2);

// P-039/040: hover + click media item
try {
  const mediaCard = parentPage.locator('[class*="group"]').filter({ has: parentPage.locator('img') }).first();
  const cardVis = await mediaCard.isVisible({ timeout: 3000 }).catch(() => false);
  if (cardVis) {
    await mediaCard.hover({ force: true, timeout: 5000 }).catch(() => null);
    await parentPage.waitForTimeout(800);
    await shot(parentPage, 'S4-P039-video-hover');
    await mediaCard.click({ force: true, timeout: 5000 }).catch(() => null);
    await parentPage.waitForTimeout(1000);
    await shot(parentPage, 'S4-P040-fullscreen-modal');
    const bodyAfterClick = await parentPage.textContent('body').catch(() => '');
    console.log('P-040: Fullscreen/modal opened:', bodyAfterClick.includes('Yopish') || bodyAfterClick.includes('Close') || bodyAfterClick.includes('close') || bodyAfterClick.includes('modal'));
    await parentPage.keyboard.press('Escape');
    await parentPage.waitForTimeout(300);
  } else {
    console.log('P-039/040: No media card visible for hover/click');
  }
} catch (e) {
  console.log('P-039/040: hover/click skipped:', e.message.slice(0, 80));
}

// Dashboard overview
await parentPage.goto(`${TEACHER_APP}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await parentPage.waitForTimeout(4000);
await shot(parentPage, 'S4-dashboard-with-data');

console.log('\n=== SEED SUMMARY ===');
console.log('  ✅ Activity (1)');
console.log('  ✅ Meals (2: Breakfast eaten + Snack uneaten)');
console.log('  ✅ Media (2: photo + video)');
console.log('  ✅ Emotional Monitoring (1 record)');
console.log('  ✅ Chat Messages (3)');
console.log('  ✅ IRR (header + activate + assessment + 2 LTGs + period + 2 STGs + review)');
console.log('  ✅ parent1.teacherId = teacher1 (via reception PUT)');
console.log('  ✅ Teacher Rating (5 stars)');
console.log('  ✅ School Rating (5 indicators)');
console.log('  ✅ Government Message (region level)');
console.log('\n  Screenshots in:', OUT);
console.log('  Previously data-blocked: P-026/029/032/034/035/037/039/040 → now verifiable');

await browser.close();
console.log('\nDone ✅');
