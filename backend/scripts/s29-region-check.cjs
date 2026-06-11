// S29 / T2 — read-only: schools.region string vs Region relation vs type.
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT s.name, s.region AS region_string, reg.name AS region_rel, s.type
      FROM schools s LEFT JOIN regions reg ON reg.id = s."regionId"
     ORDER BY s.name`);
  console.log(JSON.stringify(r.rows, null, 1));
  const counts = await c.query(`SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE s.region IS DISTINCT FROM reg.name)::int AS mismatched
    FROM schools s LEFT JOIN regions reg ON reg.id = s."regionId"`);
  console.log('MISMATCH COUNT:', JSON.stringify(counts.rows[0]));
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
