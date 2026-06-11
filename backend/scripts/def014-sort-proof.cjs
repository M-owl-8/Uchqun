// S24 / DEF-014 — proves the chronological ORDER BY expression on real Postgres
// using a VALUES set spanning years (read-only; no table access).
// Usage: PROD_DB_URL=<url> node backend/scripts/def014-sort-proof.cjs
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.PROD_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const periods = ['Q4-2025', 'Q2-2026', 'Q1-2026', 'Q3-2025', 'Q4-2024', 'Q1-2027'];
  const values = periods.map((p) => `('${p}')`).join(',');
  const lex = await c.query(
    `SELECT p FROM (VALUES ${values}) AS t(p) ORDER BY p DESC`
  );
  const chrono = await c.query(
    `SELECT p FROM (VALUES ${values}) AS t(p)
      ORDER BY CAST(SPLIT_PART(p, '-', 2) AS INT) DESC,
               CAST(SUBSTRING(SPLIT_PART(p, '-', 1) FROM 2) AS INT) DESC`
  );
  const lexOrder = lex.rows.map((r) => r.p);
  const chronoOrder = chrono.rows.map((r) => r.p);
  console.log('LEXICOGRAPHIC (old, broken):', lexOrder.join(' > '));
  console.log('CHRONOLOGICAL (new):        ', chronoOrder.join(' > '));
  const expected = ['Q1-2027', 'Q2-2026', 'Q1-2026', 'Q4-2025', 'Q3-2025', 'Q4-2024'];
  const ok = JSON.stringify(chronoOrder) === JSON.stringify(expected);
  console.log(ok ? 'PASS — chronological order asserted' : `FAIL — expected ${expected.join(' > ')}`);
  await c.end();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
