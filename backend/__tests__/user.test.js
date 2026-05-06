import { jest } from '@jest/globals';

const mockUserFindByPk = jest.fn();
const mockEmitToUser = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk },
}));
jest.unstable_mockModule('../config/storage.js', () => ({ uploadFile: jest.fn() }));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: mockEmitToUser }));

const { updateProfile, updateAvatar, changePassword } = await import('../controllers/userController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mkUser = (overrides = {}) => ({
  id: 'u1',
  update: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  toJSON: () => ({ id: 'u1' }),
  comparePassword: jest.fn(),
  ...overrides,
});

describe('userController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('updateProfile', () => {
    it('400 when firstName is blank', async () => {
      const user = mkUser();
      const req = { user, body: { firstName: '', lastName: 'X' } };
      const res = mkRes();
      await updateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('updates profile and emits socket event', async () => {
      const user = mkUser();
      const req = { user, body: { firstName: 'A', lastName: 'B', phone: '+998901111111' } };
      const res = mkRes();
      await updateProfile(req, res);
      expect(user.update).toHaveBeenCalledWith({
        firstName: 'A', lastName: 'B', phone: '+998901111111',
      });
      expect(mockEmitToUser).toHaveBeenCalledWith('u1', 'user:updated', expect.any(Object));
    });

    it('skips undefined fields (partial update)', async () => {
      const user = mkUser();
      const req = { user, body: { phone: '+998901111111' } };
      const res = mkRes();
      await updateProfile(req, res);
      const passed = user.update.mock.calls[0][0];
      expect(passed).toEqual({ phone: '+998901111111' });
      expect(passed).not.toHaveProperty('firstName');
    });

    it('500 on update failure', async () => {
      const user = mkUser({ update: jest.fn().mockRejectedValue(new Error('DB')) });
      const req = { user, body: { firstName: 'A' } };
      const res = mkRes();
      await updateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateAvatar', () => {
    it('400 when no file uploaded', async () => {
      const req = { user: mkUser() };
      const res = mkRes();
      await updateAvatar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('413 when file too large', async () => {
      const user = mkUser();
      const big = Buffer.alloc(2 * 1024 * 1024); // 2MB > 1.5MB
      const req = { user, file: { buffer: big, mimetype: 'image/png' } };
      const res = mkRes();
      await updateAvatar(req, res);
      expect(res.status).toHaveBeenCalledWith(413);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('persists base64 data URI on success', async () => {
      const user = mkUser();
      const req = { user, file: { buffer: Buffer.from('hello'), mimetype: 'image/png' } };
      const res = mkRes();
      await updateAvatar(req, res);
      const [args] = user.update.mock.calls[0];
      expect(args.avatar).toMatch(/^data:image\/png;base64,/);
      expect(mockEmitToUser).toHaveBeenCalledWith('u1', 'user:updated', expect.any(Object));
    });
  });

  describe('changePassword', () => {
    it('400 when fields missing', async () => {
      const req = { user: { id: 'u1' }, body: {} };
      const res = mkRes();
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when new password too short', async () => {
      const req = { user: { id: 'u1' }, body: { currentPassword: 'a', newPassword: 'ab' } };
      const res = mkRes();
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 when user not found', async () => {
      mockUserFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'u1' }, body: { currentPassword: 'a', newPassword: 'newPass1' } };
      const res = mkRes();
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('401 when current password wrong', async () => {
      const user = mkUser({ comparePassword: jest.fn().mockResolvedValue(false) });
      mockUserFindByPk.mockResolvedValue(user);
      const req = { user: { id: 'u1' }, body: { currentPassword: 'wrong', newPassword: 'newPass1' } };
      const res = mkRes();
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('persists new password and saves', async () => {
      const user = mkUser({ comparePassword: jest.fn().mockResolvedValue(true) });
      mockUserFindByPk.mockResolvedValue(user);
      const req = { user: { id: 'u1' }, body: { currentPassword: 'old', newPassword: 'newPass1' } };
      const res = mkRes();
      await changePassword(req, res);
      expect(user.password).toBe('newPass1');
      expect(user.save).toHaveBeenCalled();
    });
  });
});
