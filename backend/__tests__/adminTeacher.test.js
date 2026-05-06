import { jest } from '@jest/globals';

const mockFindAll = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findAll: mockFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getTeachers } = await import('../controllers/admin/adminTeacherController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminTeacherController.getTeachers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('empty when admin has no receptions', async () => {
    mockFindAll.mockResolvedValueOnce([]);
    const req = { user: { id: 'a1' } };
    const res = mkRes();
    await getTeachers(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
  });

  it('returns teachers created by admin receptions', async () => {
    mockFindAll
      .mockResolvedValueOnce([{ id: 'r1' }, { id: 'r2' }])
      .mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);
    const req = { user: { id: 'a1' } };
    const res = mkRes();
    await getTeachers(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
  });

  it('500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('DB'));
    const req = { user: { id: 'a1' } };
    const res = mkRes();
    await getTeachers(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
