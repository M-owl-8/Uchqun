// S25 / DEF-017 gate — legitimate WITH-schoolId admin paths still work:
//   in-school childId  → 200 (list returned)
//   cross-school childId → 403
// Child IDs discovered read-only via DB (admin1 = school of teacher1's group).
const API = 'https://uchqun-production-b484.up.railway.app/api/v1';

function cookiesFrom(res) {
  return (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
}

(async () => {
  const { Client } = require('pg');
  const db = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const r = await db.query(`
    SELECT c.id, c."schoolId", (c."schoolId" = a."schoolId") AS in_school
      FROM children c,
           (SELECT "schoolId" FROM users WHERE email = 'admin1@uchqun.uz') a
     ORDER BY in_school DESC`);
  await db.end();
  const inSchool = r.rows.find((x) => x.in_school);
  const crossSchool = r.rows.find((x) => !x.in_school);
  if (!inSchool || !crossSchool) throw new Error('could not find both in-school and cross-school children');
  console.log(`in-school child: ${inSchool.id} | cross-school child: ${crossSchool.id}`);

  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin1@uchqun.uz', password: 'Test@2026' }),
  });
  if (loginRes.status !== 200) throw new Error(`admin1 login HTTP ${loginRes.status}`);
  const cookie = cookiesFrom(loginRes);

  const own = await fetch(`${API}/media?childId=${inSchool.id}`, { headers: { cookie } });
  const ownBody = await own.json();
  console.log(`GET /media?childId=<in-school> → HTTP ${own.status} (array=${Array.isArray(ownBody)}, n=${Array.isArray(ownBody) ? ownBody.length : '-'})`);

  const cross = await fetch(`${API}/media?childId=${crossSchool.id}`, { headers: { cookie } });
  console.log(`GET /media?childId=<cross-school> → HTTP ${cross.status}`);

  const ok = own.status === 200 && Array.isArray(ownBody) && cross.status === 403;
  console.log(ok ? 'PASS — in-school 200, cross-school 403' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
