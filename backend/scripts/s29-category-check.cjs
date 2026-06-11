// S29 / T2 — read-only: school type enum vs categoryId relation.
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT s.name, s.type, sc.code AS category_code, sc.name AS category_name
      FROM schools s LEFT JOIN school_categories sc ON sc.id = s."categoryId"
     ORDER BY s.name`);
  console.log(JSON.stringify(r.rows, null, 1));
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
