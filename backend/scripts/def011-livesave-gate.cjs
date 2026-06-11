// S24 / DEF-011 gate — live attendance save still works on the corrected enum.
// teacher1: POST status=sick for an assigned child (today) → assert saved, no
// ATTENDANCE_SAVE_FAILED → GET back, assert persisted → restore status=present.
const API = 'https://uchqun-production-b484.up.railway.app/api/v1';

function cookiesFrom(res) {
  return (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
}

(async () => {
  // Login
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher1@uchqun.uz', password: 'Test@2026' }),
  });
  if (loginRes.status !== 200) throw new Error(`login HTTP ${loginRes.status}`);
  const cookie = cookiesFrom(loginRes);

  // Find an assigned child via read-only DB lookup (child.groupId → groups.teacherId)
  const today = new Date().toISOString().slice(0, 10);
  const { Client } = require('pg');
  const db = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const found = await db.query(
    `SELECT c.id, c."firstName", c."lastName"
       FROM children c
       JOIN groups g ON g.id = c."groupId"
       JOIN users u ON u.id = g."teacherId"
      WHERE u.email = 'teacher1@uchqun.uz'
      LIMIT 1`
  );
  await db.end();
  if (!found.rows.length) throw new Error('no assigned children found for teacher1');
  const child = found.rows[0];
  console.log(`child: ${child.firstName} ${child.lastName} (${child.id})`);

  const post = async (status) => {
    const r = await fetch(`${API}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ records: [{ childId: child.id, date: today, status }] }),
    });
    const body = await r.json();
    console.log(`POST status=${status} → HTTP ${r.status} saved=${body.data?.saved ?? body.saved} errors=${JSON.stringify(body.data?.errors ?? body.errors)}`);
    const saved = body.data?.saved ?? body.saved;
    const errors = body.data?.errors ?? body.errors ?? [];
    if (saved !== 1 || errors.length) throw new Error(`save of '${status}' failed`);
  };

  const readBack = async (expect) => {
    const r = await fetch(`${API}/attendance?childId=${child.id}&startDate=${today}&endDate=${today}`, { headers: { cookie } });
    const body = await r.json();
    const rows = body.data || body;
    const row = (Array.isArray(rows) ? rows : []).find((x) => x.childId === child.id);
    console.log(`readback → status=${row?.status}`);
    if (row?.status !== expect) throw new Error(`expected ${expect}, got ${row?.status}`);
  };

  await post('sick');
  await readBack('sick');
  await post('present'); // restore clean state
  await readBack('present');
  console.log('PASS — sick save persists on the corrected enum; state restored to present');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
