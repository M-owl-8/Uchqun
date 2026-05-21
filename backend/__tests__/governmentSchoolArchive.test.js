import { jest } from '@jest/globals';

const mockSchoolFindOne = jest.fn();
const mockSchoolUpdate = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne },
}));
jest.unstable_mockModule('../models/GovernmentStats.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/AIWarning.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));
jest.unstable_mockModule('../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn(),
  sortSchoolsByRating: jest.fn(),
  computeRatingScore: jest.fn(),
  computeAverageRating: jest.fn(),
}));
jest.unstable_mockModule('../utils/pagination.js', () => ({
  parsePagination: jest.fn(),
}));

const { archiveSchool, reactivateSchool } = await import('../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const govReq = (id) => ({
  user: { id: 'g1', role: 'government' },
  params: { id },
  body: {},
  isGlobalAccess: true,
  govType: 'main',
});

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

describe('archiveSchool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('archives an active school and returns 200', async () => {
    const school = { id: SCHOOL_ID, name: 'Test School', isActive: true, update: mockSchoolUpdate };
    mockSchoolFindOne.mockResolvedValue(school);
    mockSchoolUpdate.mockResolvedValue({ ...school, isActive: false });

    const res = mkRes();
    await archiveSchool(govReq(SCHOOL_ID), res);

    expect(mockSchoolUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'archive', entity: 'schools', entityId: SCHOOL_ID,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('404 when school not found', async () => {
    mockSchoolFindOne.mockResolvedValue(null);
    const res = mkRes();
    await archiveSchool(govReq(SCHOOL_ID), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SCHOOL_NOT_FOUND' }),
    }));
  });

  it('409 when school is already archived', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_ID, isActive: false, update: mockSchoolUpdate });
    const res = mkRes();
    await archiveSchool(govReq(SCHOOL_ID), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SCHOOL_ALREADY_ARCHIVED' }),
    }));
  });

  it('writes audit log before update so archive is always traceable', async () => {
    const school = { id: SCHOOL_ID, name: 'Test', isActive: true, update: mockSchoolUpdate };
    mockSchoolFindOne.mockResolvedValue(school);
    mockSchoolUpdate.mockRejectedValue(new Error('db down'));

    const res = mkRes();
    await archiveSchool(govReq(SCHOOL_ID), res);

    expect(mockLogAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('500 on unexpected DB error', async () => {
    mockSchoolFindOne.mockRejectedValue(new Error('db down'));
    const res = mkRes();
    await archiveSchool(govReq(SCHOOL_ID), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SCHOOL_ARCHIVE_FAILED' }),
    }));
  });
});

describe('reactivateSchool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reactivates an archived school and returns 200', async () => {
    const school = { id: SCHOOL_ID, name: 'Test School', isActive: false, update: mockSchoolUpdate };
    mockSchoolFindOne.mockResolvedValue(school);
    mockSchoolUpdate.mockResolvedValue({ ...school, isActive: true });

    const res = mkRes();
    await reactivateSchool(govReq(SCHOOL_ID), res);

    expect(mockSchoolUpdate).toHaveBeenCalledWith({ isActive: true });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'reactivate', entity: 'schools', entityId: SCHOOL_ID,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('404 when school not found', async () => {
    mockSchoolFindOne.mockResolvedValue(null);
    const res = mkRes();
    await reactivateSchool(govReq(SCHOOL_ID), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SCHOOL_NOT_FOUND' }),
    }));
  });

  it('409 when school is already active', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_ID, isActive: true, update: mockSchoolUpdate });
    const res = mkRes();
    await reactivateSchool(govReq(SCHOOL_ID), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SCHOOL_ALREADY_ACTIVE' }),
    }));
  });

  it('writes audit log before update so reactivation is always traceable', async () => {
    const school = { id: SCHOOL_ID, name: 'Test', isActive: false, update: mockSchoolUpdate };
    mockSchoolFindOne.mockResolvedValue(school);
    mockSchoolUpdate.mockRejectedValue(new Error('db down'));

    const res = mkRes();
    await reactivateSchool(govReq(SCHOOL_ID), res);

    expect(mockLogAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('500 on unexpected DB error', async () => {
    mockSchoolFindOne.mockRejectedValue(new Error('db down'));
    const res = mkRes();
    await reactivateSchool(govReq(SCHOOL_ID), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SCHOOL_REACTIVATE_FAILED' }),
    }));
  });
});
