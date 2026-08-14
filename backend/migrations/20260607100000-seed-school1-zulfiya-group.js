// Option A data repair — 2026-06-07
//
// School 1 (eec19bb5) seeder gap: Zulfiya Nazarova has no row in the groups
// table. The two children in her scope (Bobur Sobirov, Shahlo Tursunova) have
// groupId values that reference groups which were deleted at some point, leaving
// orphaned FKs.
//
// This migration:
//   1. Creates a "Guruh 1" group for Zulfiya at School 1 (idempotent — skipped
//      if she already has a group after a prior manual fix).
//   2. Updates Bobur's and Shahlo's children.groupId to Zulfiya's new group.
//   3. Updates their parent users (Hulkar, Dilorom) denormalized fields
//      (groupId, teacherId) so the legacy /teacher/parents denorm path also works.
//
// Lola Qodirova (teacher = 'Doniyor Ergashev') is intentionally excluded —
// she belongs to a different teacher scope and requires a separate data repair.
//
// The migration is idempotent. Both UPDATEs are guarded by the same teacher=
// filter, so re-running after a prior successful run is a no-op.

'use strict';

const ZULFIYA_ID  = 'd77eb37b-0da4-4530-8096-9ea221e9a891';
const SCHOOL1_ID  = 'eec19bb5-36ae-4006-a330-031d07654c40';

export async function up(queryInterface) {
  // D-65: this is a DATA SEED for two specific rows on production —
  // teacher Zulfiya (d77eb37b…) at school 1 (eec19bb5…). On an empty database
  // neither exists, so the INSERT violates the groups→users foreign key and the
  // whole rebuild dies on a repair for data that is not there.
  //
  // A seed for particular production rows is meaningless on a fresh database.
  // Skip when its subjects are absent; the log line says which.
  const [[{ ready }]] = await queryInterface.sequelize.query(`
    SELECT (
      EXISTS (SELECT 1 FROM users   WHERE id = '${ZULFIYA_ID}')
      AND EXISTS (SELECT 1 FROM schools WHERE id = '${SCHOOL1_ID}')
    ) AS ready;`);
  if (!ready) {
    console.log('[seed-school1] teacher or school not present (fresh database) — skipping seed');
    return;
  }

  const [existing] = await queryInterface.sequelize.query(
    `SELECT id FROM groups WHERE "teacherId" = :tid LIMIT 1`,
    { replacements: { tid: ZULFIYA_ID }, type: queryInterface.sequelize.QueryTypes.SELECT },
  );

  let groupId;
  if (existing) {
    groupId = existing.id;
    console.log(`[seed-school1] Zulfiya already has group ${groupId} — skipping INSERT`);
  } else {
    const now = new Date().toISOString();
    await queryInterface.sequelize.query(
      `INSERT INTO groups (id, name, "teacherId", "schoolId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'Guruh 1', :tid, :sid, :now, :now)`,
      { replacements: { tid: ZULFIYA_ID, sid: SCHOOL1_ID, now } },
    );
    const [created] = await queryInterface.sequelize.query(
      `SELECT id FROM groups WHERE "teacherId" = :tid LIMIT 1`,
      { replacements: { tid: ZULFIYA_ID }, type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    groupId = created.id;
    console.log(`[seed-school1] Created group ${groupId} for Zulfiya`);
  }

  // Update Bobur's and Shahlo's groupId (identified by legacy teacher text field)
  const [childResult] = await queryInterface.sequelize.query(
    `UPDATE children
     SET    "groupId"   = :gid,
            "updatedAt" = NOW()
     WHERE  "schoolId"  = :sid
       AND  "teacher"   = 'Zulfiya Nazarova'
       AND  "deletedAt" IS NULL`,
    { replacements: { gid: groupId, sid: SCHOOL1_ID } },
  );
  console.log(`[seed-school1] Updated ${childResult} child row(s) → groupId ${groupId}`);

  // Update parent users (Hulkar + Dilorom) denormalized columns
  const [parentResult] = await queryInterface.sequelize.query(
    `UPDATE users u
     SET    "groupId"   = :gid,
            "teacherId" = :tid,
            "updatedAt" = NOW()
     FROM   children c
     WHERE  c."parentId"  = u.id
       AND  c."schoolId"  = :sid
       AND  c."teacher"   = 'Zulfiya Nazarova'
       AND  c."deletedAt" IS NULL
       AND  u."deletedAt" IS NULL`,
    { replacements: { gid: groupId, tid: ZULFIYA_ID, sid: SCHOOL1_ID } },
  );
  console.log(`[seed-school1] Updated ${parentResult} parent user(s) → groupId ${groupId}, teacherId ${ZULFIYA_ID}`);
}

export async function down() {
  // Intentionally a no-op — reversing a seed repair would put the DB back into
  // a broken state. If a rollback is needed, run the seed script manually.
}
