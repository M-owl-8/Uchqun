// Reversible, seed-scoped reparent probe (L8/L12): both child and parents carry
// the 5eed marker; the original parentId is printed before the change and the
// restore is verified after. No DELETE, no DROP, no truncate.
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DB, ssl: { rejectUnauthorized: false } });
await c.connect();
const TARGET = '5eed7bf3-ed3a-4548-8e59-099dd6737ea2'; // otaona11@tmm3.uz
const mode = process.argv[2];

if (mode === 'pick') {
  const r = await c.query(`select ch.id, ch."firstName"||' '||ch."lastName" nm, ch."parentId", u.email
    from children ch join users u on u.id=ch."parentId" join groups g on g.id=ch."groupId"
    where g.id='5eed2a08-5b27-4b7e-83dc-43d9f7b3c9f8' and ch.id::text like '5eed%' and ch."firstName" not in ('Gulnoza')
    order by ch."firstName" limit 3`);
  console.table(r.rows);
} else if (mode === 'attach') {
  const id = process.argv[3];
  const before = await c.query('select id,"parentId" from children where id=$1', [id]);
  if (!before.rows.length) throw new Error('child not found');
  if (!id.startsWith('5eed')) throw new Error('refusing: child is not seed-scoped');
  console.log('ORIGINAL parentId =', before.rows[0].parentId);
  await c.query('update children set "parentId"=$1 where id=$2 and id::text like $3', [TARGET, id, '5eed%']);
  const after = await c.query(`select ch.id, ch."firstName"||' '||ch."lastName" nm, u.email from children ch join users u on u.id=ch."parentId" where ch.id=$1`, [id]);
  console.table(after.rows);
  const all = await c.query(`select id, "firstName"||' '||"lastName" nm from children where "parentId"=$1 order by "firstName"`, [TARGET]);
  console.log('children now attached to otaona11:'); console.table(all.rows);
} else if (mode === 'restore') {
  const [, , , id, orig] = process.argv;
  if (!id.startsWith('5eed') || !orig.startsWith('5eed')) throw new Error('refusing: not seed-scoped');
  await c.query('update children set "parentId"=$1 where id=$2 and id::text like $3', [orig, id, '5eed%']);
  const r = await c.query(`select ch.id, ch."parentId", u.email from children ch join users u on u.id=ch."parentId" where ch.id=$1`, [id]);
  console.table(r.rows);
  console.log('RESTORED ==', r.rows[0].parentId === orig);
  const all = await c.query(`select count(*) from children where "parentId"=$1`, [TARGET]);
  console.log('children still attached to otaona11:', all.rows[0].count);
}
await c.end();
