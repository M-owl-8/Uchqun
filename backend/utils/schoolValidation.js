import { Op } from 'sequelize';
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
 * The list-side mirror of isTeacherAssignedToChild().
 *
 * Returns every child id a teacher may access, via the SAME two paths that
 * function accepts: group ownership (group.teacherId) and the legacy
 * parent.teacherId link. Any other role gets null, meaning "not teacher-scoped —
 * the caller's own school/role scoping applies".
 *
 * Why this exists: the read endpoints and the write/retrieval path had forked.
 * uploadMedia and proxyMediaFile gate on isTeacherAssignedToChild (union), while
 * getMedia, getMediaItem, getMeal, getActivities, getActivity and the emotional
 * monitoring reads resolved children ONLY through users.teacherId. A teacher
 * wired the modern way — a group, no legacy link — was authorised to upload and
 * to fetch a file through the proxy, but their gallery, meal list and activity
 * list were empty. Six teachers are in exactly that state in production today,
 * and since reception onboarding only sets users.teacherId when a teacher or
 * group is explicitly chosen, teachers can be created blind.
 *
 * Keeping the union rather than narrowing to groups is deliberate: three
 * children in production have no group at all and reach their teacher only via
 * the legacy link. Dropping it would make them unreachable — a regression, not a
 * fix. See LQ-TEACHERLINK in the remediation log for the stale-link hazard that
 * the union does NOT close.
 *
 * Fail-closed: a teacher with neither link gets [], never "everything".
 *
 * @param {object} req - Express request (req.user.id + req.user.role)
 * @returns {Promise<string[]|null>} child ids, or null when not a teacher
 */
export async function getTeacherScopedChildIds(req) {
  if (!req.user || req.user.role !== 'teacher') return null;

  const [ownGroups, ownParents] = await Promise.all([
    Group.findAll({ where: { teacherId: req.user.id }, attributes: ['id'] }),
    User.findAll({ where: { teacherId: req.user.id, role: 'parent' }, attributes: ['id'] }),
  ]);

  const groupIds = ownGroups.map((g) => g.id);
  const parentIds = ownParents.map((u) => u.id);

  const or = [];
  if (groupIds.length) or.push({ groupId: { [Op.in]: groupIds } });
  if (parentIds.length) or.push({ parentId: { [Op.in]: parentIds } });

  // Neither link → no children. Never fall through to an unscoped query.
  if (or.length === 0) return [];

  const children = await Child.findAll({
    where: { [Op.or]: or },
    attributes: ['id'],
  });

  return children.map((c) => c.id);
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
