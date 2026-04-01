import Child from '../models/Child.js';

/**
 * Validates that a child belongs to the same school as the requesting user.
 * Returns the child if valid, or null if not found / wrong school.
 */
export async function validateChildAccess(childId, req) {
  if (!childId) return null;

  const child = await Child.findByPk(childId);
  if (!child) return null;

  // If user has schoolId, verify child belongs to same school
  if (req.user.schoolId && child.schoolId && child.schoolId !== req.user.schoolId) {
    return null; // Access denied - different school
  }

  return child;
}
