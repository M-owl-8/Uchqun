// G4 of BETA-LAUNCH-PLAN — parent privacy consent endpoints.
//
// Two endpoints, both parent-scoped:
//   GET  /parent/privacy-consent  → returns { consentedAt, required }
//   POST /parent/privacy-consent  → records consent (sets users.privacyConsentedAt = NOW)
//
// The parent portal calls GET on every mount of the layout shell and forces
// a modal when `required === true`. POST is idempotent — second call is a
// no-op (timestamp already set).

import User from '../../models/User.js';
import logger from '../../utils/logger.js';

const errorPayload = (code, detail) => ({
  success: false,
  error: { code, detail },
});

/**
 * GET /api/v1/parent/privacy-consent
 *
 * Returns the parent's current consent state. `required` is true when
 * the timestamp is null. Used by the parent portal to decide whether
 * to render the consent modal on first paint.
 */
export const getPrivacyConsent = async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json(errorPayload('PRIVACY_CONSENT_PARENT_ONLY'));
    }
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'privacyConsentedAt'],
    });
    if (!user) {
      return res.status(404).json(errorPayload('PRIVACY_CONSENT_USER_NOT_FOUND'));
    }
    return res.json({
      success: true,
      data: {
        consentedAt: user.privacyConsentedAt,
        required: user.privacyConsentedAt === null,
      },
    });
  } catch (err) {
    logger.error('getPrivacyConsent failed', { error: err.message, stack: err.stack });
    return res.status(500).json(errorPayload('PRIVACY_CONSENT_READ_FAILED', err.message));
  }
};

/**
 * POST /api/v1/parent/privacy-consent
 *
 * Records the parent's consent. Idempotent — if already set, returns
 * the existing timestamp unchanged (does not bump). Re-consent flows
 * (when the consent text changes materially) are a future operation
 * and live outside this endpoint.
 *
 * No body is required. The act of POSTing is the consent.
 */
export const setPrivacyConsent = async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json(errorPayload('PRIVACY_CONSENT_PARENT_ONLY'));
    }
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json(errorPayload('PRIVACY_CONSENT_USER_NOT_FOUND'));
    }
    if (user.privacyConsentedAt) {
      return res.json({
        success: true,
        data: { consentedAt: user.privacyConsentedAt, alreadyConsented: true },
      });
    }
    const now = new Date();
    await user.update({ privacyConsentedAt: now });
    return res.json({
      success: true,
      data: { consentedAt: now, alreadyConsented: false },
    });
  } catch (err) {
    logger.error('setPrivacyConsent failed', { error: err.message, stack: err.stack });
    return res.status(500).json(errorPayload('PRIVACY_CONSENT_WRITE_FAILED', err.message));
  }
};
