import Child from '../models/Child.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import School from '../models/School.js';

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

  // D-54: government users have no schoolId — they are scoped by govRegionId —
  // so the check above skipped them entirely and admitted EVERY government
  // account to EVERY child. A region-scoped account (gov.toshkent) could read a
  // child in Andijon. Region scoping is enforced on the /government/* endpoints
  // (Campaign I P6) and was simply absent from this shared path.
  if (req.user.role === 'government' && req.user.govRegionId) {
    const school = await School.findByPk(child.schoolId, { attributes: ['id', 'regionId'] });
    if (!school || school.regionId !== req.user.govRegionId) {
      return null;
    }
  }

  return child;
}

/**
 * Checks that a teacher is assigned to a child via the modern (group.teacherId)
 * or legacy (parent.teacherId) assignment path. Non-teacher roles bypass — they
 * have school-wide access and must be gated at the route/middleware layer.
 *
 * Call AFTER validateChildAccess so the child object is already loaded.
 *
 * @param {object} child - Child instance returned by validateChildAccess
 * @param {object} req   - Express request (req.user.id + req.user.role)
 * @returns {Promise<boolean>}
 */
export async function isTeacherAssignedToChild(child, req) {
  if (!req.user || req.user.role !== 'teacher') return true;
  if (!child) return false;

  // Modern path: child is in a group whose teacherId matches this teacher
  if (child.groupId) {
    const group = await Group.findOne({
      where: { id: child.groupId, teacherId: req.user.id },
      attributes: ['id'],
    });
    if (group) return true;
  }

  // Legacy path: child's parent has teacherId pointing to this teacher
  if (child.parentId) {
    const parent = await User.findOne({
      where: { id: child.parentId, teacherId: req.user.id },
      attributes: ['id'],
    });
    if (parent) return true;
  }

  return false;
}

/**
 * Combines findByPk + validateChildAccess into one safe call for child-scoped resources.
 * Use this in any endpoint that reads/writes/deletes a child-scoped resource
 * (Activity, Meal, Media, TherapyUsage) after an initial PK lookup.
 *
 * Returns { resource, child } on success, or null if either the resource is
 * missing or the caller lacks access to the child's school.
 */
export async function findChildScopedResource(Model, resourceId, req) {
  const resource = await Model.findByPk(resourceId);
  if (!resource) return null;
  const child = await validateChildAccess(resource.childId, req);
  if (!child) return null;
  return { resource, child };
}
