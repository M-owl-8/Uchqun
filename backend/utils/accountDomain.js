/**
 * GOV-ACCOUNT-DOMAINS: Email domain enforcement by creator hierarchy.
 *
 * Domain is ALWAYS system-determined — never accepted from the frontend.
 * Frontend sends only the local part (before @); backend computes and appends the domain.
 *
 * Hierarchy:
 *   republic gov → republic gov peer    : @davlat.uz
 *   republic gov → region gov           : @<region.slug>.uz
 *   republic gov → admin                : @<school.slug>.uz
 *   region  gov → region gov (own)      : @<own_region.slug>.uz
 *   region  gov → region gov (other)    : ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE
 *   region  gov → admin (own region)    : @<school.slug>.uz
 *   region  gov → admin (other region)  : ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE
 *   admin        → reception/teacher    : @<own_school.slug>.uz
 *   admin        → parent              : @<own_school.slug>.uz
 *   admin        → admin / gov          : ACCOUNT_CREATE_FORBIDDEN_HIERARCHY
 *   reception    → (cannot create)      : ACCOUNT_CREATE_FORBIDDEN_HIERARCHY
 */

import Region from '../models/Region.js';
import School from '../models/School.js';

export const REPUBLIC_DOMAIN = 'davlat.uz';

// local part: 2-32 chars, lowercase alpha/digit/dot/underscore/hyphen, no leading/trailing dots
export const LOCAL_PART_RE = /^[a-z0-9][a-z0-9._-]{0,30}[a-z0-9]$|^[a-z0-9]$/;

/**
 * Validate the local part of an email address.
 * @param {string} localPart
 * @returns {boolean}
 */
export function isValidLocalPart(localPart) {
  if (!localPart || typeof localPart !== 'string') return false;
  return LOCAL_PART_RE.test(localPart);
}

/**
 * D-02: express-validator chain accepting EITHER the legacy `email` shape OR the
 * `localPart` shape that every frontend has sent since a0723db1 (2026-06-02).
 * The controllers compute the domain themselves via resolveEmailDomain(); the
 * route validator must not reject a request for lacking a field the product
 * deliberately stopped sending.
 *
 * Usage: `identityValidator(body)` — `body` is express-validator's `body`.
 */
export function identityValidator(body) {
  return body('email')
    .custom((value, { req }) => {
      const localPart = req.body?.localPart;
      if (localPart !== undefined && localPart !== null && localPart !== '') {
        if (!isValidLocalPart(String(localPart).toLowerCase())) {
          throw new Error('localPart must be 1-32 lowercase chars (a-z, 0-9, dot, underscore, hyphen)');
        }
        return true;
      }
      if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return true;
      throw new Error('either localPart or a valid email address is required');
    });
}

/**
 * Resolve the enforced email domain for a new account.
 *
 * @param {object} creator      - req.user from middleware
 * @param {string} newRole      - 'government' | 'admin' | 'reception' | 'teacher' | 'parent'
 * @param {object} [context]    - { govLevel?, govRegionId?, schoolId? }
 * @returns {Promise<string>}   - domain string, e.g. 'davlat.uz' | 'toshkent.uz' | 'tmm1.uz'
 * @throws {{ code: string, detail: string }} structured error matching BACKEND-012
 */
export async function resolveEmailDomain(creator, newRole, context = {}) {
  const { role, govLevel, govRegionId, schoolId: creatorSchoolId } = creator;

  // ── Government account creating another government account ─────────────────
  if (newRole === 'government') {
    const { govLevel: targetLevel, govRegionId: targetRegionId } = context;

    if (role !== 'government') {
      throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'only government accounts can create government accounts' };
    }

    if (targetLevel === 'republic') {
      // Region-level gov cannot elevate to republic level
      if (govLevel === 'region') {
        throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'region accounts cannot create republic-level accounts' };
      }
      return REPUBLIC_DOMAIN;
    }

    if (targetLevel === 'region') {
      if (!targetRegionId) {
        throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'govRegionId required for region-level government account' };
      }
      // Region-main can only create accounts in their own region
      if (govLevel === 'region' && targetRegionId !== govRegionId) {
        throw { code: 'ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE', detail: 'region accounts can only create peers in their own region' };
      }
      const region = await Region.findByPk(targetRegionId, { attributes: ['slug'] });
      if (!region) throw { code: 'ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE', detail: 'target region not found' };
      return `${region.slug}.uz`;
    }

    throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'invalid govLevel for target account' };
  }

  // ── Government account creating an admin ───────────────────────────────────
  if (newRole === 'admin') {
    if (role !== 'government') {
      throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'only government accounts can create admin accounts' };
    }
    const { schoolId } = context;
    if (!schoolId) {
      throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'schoolId required to create admin account' };
    }

    // Region accounts may only create admins for schools in their region
    const schoolWhere = { id: schoolId };
    if (govLevel === 'region') {
      schoolWhere.regionId = govRegionId;
    }
    const school = await School.findOne({ where: schoolWhere, attributes: ['slug'] });
    if (!school) {
      throw { code: 'ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE', detail: 'school not found in your region' };
    }
    return `${school.slug}.uz`;
  }

  // ── Admin creating reception; admin or reception creating teacher ──────────
  //
  // D-02 (scope extension): a0723db1 narrowed teacher creation to `admin` only,
  // but POST /reception/teachers has been mounted behind requireReception since
  // the first commit, the reception portal ships a full "Tarbiyachi qo'shish"
  // form, and there is no POST /admin/teachers route at all — adminRoutes.js:109
  // is GET-only. The result was that NO role could create a teacher through any
  // route: reception got 403 ACCOUNT_CREATE_FORBIDDEN_HIERARCHY, and admin had
  // nowhere to call. Before a0723db1 reception created teachers directly
  // (receptionTeacherController.createTeacher, isActive:true). Restored.
  if (newRole === 'reception' || newRole === 'teacher') {
    const allowed = newRole === 'teacher' ? ['admin', 'reception'] : ['admin'];
    if (!allowed.includes(role)) {
      throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: `only ${allowed.join(' or ')} accounts can create ${newRole} accounts` };
    }
    if (!creatorSchoolId) {
      throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'admin has no school assignment' };
    }
    const school = await School.findByPk(creatorSchoolId, { attributes: ['slug'] });
    if (!school) throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'admin school not found' };
    return `${school.slug}.uz`;
  }

  // ── Reception / admin creating parent ─────────────────────────────────────
  if (newRole === 'parent') {
    if (role !== 'reception' && role !== 'admin') {
      throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'only reception or admin accounts can create parent accounts' };
    }
    const schoolId = creatorSchoolId || context.schoolId;
    if (!schoolId) throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'no school context for parent creation' };
    const school = await School.findByPk(schoolId, { attributes: ['slug'] });
    if (!school) throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'creator school not found' };
    return `${school.slug}.uz`;
  }

  throw { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: `unhandled role: ${newRole}` };
}
