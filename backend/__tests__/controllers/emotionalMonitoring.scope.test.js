// G2/IDOR-11-003 + BACKEND-040 regression tests for emotional monitoring scope checks.
//
// Two distinct scope bypasses to lock down:
//   1. POST createOrUpdateMonitoring — government role skipped the teacher
//      access check entirely (L95). With no per-region scope check, a republic
//      OR regional government account could write safeguarding records for
//      any child anywhere.
//   2. PUT createOrUpdateMonitoring (with :id) — admin role skipped the
//      school-scope check (L36). An admin from school A could update an
//      emotional monitoring record belonging to school B by passing its UUID.
//
// Pattern: revert-test — verify the bypass IS blocked. If a future refactor
// removes the scope check, these tests fail loud.

import { jest } from '@jest/globals';

const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockChildFindByPk = jest.fn();
const mockGroupFindOne = jest.fn();
const mockUserFindOne = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockSave = jest.fn();

jest.unstable_mockModule('../../models/EmotionalMonitoring.js', () => ({
  default: { findByPk: mockFindByPk, findOne: mockFindOne },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findByPk: mockChildFindByPk },
}));
jest.unstable_mockModule('../../models/Group.js', () => ({
  default: { findOne: mockGroupFindOne },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: jest.fn(),
}));

const { createOrUpdateMonitoring } = await import('../../controllers/emotionalMonitoringController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(true);
});

describe('IDOR-11-003 — POST createOrUpdateMonitoring scope (government role)', () => {
  // Republic government accounts intentionally have platform-wide access.
  // Region government accounts MUST be scoped to schools in their region.
  it('REGION government denied write access to child outside their region', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'school-other', parentId: 'p1', groupId: 'g1' });
    mockSchoolFindOne.mockResolvedValue(null); // child's school NOT in this region
    const req = {
      method: 'POST',
      params: {},
      body: { childId: 'c1', date: '2026-06-06', emotionalState: { happy: true } },
      user: { id: 'gov-region', role: 'government', govLevel: 'region', govRegionId: 'region-A' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    // The record itself must NEVER be written for an out-of-scope request.
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('REPUBLIC government (govRegionId=null) is allowed — intentional platform-wide access', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'school-x', parentId: 'p1', groupId: 'g1' });
    mockFindOne.mockResolvedValue(null);
    const fakeRecord = { id: 'r1', save: mockSave };
    mockFindByPk.mockResolvedValueOnce(fakeRecord); // for the include-relations refetch
    // EmotionalMonitoring.create is missing from mocks but we don't need to fully
    // exercise the happy path — only assert that the request was NOT rejected.
    const req = {
      method: 'POST',
      params: {},
      body: { childId: 'c1', date: '2026-06-06', emotionalState: { happy: true } },
      user: { id: 'gov-republic', role: 'government', govLevel: 'republic', govRegionId: null },
    };
    const res = mkRes();
    // The handler will likely throw later because we didn't mock create(), but
    // critically it should NOT have rejected with 403 before that point.
    try { await createOrUpdateMonitoring(req, res); } catch { /* downstream errors OK */ }
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});

describe('BACKEND-040 — PUT createOrUpdateMonitoring admin school-scope', () => {
  // An admin can only update emotional monitoring records belonging to
  // children in THEIR school. Cross-school admin writes are a leak.
  it('admin denied update of a record whose child is in another school', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'rec-1',
      teacherId: 'teacher-elsewhere',
      childId: 'c1',
      save: mockSave,
    });
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'school-OTHER', parentId: 'p1' });
    const req = {
      method: 'PUT',
      params: { id: 'rec-1' },
      body: { emotionalState: { happy: false } },
      user: { id: 'admin-A', role: 'admin', schoolId: 'school-A' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('admin allowed update of a record whose child is in THEIR school', async () => {
    mockFindByPk
      .mockResolvedValueOnce({ id: 'rec-1', teacherId: 'teacher-x', childId: 'c1', save: mockSave })
      .mockResolvedValueOnce({ id: 'rec-1' }); // refetch with relations
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'school-A', parentId: 'p1' });
    const req = {
      method: 'PUT',
      params: { id: 'rec-1' },
      body: { emotionalState: { happy: true } },
      user: { id: 'admin-A', role: 'admin', schoolId: 'school-A' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockSave).toHaveBeenCalled();
  });
});
