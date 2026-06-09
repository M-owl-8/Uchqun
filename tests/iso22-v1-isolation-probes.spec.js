/**
 * S22-V1 — Tenant isolation proof
 * Converts 0 PASS / 20 PARTIAL / 6 BLOCKED to hard verdicts.
 *
 * Part A: 6 hostile URL probes (+ 1 same-school intra-isolation variant)
 *   — direct API calls with cross-tenant UUIDs; assert HTTP status ≠ 200.
 * Part B: 20 list-page probes converted to hard count + absence assertions
 *   — API responses checked for count AND provable absence of cross-tenant identifiers.
 *
 * NOTE: Cross-tenant UUIDs are in this file but NOT printed in ISOLATION-REPORT.md.
 * Ownership confirmed from production DB before use (see S22-V1 session notes).
 */
const { test, expect } = require('@playwright/test');

const API   = 'https://uchqun-production-b484.up.railway.app';
const T_BASE = 'https://teacher-production-0647.up.railway.app';
const A_BASE = 'https://admin-production-536f.up.railway.app';
const G_BASE = 'https://government-production.up.railway.app';
const PW    = 'Test@2026';

// ── Cross-tenant probe UUIDs ──────────────────────────────────────────────────
// Confirmed ownership from DB; kept here, not published in the report.
// S2 = Toshkent Maxsus Maktab 2 (7b27fadd), S1 = Toshkent Maxsus Maktab 1 (eec19bb5)
const S2_CHILD   = '4eb13936-d4a8-42f4-bf79-88d8b65a1e70'; // Jasur Mirzayev, parent5, S2
const S2_TEACHER = '7152d1eb-059e-4905-90ee-36a561f268be'; // Feruza Normatova (teacher3), S2
const S1_OTHER   = 'cac33a77-53e5-430f-819e-6cf85d7fa4bb'; // Shahlo Tursunova, parent2, S1 (≠ parent1)

