import Child from '../models/Child.js';

/**
 * Validates that a child belongs to the same school as the requesting user.
 * Returns the child if valid, or null if not found / access denied.
 *
 * Intake children (schoolId === null) are in the Uzbek pre-assignment workflow:
 * parent registered the child before school placement. Only the child's own parent
 * and government users may access them.
 */
export async function validateChildAccess(childId, req) {
  if (!childId) return null;

  const child = await Child.findByPk(childId);
  if (!child) return null;

  // Intake-status child — access restricted to own parent and government only
  if (child.schoolId === null) {
    const { role, id: userId } = req.user || {};
    if (role === 'government' || userId === child.parentId) return child;
    return null;
  }

  // Scoped users (with schoolId) must match child's schoolId exactly
  if (req.user.schoolId && child.schoolId !== req.user.schoolId) {
    return null;
  }

  return child;
}
