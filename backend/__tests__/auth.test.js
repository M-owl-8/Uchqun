import { jest } from '@jest/globals';

// Mock dependencies before imports
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@test.com',
  password: '$2a$10$validhashhere',
  role: 'admin',
  isActive: true,
  documentsApproved: true,
  toJSON: function () {
    return { id: this.id, email: this.email, role: this.role };
  },
};

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/RefreshToken.js', () => ({
  default: {
    create: jest.fn().mockResolvedValue({}),
    findOne: jest.fn(),
    update: jest.fn(),
    hashToken: jest.fn().mockReturnValue('hashedtoken'),
  },
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Env vars are already set via __tests__/helpers/setup.js, but ensure JWT_SECRET is long enough
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough';

const { login, refresh, logout, getMe } = await import(
  '../controllers/authController.js'
);
const User = (await import('../models/User.js')).default;
const RefreshToken = (await import('../models/RefreshToken.js')).default;

// Helper to create mock req/res
function mockReqRes(body = {}, headers = {}, cookies = {}) {
  const req = {
    body,
    headers,
    cookies,
    user: null,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /login', () => {
    test('returns 400 if email or password missing', async () => {
      const { req, res } = mockReqRes({});
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 if only email provided', async () => {
      const { req, res } = mockReqRes({ email: 'test@test.com' });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 if only password provided', async () => {
      const { req, res } = mockReqRes({ password: 'pass123' });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 401 if user not found', async () => {
      User.findOne.mockResolvedValue(null);
      const { req, res } = mockReqRes({
        email: 'no@exist.com',
        password: 'pass123',
      });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 401 if password is wrong', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('correctpass', 10);
      const user = {
        ...mockUser,
        password: hashedPassword,
        toJSON: function () {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      User.findOne.mockResolvedValue(user);
      const { req, res } = mockReqRes({
        email: 'test@test.com',
        password: 'wrongpass',
      });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns tokens on successful login', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('correctpass', 10);
      const user = {
        ...mockUser,
        password: hashedPassword,
        toJSON: function () {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      User.findOne.mockResolvedValue(user);

      const { req, res } = mockReqRes({
        email: 'test@test.com',
        password: 'correctpass',
      });
      await login(req, res);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.accessToken).toBeUndefined();
      expect(response.refreshToken).toBeUndefined();
      expect(response.user).toBeDefined();
      expect(response.user.password).toBeUndefined();
    });

    test('sets httpOnly cookies on successful login', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('correctpass', 10);
      const user = {
        ...mockUser,
        password: hashedPassword,
        toJSON: function () {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      User.findOne.mockResolvedValue(user);

      const { req, res } = mockReqRes({
        email: 'test@test.com',
        password: 'correctpass',
      });
      await login(req, res);
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
    });

    test('returns 403 for inactive reception', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('pass', 10);
      const user = {
        ...mockUser,
        password: hashedPassword,
        role: 'reception',
        documentsApproved: false,
        isActive: false,
        toJSON: function () {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      User.findOne.mockResolvedValue(user);

      const { req, res } = mockReqRes({
        email: 'test@test.com',
        password: 'pass',
      });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      const response = res.json.mock.calls[0][0];
      expect(response.requiresApproval).toBe(true);
    });

    test('returns 403 for reception with documents approved but not active', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('pass', 10);
      const user = {
        ...mockUser,
        password: hashedPassword,
        role: 'reception',
        documentsApproved: true,
        isActive: false,
        toJSON: function () {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      User.findOne.mockResolvedValue(user);

      const { req, res } = mockReqRes({
        email: 'test@test.com',
        password: 'pass',
      });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 403 for inactive admin', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('pass', 10);
      const user = {
        ...mockUser,
        password: hashedPassword,
        role: 'admin',
        isActive: false,
        email: 'admin@school.com',
        toJSON: function () {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      User.findOne.mockResolvedValue(user);

      const { req, res } = mockReqRes({
        email: 'admin@school.com',
        password: 'pass',
      });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('role in body does NOT bypass auth', async () => {
      User.findOne.mockResolvedValue(null);
      const { req, res } = mockReqRes({
        email: 'no@exist.com',
        password: 'pass',
        role: 'government',
      });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('normalizes email to lowercase', async () => {
      User.findOne.mockResolvedValue(null);
      const { req, res } = mockReqRes({
        email: 'TEST@TEST.COM',
        password: 'pass',
      });
      await login(req, res);
      // Should have called findOne with lowercased email
      expect(User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@test.com' },
        })
      );
    });
  });

  describe('POST /refresh', () => {
    test('returns 401 if no refresh token provided', async () => {
      const { req, res } = mockReqRes({}, {}, {});
      await refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 401 if refresh token not found in DB', async () => {
      RefreshToken.findOne.mockResolvedValue(null);
      const { req, res } = mockReqRes({ refreshToken: 'invalid-token' });
      await refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 401 if refresh token is expired', async () => {
      const storedToken = {
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 86400000), // expired yesterday
        revoked: false,
        update: jest.fn().mockResolvedValue(true),
      };
      RefreshToken.findOne.mockResolvedValue(storedToken);

      const { req, res } = mockReqRes({ refreshToken: 'expired-token' });
      await refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(storedToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true })
      );
    });

    test('rotates tokens on valid refresh', async () => {
      const storedToken = {
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revoked: false,
        update: jest.fn().mockResolvedValue(true),
      };
      RefreshToken.findOne.mockResolvedValue(storedToken);

      const { req, res } = mockReqRes({ refreshToken: 'valid-token' });
      await refresh(req, res);

      // Old token should be revoked
      expect(storedToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true })
      );
      // New tokens should be issued
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.accessToken).toBeUndefined();
      expect(response.refreshToken).toBeUndefined();
    });

    test('sets cookies on successful refresh', async () => {
      const storedToken = {
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revoked: false,
        update: jest.fn().mockResolvedValue(true),
      };
      RefreshToken.findOne.mockResolvedValue(storedToken);

      const { req, res } = mockReqRes({ refreshToken: 'valid-token' });
      await refresh(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
    });
  });

  describe('POST /logout', () => {
    test('revokes refresh tokens and clears cookies', async () => {
      RefreshToken.update.mockResolvedValue([1]);
      const { req, res } = mockReqRes();
      req.user = { id: mockUser.id };
      await logout(req, res);
      expect(RefreshToken.update).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.any(Object)
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('succeeds even if user is not set', async () => {
      const { req, res } = mockReqRes();
      req.user = null;
      await logout(req, res);
      expect(RefreshToken.update).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('GET /me', () => {
    test('returns user data without password', async () => {
      const user = {
        ...mockUser,
        toJSON: function () {
          return { id: this.id, email: this.email, role: this.role };
        },
      };
      User.findByPk.mockResolvedValue(user);

      const { req, res } = mockReqRes();
      req.user = { id: mockUser.id };
      await getMe(req, res);

      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id, {
        attributes: { exclude: ['password'] },
      });
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.password).toBeUndefined();
    });

    test('returns 404 if user not found', async () => {
      User.findByPk.mockResolvedValue(null);

      const { req, res } = mockReqRes();
      req.user = { id: 'nonexistent-id' };
      await getMe(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
