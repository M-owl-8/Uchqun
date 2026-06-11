/**
 * DEF-011 corrective migration (S24).
 *
 * Migration 20260608000001 remapped legacy attendance rows excused→sick when
 * completing the enum column swap. That mapping is semantically wrong:
 * 'excused' is a permission-based absence, not a medical state. The correct
 * target is 'absent'.
 *
 * 20260608000001 has already run on production, so it is NOT rewritten for
 * applied environments — this new migration corrects the data it produced.
 * The remapped rows are exactly the 'sick' rows that predate the 2026-06-08
 * migration: 'sick' did not exist in the old enum, so no genuine sick row can
 * have an earlier createdAt. Verified on production 2026-06-11: one such row
 * (createdAt 2026-05-31 03:20 UTC, synthetic seed data).
 *
 * (20260608000001's own up()/down() CASE mappings are corrected in the same
 * commit so any FRESH environment migrating from scratch gets excused→absent
 * directly — in those environments this migration finds 0 rows, a no-op.)
 */

const CUTOFF = '2026-06-08';

export async function up(queryInterface) {
  const [, meta] = await queryInterface.sequelize.query(
    `UPDATE child_attendance
        SET status = 'absent'
      WHERE status::text = 'sick'
        AND "createdAt" < '${CUTOFF}'`,
  );
  console.log(`DEF-011 correction: ${meta?.rowCount ?? '?'} legacy excused→sick row(s) remapped to absent`);
}

export async function down() {
  // Intentional no-op. This migration corrects misclassified data (excused
  // rows wrongly recorded as a medical 'sick' state). No predicate can
  // distinguish the corrected rows from genuine pre-existing 'absent' rows
  // after the fact, and reverting to a semantically wrong classification has
  // no legitimate use. Rollback of the schema migrations is unaffected.
}
