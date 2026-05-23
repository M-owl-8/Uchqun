// RE-11 backfill: children created via POST /reception/children before the fix had schoolId=null
// because the createChildForParent controller derived schoolId from a free-text body field
// that the frontend never sent. This migration sets schoolId from the parent's schoolId.
//
// After the guard fix (RE-10), null-schoolId children are blocked from cross-school mutation
// (safe), but they are invisible to all school-scoped reads (orphaned). Max must manually
// resolve any unresolvable children (parent also has null schoolId).
export const up = async (queryInterface) => {
  // Set schoolId on null-schoolId children from their parent's schoolId
  const [, meta] = await queryInterface.sequelize.query(`
    UPDATE children c
    SET "schoolId" = u."schoolId",
        "updatedAt" = NOW()
    FROM users u
    WHERE c."parentId" = u.id
      AND c."schoolId" IS NULL
      AND u."schoolId" IS NOT NULL
  `);

  const resolved = meta?.rowCount ?? 0;

  // Count and collect children that could not be resolved (parent also has null schoolId, or no parent)
  const [unresolvable] = await queryInterface.sequelize.query(`
    SELECT c.id, c."firstName", c."lastName", c."parentId"
    FROM children c
    LEFT JOIN users u ON c."parentId" = u.id
    WHERE c."schoolId" IS NULL
      AND (u.id IS NULL OR u."schoolId" IS NULL)
  `);

  const unresolvableCount = unresolvable.length;
  const unresolvableIds = unresolvable.map(r => r.id);

  // Log results so Max can act on unresolvable cases
  console.log(`[backfill-child-schoolid] Resolved: set schoolId on ${resolved} children.`);
  if (unresolvableCount > 0) {
    console.warn(
      `[backfill-child-schoolid] ${unresolvableCount} children remain with null schoolId ` +
      `(parent has no schoolId or no parent). These records are orphaned. ` +
      `IDs for manual resolution: ${JSON.stringify(unresolvableIds)}`
    );
  } else {
    console.log('[backfill-child-schoolid] No unresolvable children. All null-schoolId children resolved.');
  }
};

export const down = async () => {
  // Non-reversible: we cannot restore the original null values
  // because we do not know which children were legitimately null vs. which were added post-fix.
  // This migration is intentionally not reversible.
  console.log('[backfill-child-schoolid] down: no-op (not reversible by design).');
};