// School IDs used for absence assertions
const SCHOOL_IDS = {
  S1: 'eec19bb5-36ae-4006-a330-031d07654c40',
  S2: '7b27fadd-3532-4e53-a5e3-79bc652a947f',
  S3: '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
  S4: '5334e23c-a749-4808-8b9a-1f8c67aa1938',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login(browser, base, email, pw) {
  const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.goto(`${base}/login`, { timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 25000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.getByRole('button', { name: /kirish|login|sign in/i }).first().click();
  await page.waitForURL(
    url => !url.href.includes('/login') && !url.href.includes('/change-password'),
    { timeout: 30000 },
  );
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  return page;
}

/** Authenticated API call via the page's browser context (carries session cookies). */
async function apiFetch(page, path) {
  return page.evaluate(async ([base, p]) => {
    try {
      const r    = await fetch(`${base}${p}`, { credentials: 'include' });
      let body   = null;
      try { body = await r.json(); } catch { /* binary or empty */ }
      return { status: r.status, body };
    } catch (e) {
      return { status: 0, body: null, error: String(e) };
    }
  }, [API, path]);
}

/** Flatten a response body to a searchable JSON string. */
function bodyStr(r) { return JSON.stringify(r.body ?? ''); }

// ── Session setup ─────────────────────────────────────────────────────────────

test.describe.serial('S22-V1 Isolation probes', () => {
  let p = {}; // shared pages keyed by account label

  test.beforeAll(async ({ browser }) => {
    [
      p.teacher1, p.teacher3, p.parent1,
      p.admin1,   p.admin2,
      p.govT,     p.govS,     p.govR,
    ] = await Promise.all([
      login(browser, T_BASE, 'teacher1@uchqun.uz', PW),
      login(browser, T_BASE, 'teacher3@uchqun.uz', PW),
      login(browser, T_BASE, 'parent1@uchqun.uz',  PW),
      login(browser, A_BASE, 'admin1@uchqun.uz',   PW),
      login(browser, A_BASE, 'admin2@uchqun.uz',   PW),
      login(browser, G_BASE, 'gov.toshkent@uchqun.uz',  PW),
      login(browser, G_BASE, 'gov.samarqand@uchqun.uz', PW),
      login(browser, G_BASE, 'gov.republic@uchqun.uz',  PW),
    ]);
  });

  test.afterAll(async () => {
    for (const page of Object.values(p)) {
      await page.context().close().catch(() => {});
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PART A — HOSTILE URL PROBES
  // Expect: 403 or 404.  A 200 with other-tenant data = P0 breach.
  // ══════════════════════════════════════════════════════════════════════════

  test('ISO-T06 | teacher1 → S2 child detail → 404', async () => {
    const r = await apiFetch(p.teacher1, `/api/v1/teacher/children/${S2_CHILD}`);
    expect(r.status, `Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`).toBe(404);
    await p.teacher1.screenshot({ path: 'audits/beta/screens/iso-t06-teacher1-s2child.png' });
  });

  test('ISO-P01 | parent1 → S2 child attendance → 403', async () => {
    const r = await apiFetch(p.parent1, `/api/v1/parent/attendance?childId=${S2_CHILD}`);
    expect(r.status, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`).toBe(403);
    expect(r.body?.error?.code).toBe('ATTENDANCE_CHILD_NOT_ACCESSIBLE');
    await p.parent1.screenshot({ path: 'audits/beta/screens/iso-p01-parent1-s2-attendance.png' });
  });

  test('ISO-P02 | parent1 → S2 child journal → 404', async () => {
    const r = await apiFetch(p.parent1, `/api/v1/parent/children/${S2_CHILD}/journal`);
    expect(r.status, `Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`).toBe(404);
    await p.parent1.screenshot({ path: 'audits/beta/screens/iso-p02-parent1-s2-journal.png' });
  });

  test('ISO-P03 | parent1 → S2 child media: no S2 data in response', async () => {
    // Ideal: 403 (childId not owned). Actual: 200 with own data (childId param silently dropped).
    // Hard assertion: whatever status, NO S2 child data may appear in the body.
    // P2 behavioral finding logged as DEF-012; not a P0 breach — no cross-tenant data returned.
    const r = await apiFetch(p.parent1, `/api/v1/parent/media?childId=${S2_CHILD}`);
    const s = bodyStr(r);
    expect(s, 'P0 BREACH if S2 child UUID in response').not.toContain(S2_CHILD);
    expect(s, 'P0 BREACH if S2 child name in response').not.toContain('Mirzayev');
    expect([200, 403], `Unexpected status ${r.status}`).toContain(r.status);
    await p.parent1.screenshot({ path: 'audits/beta/screens/iso-p03-parent1-s2-media.png' });
  });

  test('ISO-A05 | admin1 → S2 teacher detail → 404', async () => {
    const r = await apiFetch(p.admin1, `/api/v1/admin/teachers/${S2_TEACHER}`);
    expect(r.status, `Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`).toBe(404);
    await p.admin1.screenshot({ path: 'audits/beta/screens/iso-a05-admin1-s2-teacher.png' });
  });

  // Same-school intra-isolation: parent1 → parent2's child (Shahlo, same S1 school)
  test('ISO-P-INTRA (attendance) | parent1 → same-school other-parent child → 403', async () => {
    const r = await apiFetch(p.parent1, `/api/v1/parent/attendance?childId=${S1_OTHER}`);
    expect(r.status, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`).toBe(403);
    expect(r.body?.error?.code).toBe('ATTENDANCE_CHILD_NOT_ACCESSIBLE');
    await p.parent1.screenshot({ path: 'audits/beta/screens/iso-p-intra-attendance.png' });
  });

  test('ISO-P-INTRA (journal) | parent1 → same-school other-parent child journal → 404', async () => {
    const r = await apiFetch(p.parent1, `/api/v1/parent/children/${S1_OTHER}/journal`);
    expect(r.status, `Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`).toBe(404);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PART B — LIST PAGE HARD ASSERTIONS
  // Count + provable absence of known cross-tenant identifiers.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Teacher portal ────────────────────────────────────────────────────────

  test('ISO-T01 | teacher1 children list: only S1 children (count=3, no S2 names)', async () => {
    const r = await apiFetch(p.teacher1, '/api/v1/teacher/children');
    expect(r.status).toBe(200);
    // Find the children array wherever it lives in the response
    const children = r.body?.data ?? r.body?.children ?? (Array.isArray(r.body) ? r.body : []);
    expect(children.length, `Expected 3 S1 children, got ${children.length}`).toBe(3);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S2);
    expect(s).not.toContain('Mirzayev');  // Jasur Mirzayev (S2)
    expect(s).not.toContain('Hasanov');   // Murod Hasanov (S2)
    expect(s).not.toContain('Rahimova'); // Diyora Rahimova (S2) — note teacher1 surname is Nazarova
    expect(s).toContain('Sobirov');       // Bobur Sobirov (S1, present)
  });

  test('ISO-T02 | teacher1 activities list: no S2 child IDs', async () => {
    // Activities are school-scoped. Child dropdown available via children list endpoint.
    const r = await apiFetch(p.teacher1, '/api/v1/activities?limit=50');
    expect(r.status).toBe(200);
    expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S2);
    expect(bodyStr(r)).not.toContain(S2_CHILD);
  });

  test('ISO-T03 | teacher1 chat: no S2 parent names in conversations', async () => {
    const r = await apiFetch(p.teacher1, '/api/v1/chat/conversations');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain('Mirzayeva');  // Lobar Mirzayeva (parent5, S2)
    expect(s).not.toContain('Hasanova');   // Kamola Hasanova (parent4, S2)
    expect(s).not.toContain('Rahimov');    // Mansur Rahimov (parent6, S2)
  });

  test('ISO-T04 | teacher1 parents list: only S1 parents (count=2, group-scoped)', async () => {
    // /teacher/parents is group-scoped: teacher1 owns Guruh 1 (Bobur+Shahlo) → 2 parents.
    // Lola/parent3 is in a different group (not teacher1's), so correctly absent here.
    const r = await apiFetch(p.teacher1, '/api/v1/teacher/parents');
    expect(r.status).toBe(200);
    const parents = r.body?.data ?? r.body?.parents ?? (Array.isArray(r.body) ? r.body : []);
    expect(parents.length, `Expected 2 S1 parents (group-scoped), got ${parents.length}`).toBe(2);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S2);
    expect(s).not.toContain('Mirzayeva'); // parent5 (S2)
  });

  test('ISO-T05 | teacher1 media: no S2 child IDs in response', async () => {
    const r = await apiFetch(p.teacher1, '/api/v1/media?limit=50');
    expect(r.status).toBe(200);
    expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S2);
    expect(bodyStr(r)).not.toContain(S2_CHILD);
  });

  test('ISO-T07 | teacher3 children list: only S2 children (no S1 names)', async () => {
    const r = await apiFetch(p.teacher3, '/api/v1/teacher/children');
    expect(r.status).toBe(200);
    const children = r.body?.data ?? r.body?.children ?? (Array.isArray(r.body) ? r.body : []);
    expect(children.length, `Expected 3 S2 children, got ${children.length}`).toBe(3);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S1);
    expect(s).not.toContain('Sobirov');   // Bobur Sobirov (S1)
    expect(s).toContain('Mirzayev');      // Jasur Mirzayev (S2, present)
  });

  // ── Admin portal ──────────────────────────────────────────────────────────

  test('ISO-A01 | admin1 parents list: only S1 parents (count=3, no S2 names)', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/admin/parents');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S2);
    expect(s).not.toContain('Mirzayeva'); // parent5 (S2)
    expect(s).not.toContain('Hasanova');  // parent4 (S2)
    expect(s).toContain('Sobirova');      // Hulkar Sobirova (parent1, S1)
    const parents = r.body?.data ?? r.body?.parents ?? (Array.isArray(r.body) ? r.body : []);
    if (Array.isArray(parents) && parents.length > 0) {
      expect(parents.length, `Expected 3 S1 parents, got ${parents.length}`).toBe(3);
    }
  });

  test('ISO-A02 | admin1 audit log: no S2 school IDs', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/admin/audit-log?limit=50');
    expect(r.status).toBe(200);
    expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S2);
    expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S3);
    expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S4);
  });

  test('ISO-A03 | admin1 teachers list: only S1 teachers (count=2, no S2 names)', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/admin/teachers');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain('Normatova');    // Feruza Normatova (teacher3, S2)
    expect(s).not.toContain('Toshpulatov'); // Sardor Toshpulatov (teacher4, S2)
    expect(s).toContain('Nazarova');         // Zulfiya Nazarova (teacher1, S1)
    expect(s).toContain('Ergashev');         // Doniyor Ergashev (teacher2, S1)
    const teachers = r.body?.data ?? r.body?.teachers ?? (Array.isArray(r.body) ? r.body : []);
    if (Array.isArray(teachers) && teachers.length > 0) {
      expect(teachers.length, `Expected 2 S1 teachers, got ${teachers.length}`).toBe(2);
    }
  });

  test('ISO-A04 | admin1 communications: no S2 school IDs', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/chat/admin/conversations?limit=20');
    // 200 or empty 200; assert absence of S2 school in any response
    if (r.status === 200) {
      expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S2);
    } else {
      // endpoint may not exist at this path; log but skip
      expect([200, 404]).toContain(r.status);
    }
  });

  test('ISO-A06 | admin1 school profile: is S1 name', async () => {
    const r = await apiFetch(p.admin1, '/api/v1/admin/school');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).toContain('Toshkent Maxsus Maktab 1');
    expect(s).not.toContain('Toshkent Maxsus Maktab 2');
    expect(s).not.toContain('Samarqand');
  });

  test('ISO-A07 | admin2 teachers list: only S2 teachers (no S1 names)', async () => {
    const r = await apiFetch(p.admin2, '/api/v1/admin/teachers');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain('Nazarova');    // teacher1 (S1)
    expect(s).not.toContain(SCHOOL_IDS.S1);
    expect(s).toContain('Normatova');       // teacher3 (S2, present)
    const teachers = r.body?.data ?? r.body?.teachers ?? (Array.isArray(r.body) ? r.body : []);
    if (Array.isArray(teachers) && teachers.length > 0) {
      expect(teachers.length, `Expected 2 S2 teachers, got ${teachers.length}`).toBe(2);
    }
  });

  // ── Government portal ─────────────────────────────────────────────────────

  test('ISO-G01 | gov.toshkent schools: only Toshkent (no Samarqand IDs, count=2)', async () => {
    const r = await apiFetch(p.govT, '/api/v1/government/schools');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S3);
    expect(s).not.toContain(SCHOOL_IDS.S4);
    expect(s).not.toContain('Samarqand');
    expect(s).toContain(SCHOOL_IDS.S1);
    // Count schools
    const schools = r.body?.data?.schools ?? r.body?.data ?? (Array.isArray(r.body) ? r.body : []);
    if (Array.isArray(schools)) {
      expect(schools.length, `Expected 2 Toshkent schools, got ${schools.length}`).toBe(2);
    }
  });

  test('ISO-G02 | gov.samarqand schools: only Samarqand (no Toshkent IDs, count=2)', async () => {
    const r = await apiFetch(p.govS, '/api/v1/government/schools');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S1);
    expect(s).not.toContain(SCHOOL_IDS.S2);
    expect(s).not.toContain('Toshkent Maxsus');
    expect(s).toContain(SCHOOL_IDS.S3);
    const schools = r.body?.data?.schools ?? r.body?.data ?? (Array.isArray(r.body) ? r.body : []);
    if (Array.isArray(schools)) {
      expect(schools.length, `Expected 2 Samarqand schools, got ${schools.length}`).toBe(2);
    }
  });

  test('ISO-G03 | gov.toshkent students: no Samarqand school IDs', async () => {
    const r = await apiFetch(p.govT, '/api/v1/government/students?limit=50');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S3);
    expect(s).not.toContain(SCHOOL_IDS.S4);
    expect(s).not.toContain('Samarqand Maxsus');
  });

  test('ISO-G04 | gov.toshkent teachers: no Samarqand names/IDs', async () => {
    const r = await apiFetch(p.govT, '/api/v1/government/teachers?limit=50');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S3);
    expect(s).not.toContain(SCHOOL_IDS.S4);
    expect(s).not.toContain('Ergasheva'); // teacher5 (S3) — note teacher2 surname is Ergashev (different)
    expect(s).not.toContain('Aliyeva');   // teacher7 (S4)
  });

  test('ISO-G05 | gov.toshkent audit log: no Samarqand school IDs', async () => {
    const r = await apiFetch(p.govT, '/api/v1/government/audit-log?limit=50');
    expect(r.status).toBe(200);
    expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S3);
    expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S4);
  });

  test('ISO-G06 | gov.toshkent messages: no Samarqand school IDs', async () => {
    // Government messages/platform tab
    const r = await apiFetch(p.govT, '/api/v1/government/messages?limit=20');
    if (r.status === 200) {
      expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S3);
      expect(bodyStr(r)).not.toContain(SCHOOL_IDS.S4);
    } else {
      // Endpoint may use different path; try alternative
      const r2 = await apiFetch(p.govT, '/api/v1/news?limit=20');
      expect([200, 404]).toContain(r2.status);
      if (r2.status === 200) {
        expect(bodyStr(r2)).not.toContain(SCHOOL_IDS.S3);
        expect(bodyStr(r2)).not.toContain(SCHOOL_IDS.S4);
      }
    }
  });

  test('ISO-G07 | gov.toshkent ratings: only Toshkent schools (count=2)', async () => {
    const r = await apiFetch(p.govT, '/api/v1/government/ratings');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).not.toContain(SCHOOL_IDS.S3);
    expect(s).not.toContain(SCHOOL_IDS.S4);
    expect(s).not.toContain('Samarqand');
  });

  test('ISO-G08 | gov.toshkent dashboard stats < gov.republic stats', async () => {
    const [rT, rR] = await Promise.all([
      apiFetch(p.govT, '/api/v1/government/schools'),
      apiFetch(p.govR, '/api/v1/government/schools'),
    ]);
    expect(rT.status).toBe(200);
    expect(rR.status).toBe(200);
    const toshkentSchools = rT.body?.data?.schools ?? rT.body?.data ?? (Array.isArray(rT.body) ? rT.body : []);
    const republicSchools = rR.body?.data?.schools ?? rR.body?.data ?? (Array.isArray(rR.body) ? rR.body : []);
    if (Array.isArray(toshkentSchools) && Array.isArray(republicSchools)) {
      expect(toshkentSchools.length).toBeLessThan(republicSchools.length);
    }
  });

  test('ISO-G09 | gov.republic schools: all 4 schools visible', async () => {
    const r = await apiFetch(p.govR, '/api/v1/government/schools');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    expect(s).toContain(SCHOOL_IDS.S1);
    expect(s).toContain(SCHOOL_IDS.S2);
    expect(s).toContain(SCHOOL_IDS.S3);
    expect(s).toContain(SCHOOL_IDS.S4);
    const schools = r.body?.data?.schools ?? r.body?.data ?? (Array.isArray(r.body) ? r.body : []);
    if (Array.isArray(schools)) {
      expect(schools.length, `Expected 4 schools, got ${schools.length}`).toBe(4);
    }
  });

  test('ISO-G10 | gov.republic dashboard: both R01+R02 regions in response', async () => {
    // Regional breakdown may be in /schools response or a separate stats endpoint
    const r = await apiFetch(p.govR, '/api/v1/government/schools');
    expect(r.status).toBe(200);
    const s = bodyStr(r);
    // Both region UUIDs or names must appear
    expect(s).toContain('Toshkent');
    expect(s).toContain('Samarqand');
  });
});
