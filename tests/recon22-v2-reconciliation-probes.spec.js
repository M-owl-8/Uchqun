/**
 * S22-V2 — Data reconciliation probes
 * Asserts numeric equality at each chain link against DB ground truth.
 * Uses expect.soft() so ALL chains run regardless of per-link failures.
 *
 * DB ground truth established 2026-06-09 via postgres-uchqun MCP.
 * Cross-tenant UUIDs: kept in test only, not in RECONCILIATION.md.
 *
 * AUTH STRATEGY: storageState file-cache (.auth/recon22-*.json).
 * - First run: logs in via /auth/login, saves cookies to file.
 * - Subsequent runs: loads cookies from file, refreshes access token
 *   via /auth/refresh (no rate limit), no re-login needed.
 * - Falls back to fresh login if refresh token is expired (7d TTL).
 * This means loginIpLimiter (100/hr) is only hit once per 7 days.
 */
const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

const API  = 'https://uchqun-production-b484.up.railway.app';
const PW   = 'Test@2026';
const AUTH_DIR = path.join(process.cwd(), '.auth');

// ── DB Ground Truth (postgres-uchqun queries, 2026-06-09) ────────────────────
const DB = {
  S1_ID: 'eec19bb5-36ae-4006-a330-031d07654c40',
  S2_ID: '7b27fadd-3532-4e53-a5e3-79bc652a947f',
  S3_ID: '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
  S4_ID: '5334e23c-a749-4808-8b9a-1f8c67aa1938',

  CHILD_COUNT: { S1: 3, S2: 3, S3: 3, S4: 3, TOTAL: 12 },

  ATTENDANCE_DATE: '2026-06-08',
  S1_ATT_DATE: { total: 2, present: 2 },
  S3_ATT_DATE: { total: 3, present: 3 },
  BOBUR_ID:  '08b49ab0-c2f8-4921-b1d0-32554bc2b4ab',
  SARVAR_ID: '501f9bb2-5b83-43a7-b2cd-5393c7c0ceab',

  S1_PARENT_RATING: { count: 12, avg: 4.3 },
  S1_GOV_RATING:    { latestPeriod: 'Q4-2025', latestStars: 5 },
  THREE_RATING:     { parentAvg: 4.3, parentCount: 12, govAvg: 5, cumulative: 4.7, isPartial: false },
};

// ── Auth helpers ──────────────────────────────────────────────────────────────
function authFile(name) {
  return path.join(AUTH_DIR, `recon22-${name}.json`);
}

/**
 * Get an authenticated page for `name`/`email`.
 * 1. If .auth file exists: load stored cookies, try /auth/refresh (no rate limit).
 *    If refresh succeeds → return page. If refresh 401 → fall through to login.
 * 2. Fresh login via /auth/login, save cookies to .auth file.
 */
async function getAuthPage(browser, name, email) {
  const file = authFile(name);

  // ── Try cached state ──
  if (fs.existsSync(file)) {
    try {
      const ctx  = await browser.newContext({ ignoreHTTPSErrors: true, storageState: file });
      const page = await ctx.newPage();
      await page.goto('about:blank');
      const rr = await page.request.post(`${API}/api/v1/auth/refresh`);
      if (rr.status() === 200) {
        await ctx.storageState({ path: file });
        console.log(`[auth] ${name}: loaded from cache + refreshed`);
        return page;
      }
      // Refresh token expired — close and fall through to fresh login
      await ctx.close();
      console.log(`[auth] ${name}: cache refresh failed (${rr.status()}), re-logging in`);
    } catch (e) {
      console.log(`[auth] ${name}: cache load error (${e.message}), re-logging in`);
    }
  }

  // ── Fresh login ──
  try {
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const resp = await page.request.post(`${API}/api/v1/auth/login`, {
      data: { email, password: PW },
      headers: { 'Content-Type': 'application/json' },
    });
    if (resp.status() !== 200) {
      const body = await resp.json().catch(() => null);
      console.error(`[auth] ${name}: login failed HTTP ${resp.status()} — ${JSON.stringify(body)}`);
      await ctx.close();
      return null;
    }
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await ctx.storageState({ path: file });
    await page.goto('about:blank');
    console.log(`[auth] ${name}: fresh login OK, saved to ${file}`);
    return page;
  } catch (e) {
    console.error(`[auth] ${name}: login exception — ${e.message}`);
    return null;
  }
}

