/**
 * Canonical government capability key set (CP-021).
 *
 * This is the single source of truth for what a secondary government account
 * can be granted. To add a capability:
 *   1. Add the key here.
 *   2. Add a requireGovAccess(key) call on the relevant government route (Sprint C).
 *   3. Add a toggle in the provisioning UI (Sprint E).
 *
 * Secondary accounts start with govAccessGrants={} (deny-by-default). Each key
 * must be explicitly set to true by the provisioning creator. Main accounts
 * bypass this check entirely (govType='main' short-circuits requireGovAccess).
 *
 * null govAccessGrants is reserved for main accounts only. The || {} fallback
 * in requireGovAccess prevents a misconfigured secondary (null grants) from
 * escalating to full access.
 */
export const GOV_CAPABILITIES = [
  'canViewSchools',
  'canArchiveSchools',
  'canViewRatings',
  'canViewAuditLog',
  'canViewStudents',
  'canViewTeachers',
  'canViewParents',
  'canManageAdmins',
  'canManageGovernmentUsers',
  'canViewMessages',
  'canManageRegistrations',
];

const CAPABILITY_SET = new Set(GOV_CAPABILITIES);

/**
 * Returns true if grants is a valid grant object: every key is a known
 * capability and every value is boolean. Null is not accepted here — null
 * is only valid for main accounts (govAccessGrants=null) and is never
 * passed to this validator.
 */
export const isValidGrantSet = (grants) => {
  if (grants === null || typeof grants !== 'object' || Array.isArray(grants)) return false;
  for (const [key, value] of Object.entries(grants)) {
    if (!CAPABILITY_SET.has(key)) return false;
    if (typeof value !== 'boolean') return false;
  }
  return true;
};

/**
 * Returns the unknown keys in a grant object (keys not in GOV_CAPABILITIES).
 * Used to produce informative error messages.
 */
export const unknownGrantKeys = (grants) =>
  Object.keys(grants).filter((k) => !CAPABILITY_SET.has(k));
