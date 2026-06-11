// S24 / DEF-011 — read-only production check: attendance status distribution
// and candidate rows for the excused→sick mis-mapping (sick rows predating the
// 2026-06-08 enum-fix migration are exactly the remapped legacy 'excused' rows).
// Usage: PROD_DB_URL=<url> node backend/scripts/def011-check.cjs
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const dist = await c.query(
    'SELECT status::text AS status, COUNT(*)::int AS n FROM child_attendance GROUP BY 1 ORDER BY 1'
  );
  console.log('STATUS DISTRIBUTION:', JSON.stringify(dist.rows));
  const sick = await c.query(
    'SELECT id, status::text AS status, date, "createdAt", "updatedAt" FROM child_attendance WHERE status::text = $1 ORDER BY "createdAt"',
    ['sick']
  );
  console.log('SICK ROWS:', JSON.stringify(sick.rows, null, 1));
  const legacy = await c.query(
    `SELECT COUNT(*)::int AS n FROM child_attendance WHERE status::text = 'sick' AND "createdAt" < '2026-06-08'`
  );
  console.log('SICK ROWS PREDATING 2026-06-08 MIGRATION (= remapped excused):', legacy.rows[0].n);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
