// S24 / DEF-012 follow-up — read-only: do any production admins lack schoolId?
// (mediaController.getMedia line ~98 honors childId UNVALIDATED for null-schoolId admins)
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    `SELECT email, role, "schoolId" IS NULL AS no_school, "isActive"
       FROM users WHERE role = 'admin' ORDER BY email`
  );
  console.log(JSON.stringify(r.rows, null, 1));
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
