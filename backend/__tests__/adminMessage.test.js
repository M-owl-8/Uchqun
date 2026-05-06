import { jest } from '@jest/globals';

const mockFindAll = jest.fn();

jest.unstable_mockModule('../models/SuperAdminMessage.js', () => ({
  default: { findAll: mockFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMyMessages } = await import('../controllers/admin/adminMessageController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminMessageController.getMyMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes to senderId from req.user.id', async () => {
    mockFindAll.mockResolvedValue([{ toJSON: () => ({ id: 'm1' }) }]);
    const req = { user: { id: 'a1' } };
    const res = mkRes();
    await getMyMessages(req, res);
    expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { senderId: 'a1' },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: [{ id: 'm1' }],
    }));
  });

  it('500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('boom'));
    const req = { user: { id: 'a1' } };
    const res = mkRes();
    await getMyMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
