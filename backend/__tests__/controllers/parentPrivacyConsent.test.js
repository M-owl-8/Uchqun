// G4 of BETA-LAUNCH-PLAN — parent privacy consent controller tests.
//
// Two endpoints:
//   GET  /parent/privacy-consent  → { consentedAt, required }
//   POST /parent/privacy-consent  → records consent (sets users.privacyConsentedAt = NOW)
//
// Test discipline: each test exercises ONE behavior. The role-gate test is the
// safety net — if a future refactor mounts these handlers behind a more
// permissive route, the controller-body role check still catches it.

import { jest } from '@jest/globals';

const mockUserFindByPk = jest.fn();
const mockUpdate = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getPrivacyConsent, setPrivacyConsent } = await import(
  '../../controllers/parent/parentPrivacyConsentController.js'
);

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const parentReq = () => ({ user: { id: 'p1', role: 'parent' } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /parent/privacy-consent — getPrivacyConsent', () => {
  it('200 — required:true when timestamp is null', async () => {
    mockUserFindByPk.mockResolvedValue({ id: 'p1', privacyConsentedAt: null });
    const res = mkRes();
    await getPrivacyConsent(parentReq(), res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { consentedAt: null, required: true },
    });
  });

  it('200 — required:false when timestamp is set', async () => {
    const ts = new Date('2026-05-01T10:00:00Z');
    mockUserFindByPk.mockResolvedValue({ id: 'p1', privacyConsentedAt: ts });
    const res = mkRes();
    await getPrivacyConsent(parentReq(), res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { consentedAt: ts, required: false },
    });
  });

  it('403 PRIVACY_CONSENT_PARENT_ONLY when caller is not parent', async () => {
    const req = { user: { id: 'a1', role: 'admin' } };
    const res = mkRes();
    await getPrivacyConsent(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'PRIVACY_CONSENT_PARENT_ONLY' }),
    }));
    // Critical: model must NEVER be queried for a non-parent caller.
    expect(mockUserFindByPk).not.toHaveBeenCalled();
  });

  it('404 PRIVACY_CONSENT_USER_NOT_FOUND when user record is missing', async () => {
    mockUserFindByPk.mockResolvedValue(null);
    const res = mkRes();
    await getPrivacyConsent(parentReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'PRIVACY_CONSENT_USER_NOT_FOUND' }),
    }));
  });

  it('500 PRIVACY_CONSENT_READ_FAILED on DB error', async () => {
    mockUserFindByPk.mockRejectedValue(new Error('connection lost'));
    const res = mkRes();
    await getPrivacyConsent(parentReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'PRIVACY_CONSENT_READ_FAILED' }),
    }));
  });
});

describe('POST /parent/privacy-consent — setPrivacyConsent', () => {
  it('200 — records timestamp and returns alreadyConsented:false on first call', async () => {
    const fakeUser = { id: 'p1', privacyConsentedAt: null, update: mockUpdate };
    mockUserFindByPk.mockResolvedValue(fakeUser);
    mockUpdate.mockResolvedValue(fakeUser);
    const res = mkRes();
    await setPrivacyConsent(parentReq(), res);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      privacyConsentedAt: expect.any(Date),
    }));
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.success).toBe(true);
    expect(jsonArg.data.alreadyConsented).toBe(false);
    expect(jsonArg.data.consentedAt).toBeInstanceOf(Date);
  });

  it('200 — idempotent: second call returns alreadyConsented:true without writing', async () => {
    const existingTs = new Date('2026-04-01T10:00:00Z');
    const fakeUser = { id: 'p1', privacyConsentedAt: existingTs, update: mockUpdate };
    mockUserFindByPk.mockResolvedValue(fakeUser);
    const res = mkRes();
    await setPrivacyConsent(parentReq(), res);
    // CRITICAL: update must NEVER be called once consent already exists.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { consentedAt: existingTs, alreadyConsented: true },
    });
  });

  it('403 PRIVACY_CONSENT_PARENT_ONLY when caller is not parent', async () => {
    const req = { user: { id: 't1', role: 'teacher' } };
    const res = mkRes();
    await setPrivacyConsent(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'PRIVACY_CONSENT_PARENT_ONLY' }),
    }));
    expect(mockUserFindByPk).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('404 PRIVACY_CONSENT_USER_NOT_FOUND when user record is missing', async () => {
    mockUserFindByPk.mockResolvedValue(null);
    const res = mkRes();
    await setPrivacyConsent(parentReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'PRIVACY_CONSENT_USER_NOT_FOUND' }),
    }));
  });

  it('500 PRIVACY_CONSENT_WRITE_FAILED on DB error during update', async () => {
    const fakeUser = { id: 'p1', privacyConsentedAt: null, update: mockUpdate };
    mockUserFindByPk.mockResolvedValue(fakeUser);
    mockUpdate.mockRejectedValue(new Error('write failed'));
    const res = mkRes();
    await setPrivacyConsent(parentReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'PRIVACY_CONSENT_WRITE_FAILED' }),
    }));
  });
});
