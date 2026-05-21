// CP-021 Region authorization middleware.
// Chain: authenticate → requireGovernment → requireRegionScope → [requireGovAccess(key)] → controller

/**
 * Sets req.isGlobalAccess and req.regionScope from the authenticated government user's
 * govLevel/govRegionId. Must run after requireGovernment.
 *
 * republic accounts: isGlobalAccess=true, regionScope=null — see all regions
 * region accounts:   isGlobalAccess=false, regionScope=govRegionId — see one region
 * govLevel=null:     fail closed (403 GOV_ACCOUNT_NOT_CONFIGURED) — pre-migration account
 */
export const requireRegionScope = (req, res, next) => {
  const { govLevel, govType, govRegionId, govAccessGrants } = req.user;

  if (!govLevel) {
    return res.status(403).json({
      success: false,
      error: { code: 'GOV_ACCOUNT_NOT_CONFIGURED' },
    });
  }

  if (govLevel === 'republic') {
    req.regionScope = null;
    req.isGlobalAccess = true;
  } else {
    req.regionScope = govRegionId;
    req.isGlobalAccess = false;
  }

  req.govType = govType;
  req.govAccessGrants = govAccessGrants;
  next();
};

/**
 * Returns a Sequelize where-fragment scoping a query to the authenticated account's region.
 *
 * republic accounts → {} (no filter; spreads cleanly into any where clause)
 * region accounts   → { regionId: req.regionScope }
 *
 * Throws if called without requireRegionScope having run (regionScope not set on region account).
 * Every government controller that queries school-anchored data must call this.
 */
export const regionWhere = (req) => {
  if (req.isGlobalAccess) return {};
  if (!req.regionScope) {
    throw new Error('regionScope not set — use requireRegionScope as a route guard before calling regionWhere');
  }
  return { regionId: req.regionScope };
};

/**
 * Per-route access-grant middleware factory for secondary government accounts.
 *
 * main accounts (govType='main'): always pass — full access within their scope.
 * secondary accounts: pass only if govAccessGrants[grantKey] === true.
 *
 * Deny-by-default: secondary with null govAccessGrants is coerced to {} via `|| {}`.
 * A null grants object cannot escalate to main — the govType='main' check is separate and
 * only fires for actual main accounts. The || {} fallback ensures a misconfigured secondary
 * (null grants) gets 403 rather than crashing or escalating.
 */
export const requireGovAccess = (grantKey) => (req, res, next) => {
  if (req.govType === 'main') return next();
  const grants = req.govAccessGrants || {};
  if (!grants[grantKey]) {
    return res.status(403).json({
      success: false,
      error: { code: 'GOV_ACCESS_DENIED' },
    });
  }
  next();
};
