import { jest } from '@jest/globals';

const mockChildFindAll = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockChildFindAll },
}));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
// Stub unused imports so teacherController loads cleanly
jest.unstable_mockModule('../models/User.js', () => ({ default: { findByPk: jest.fn(), findAll: jest.fn(), findAndCountAll: jest.fn() } }));
jest.unstable_mockModule('../models/Group.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/School.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/Activity.js', () => ({ default: { count: jest.fn() } }));
jest.unstable_mockModule('../models/Meal.js', () => ({ default: { count: jest.fn() } }));
jest.unstable_mockModule('../models/Media.js', () => ({ default: { count: jest.fn() } }));
jest.unstable_mockModule('../models/EmotionalMonitoring.js', () => ({ default: { count: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherResponsibility.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherTask.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherWorkHistory.js', () => ({ default: { findAll: jest.fn(), count: jest.fn() } }));
jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { getChildren, getChildById } = await import('../controllers/teacherController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('teacherController — getChildren', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns school-scoped children list', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1', firstName: 'Aisha' }]);
    const req = { user: { id: 't1', schoolId: 'school-1' } };
    const res = mkRes();
    await getChildren(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'c1', firstName: 'Aisha' }] });
    // Confirm schoolId scope is applied
    const where = mockChildFindAll.mock.calls[0][0].where;
    expect(where.schoolId).toBe('school-1');
  });

  it('500 when DB throws', async () => {
    mockChildFindAll.mockRejectedValue(new Error('DB down'));
    const req = { user: { id: 't1', schoolId: 'school-1' } };
    const res = mkRes();
    await getChildren(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teacherController — getChildById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns child at teacher school', async () => {
    const child = { id: 'c1', firstName: 'Aisha', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { id: 'c1' } };
    const res = mkRes();
    await getChildById(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: child });
  });

  it('404 when child belongs to different school (IDOR guard)', async () => {
    // Revert-test baseline: without validateChildAccess, findByPk would return any child.
    // With it: returns null for cross-school → 404.
    // Pre-fix (validateChildAccess absent): findByPk('other-school-child') → 200
    // Post-fix (validateChildAccess present): returns null → 404
    mockValidateChildAccess.mockResolvedValue(null);
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { id: 'other-school-child' } };
    const res = mkRes();
    await getChildById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('404 when child does not exist', async () => {
    mockValidateChildAccess.mockResolvedValue(null);
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { id: 'nonexistent' } };
    const res = mkRes();
    await getChildById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('500 when DB throws', async () => {
    mockValidateChildAccess.mockRejectedValue(new Error('DB down'));
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { id: 'c1' } };
    const res = mkRes();
    await getChildById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
