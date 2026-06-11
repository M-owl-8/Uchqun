// S29 / T9 (PL-024) — create a CHILDLESS parent test account on production.
// Account: childless.test@uchqun.uz / Test@2026 — documented for later cleanup:
//   DELETE FROM users WHERE email = 'childless.test@uchqun.uz';
// Idempotent: skips insert if the account already exists.
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
  const c = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const existing = await c.query(`SELECT id FROM users WHERE email = 'childless.test@uchqun.uz'`);
  if (existing.rows.length) {
    console.log('already exists:', existing.rows[0].id);
  } else {
    const school = await c.query(`SELECT id FROM schools ORDER BY name LIMIT 1`);
    const hash = await bcrypt.hash('Test@2026', 10);
    const r = await c.query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive",
                          "isVerified", "documentsApproved", status, "schoolId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'childless.test@uchqun.uz', $1, 'Childless', 'Test', 'parent',
               true, true, true, 'active', $2, NOW(), NOW())
       RETURNING id`,
      [hash, school.rows[0].id],
    );
    console.log('created childless parent:', r.rows[0].id);
  }
  const kids = await c.query(
    `SELECT COUNT(*)::int AS n FROM children ch JOIN users u ON u.id = ch."parentId"
      WHERE u.email = 'childless.test@uchqun.uz'`);
  console.log('children linked:', kids.rows[0].n, '(must be 0)');
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
