// G2 / BACKEND-044 + IDOR-11-001 regression lock for aiWarningController.
//
// Verified safe at sweep time (controllers/aiWarningController.js — resolveWarning
// at L257 + notifyUsers at L300 — both have admin school-scope + government
// region-scope checks). This test exists to LOCK those checks so a future
// refactor that removes either branch fails loud.
//
// Scenarios locked:
//   - admin from school A → cannot resolve/notify a warning belonging to school B
//   - region government → cannot resolve/notify a warning in another region
//   - republic government → CAN resolve/notify cross-region (intentional)

import { jest } from '@jest/globals';

const mockFindByPk = jest.fn();
const mockUpdate = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockNotificationCreate = jest.fn().mockResolvedValue(true);
const mockSchoolRatingFindAll = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule('../../models/AIWarning.js', () => ({
  default: { findByPk: mockFindByPk, findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: mockSchoolRatingFindAll },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/User.js', () => ({ default: { findAll: jest.fn().mockResolvedValue([]) } }));
jest.unstable_mockModule('../../models/Notification.js', () => ({
  default: { create: mockNotificationCreate },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: jest.fn(() => ({ limit: 20, offset: 0 })),
}));

const { resolveWarning, notifyUsers } = await import('../../controllers/aiWarningController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mkWarning = (overrides = {}) => ({
  id: 'w1',
  schoolId: 'school-OTHER',
  notifiedUsers: [],
  update: mockUpdate,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue(true);
});

describe('resolveWarning — scope checks (lock-in)', () => {
  it('admin from school A → 404 on warning belonging to school B (no update)', async () => {
    mockFindByPk.mockResolvedValue(mkWarning({ schoolId: 'school-B' }));
    const req = {
      params: { id: 'w1' },
      body: { resolutionNotes: '' },
      user: { id: 'a1', role: 'admin', schoolId: 'school-A' },
    };
    const res = mkRes();
    await resolveWarning(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('REGION government → 404 on warning in another region', async () => {
    mockFindByPk.mockResolvedValue(mkWarning({ schoolId: 'school-X' }));
    mockSchoolFindOne.mockResolvedValue(null);
    const req = {
      params: { id: 'w1' },
      body: { resolutionNotes: '' },
      user: { id: 'g1', role: 'government', govRegionId: 'region-A' },
    };
    const res = mkRes();
    await resolveWarning(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('REPUBLIC government (govRegionId=null) → can resolve cross-region (intentional)', async () => {
    mockFindByPk.mockResolvedValue(mkWarning({ schoolId: 'school-X' }));
    const req = {
      params: { id: 'w1' },
      body: { resolutionNotes: 'ok' },
      user: { id: 'g0', role: 'government', govRegionId: null },
    };
    const res = mkRes();
    await resolveWarning(req, res);
    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('notifyUsers — scope checks (lock-in)', () => {
  it('admin from school A → 404 on warning belonging to school B (no notify)', async () => {
    mockFindByPk.mockResolvedValue(mkWarning({ schoolId: 'school-B' }));
    const req = {
      params: { id: 'w1' },
      body: { userIds: ['u1'] },
      user: { id: 'a1', role: 'admin', schoolId: 'school-A' },
    };
    const res = mkRes();
    await notifyUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('REGION government → 404 on out-of-region warning (no notify)', async () => {
    mockFindByPk.mockResolvedValue(mkWarning({ schoolId: 'school-X' }));
    mockSchoolFindOne.mockResolvedValue(null);
    const req = {
      params: { id: 'w1' },
      body: { userIds: ['u1'] },
      user: { id: 'g1', role: 'government', govRegionId: 'region-A' },
    };
    const res = mkRes();
    await notifyUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });
});