async function apiFetch(page, urlPath) {
  if (!page) return { status: 0, body: null, error: 'page is null (login failed)' };
  try {
    // Use page.request (Playwright's HTTP layer) — shares context cookies but bypasses
    // browser CORS restrictions that would block fetches from the null origin (about:blank).
    const r = await page.request.get(`${API}${urlPath}`);
    let body = null;
    try { body = await r.json(); } catch { /* binary or empty */ }
    return { status: r.status(), body };
  } catch (e) {
    return { status: 0, body: null, error: String(e) };
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────
test.describe('S22-V2 Reconciliation probes', () => {
  const p = {};

  test.beforeAll(async ({ browser }) => {
    // Sequential — avoids simultaneous auth requests
    p.parent1 = await getAuthPage(browser, 'parent1', 'parent1@uchqun.uz');
    p.parent7 = await getAuthPage(browser, 'parent7', 'parent7@uchqun.uz');
    p.admin1  = await getAuthPage(browser, 'admin1',  'admin1@uchqun.uz');
    p.admin2  = await getAuthPage(browser, 'admin2',  'admin2@uchqun.uz');
    p.govT    = await getAuthPage(browser, 'govT',    'gov.toshkent@uchqun.uz');
    p.govS    = await getAuthPage(browser, 'govS',    'gov.samarqand@uchqun.uz');
    p.govR    = await getAuthPage(browser, 'govR',    'gov.republic@uchqun.uz');
  }, 120000);

  test.afterAll(async () => {
    for (const page of Object.values(p)) {
      if (page) await page.context().close().catch(() => {});
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CHAIN 1 — Attendance propagation
  // DB: teacher1/S1 entered 2026-06-08 → Bobur=present, Shahlo=present
  //     teacher5/S3 entered 2026-06-08 → 3 children, all present
  // Verified layers: parent attendance API
  // ════════════════════════════════════════════════════════════════════════════

  test('CHAIN-1-S1 | parent1 → Bobur attendance 2026-06-08 = present', async () => {
    const r = await apiFetch(p.parent1, `/api/v1/parent/attendance?childId=${DB.BOBUR_ID}&date=${DB.ATTENDANCE_DATE}`);
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const records = r.body?.data?.records ?? [];
    expect.soft(records.length, `Expected 1 record for Bobur on ${DB.ATTENDANCE_DATE}, got ${records.length}`).toBe(1);
    if (records.length > 0) {
      expect.soft(records[0].status, `Bobur status: expected present, got ${records[0].status}`).toBe('present');
    }
  });

  test('CHAIN-1-S3 | parent7 → Sarvar attendance 2026-06-08 = present', async () => {
    const r = await apiFetch(p.parent7, `/api/v1/parent/attendance?childId=${DB.SARVAR_ID}&date=${DB.ATTENDANCE_DATE}`);
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const records = r.body?.data?.records ?? [];
    expect.soft(records.length, `Expected 1 record for Sarvar on ${DB.ATTENDANCE_DATE}, got ${records.length}`).toBe(1);
    if (records.length > 0) {
      expect.soft(records[0].status, `Sarvar status: expected present, got ${records[0].status}`).toBe('present');
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CHAIN 3 — Child count
  // admin.statistics.children: creation-hierarchy count (NOT schoolId-scoped)
  // government.schools.studentsCount: schoolId-scoped Child.count per school
  // ════════════════════════════════════════════════════════════════════════════

  test('CHAIN-3 | admin1 statistics.children = 3 (S1 has 3 children)', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/admin/statistics');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const children = r.body?.data?.children;
    expect.soft(children, `admin1.statistics.children: expected 3, got ${children}`).toBe(DB.CHILD_COUNT.S1);
  });

  test('CHAIN-3 | admin2 statistics.children = 3 (S2 has 3 children)', async () => {
    const r = await apiFetch(p.admin2, '/api/v1/admin/statistics');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const children = r.body?.data?.children;
    expect.soft(children, `admin2.statistics.children: expected 3, got ${children}`).toBe(DB.CHILD_COUNT.S2);
  });

  test('CHAIN-3 | gov.toshkent schools: S1 studentsCount=3, S2 studentsCount=3', async () => {
    const r = await apiFetch(p.govT, '/api/v1/government/schools');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const schools = r.body?.data?.schools ?? r.body?.data ?? (Array.isArray(r.body) ? r.body : []);
    expect.soft(schools.length, `Expected 2 Toshkent schools, got ${schools.length}`).toBe(2);
    for (const school of schools) {
      expect.soft(school.studentsCount, `${school.name} studentsCount: expected 3, got ${school.studentsCount}`).toBe(3);
    }
  });

  test('CHAIN-3 | gov.samarqand schools: S3 studentsCount=3, S4 studentsCount=3', async () => {
    const r = await apiFetch(p.govS, '/api/v1/government/schools');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const schools = r.body?.data?.schools ?? r.body?.data ?? (Array.isArray(r.body) ? r.body : []);
    expect.soft(schools.length, `Expected 2 Samarqand schools, got ${schools.length}`).toBe(2);
    for (const school of schools) {
      expect.soft(school.studentsCount, `${school.name} studentsCount: expected 3, got ${school.studentsCount}`).toBe(3);
    }
  });

  test('CHAIN-3 | gov.republic schools: 4 schools, each studentsCount=3, total=12', async () => {
    const r = await apiFetch(p.govR, '/api/v1/government/schools');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const schools = r.body?.data?.schools ?? r.body?.data ?? (Array.isArray(r.body) ? r.body : []);
    expect.soft(schools.length, `Expected 4 schools, got ${schools.length}`).toBe(4);
    let total = 0;
    for (const school of schools) {
      expect.soft(school.studentsCount, `${school.name} studentsCount: expected 3`).toBe(3);
      total += school.studentsCount || 0;
    }
    expect.soft(total, `Total children sum: expected 12, got ${total}`).toBe(DB.CHILD_COUNT.TOTAL);
  });

  test('CHAIN-3 | gov.toshkent top-level students aggregate (scope check)', async () => {
    const r = await apiFetch(p.govT, '/api/v1/government/schools');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const topStudents = r.body?.data?.students;
    if (topStudents !== undefined) {
      // Expected 6 (Toshkent-scoped). If 12, region scope is missing → P0.
      expect.soft(topStudents, `gov.toshkent data.students: expected 6 (region-scoped), got ${topStudents} — if 12, scope miss`).toBe(6);
    }
    const r2 = await apiFetch(p.govT, '/api/v1/government/students?limit=50');
    console.log(`[CHAIN-3] gov.toshkent /schools data.students=${topStudents}`);
    console.log(`[CHAIN-3] gov.toshkent /students status=${r2.status} total=${r2.body?.data?.total ?? r2.body?.total}`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CHAIN 2 — Parent ratings propagation (S1 only has ratings in seed)
  // DB: 12 ratings, sum=51, avg=51/12=4.25 → rounded to 4.3
  // ════════════════════════════════════════════════════════════════════════════

  test('CHAIN-2 | admin1 school-ratings: count=12, average=4.3', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/admin/school-ratings');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const list = r.body?.data ?? r.body ?? [];
    const s1 = (Array.isArray(list) ? list : []).find(s =>
      s.schoolId === DB.S1_ID || s.school?.id === DB.S1_ID || s.id === DB.S1_ID,
    );
    if (s1) {
      expect.soft(s1.count, `S1 count: expected 12, got ${s1.count}`).toBe(DB.S1_PARENT_RATING.count);
      expect.soft(s1.average, `S1 average: expected 4.3, got ${s1.average}`).toBe(DB.S1_PARENT_RATING.avg);
    } else {
      console.log(`[CHAIN-2] S1 not found in school-ratings list. Keys: ${JSON.stringify((Array.isArray(list) ? list[0] : list))}`);
      expect.soft(false, 'S1 entry not found in admin school-ratings').toBeTruthy();
    }
  });

  test('CHAIN-2 | gov.toshkent ratings: S1 present, parentAvg=4.3', async () => {
    // GET /government/ratings defaults to direction=combined → { data: { direction, schools: [...] } }
    const r = await apiFetch(p.govT, '/api/v1/government/ratings');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const schools = r.body?.data?.schools ?? [];
    const s1 = schools.find(s => s.id === DB.S1_ID);
    expect.soft(!!s1, `S1 should appear in gov.toshkent ratings (got ${schools.length} schools, first id=${schools[0]?.id})`).toBeTruthy();
    if (s1) {
      expect.soft(s1.parentAvg, `S1 parentAvg: expected 4.3, got ${s1.parentAvg}`).toBe(DB.THREE_RATING.parentAvg);
      expect.soft(s1.cumulativeAvg, `S1 cumulativeAvg: expected 4.7, got ${s1.cumulativeAvg}`).toBe(DB.THREE_RATING.cumulative);
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CHAIN 4 — Three-rating model integrity (S1)
  // Formula: cumulative = Math.round((parentAvg×0.5 + govAvg×0.5)×10)/10
  //        = Math.round((4.3×0.5 + 5×0.5)×10)/10 = 4.7
  // govAvg = stars from latest period ORDER BY period DESC, createdAt DESC
  // ════════════════════════════════════════════════════════════════════════════

  test('CHAIN-4 | admin1 school-rating-summary: three-rating model S1', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/admin/school-rating-summary');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const d = r.body?.data;
    expect.soft(d?.parent?.count, `parent.count: expected 12, got ${d?.parent?.count}`).toBe(DB.THREE_RATING.parentCount);
    expect.soft(d?.parent?.avg,   `parent.avg:   expected 4.3, got ${d?.parent?.avg}`).toBe(DB.THREE_RATING.parentAvg);
    expect.soft(d?.government?.avg,    `gov.avg:    expected 5, got ${d?.government?.avg}`).toBe(DB.THREE_RATING.govAvg);
    expect.soft(d?.government?.period, `gov.period: expected Q4-2025, got ${d?.government?.period}`).toBe(DB.S1_GOV_RATING.latestPeriod);
    expect.soft(d?.cumulative?.avg,       `cumulative.avg:       expected 4.7,  got ${d?.cumulative?.avg}`).toBe(DB.THREE_RATING.cumulative);
    expect.soft(d?.cumulative?.isPartial, `cumulative.isPartial: expected false, got ${d?.cumulative?.isPartial}`).toBe(false);
  });

  test('CHAIN-4 | gov.republic schools: S1 three-rating fields match formula', async () => {
    const r = await apiFetch(p.govR, '/api/v1/government/schools');
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const schools = r.body?.data?.schools ?? r.body?.data ?? (Array.isArray(r.body) ? r.body : []);
    const s1 = schools.find(s => s.id === DB.S1_ID);
    if (!s1) {
      expect.soft(false, 'S1 school not found in gov.republic schools list').toBeTruthy();
      return;
    }
    expect.soft(s1.parentAvg,   `S1 parentAvg: expected 4.3, got ${s1.parentAvg}`).toBe(DB.THREE_RATING.parentAvg);
    expect.soft(s1.parentCount, `S1 parentCount: expected 12, got ${s1.parentCount}`).toBe(DB.THREE_RATING.parentCount);
    const govAvg  = s1.govAvg ?? s1.government?.avg;
    expect.soft(govAvg, `S1 govAvg: expected 5, got ${govAvg}`).toBe(DB.THREE_RATING.govAvg);
    const cumul = s1.cumulativeAvg ?? s1.cumulative?.avg;
    expect.soft(cumul, `S1 cumulativeAvg: expected 4.7, got ${cumul}`).toBe(DB.THREE_RATING.cumulative);
  });

  test('CHAIN-4 | gov.toshkent school detail S1: three-rating verified', async () => {
    const r = await apiFetch(p.govT, `/api/v1/government/schools/${DB.S1_ID}`);
    expect.soft(r.status, `HTTP ${r.status}`).toBe(200);
    const d = r.body?.data;
    expect.soft(d?.parentAvg, `S1 parentAvg: expected 4.3, got ${d?.parentAvg}`).toBe(DB.THREE_RATING.parentAvg);
    const govAvg = d?.govAvg ?? d?.government?.avg;
    expect.soft(govAvg, `S1 govAvg: expected 5, got ${govAvg}`).toBe(DB.THREE_RATING.govAvg);
    const cumul = d?.cumulativeAvg ?? d?.cumulative?.avg;
    expect.soft(cumul, `S1 cumulativeAvg: expected 4.7, got ${cumul}`).toBe(DB.THREE_RATING.cumulative);
  });
});
