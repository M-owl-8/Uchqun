import supertest from 'supertest';
import { sequelize, User, createTestApp } from '../helpers/testApp.js';

let app;
let request;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createTestApp();
  request = supertest(app);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await sequelize.sync({ force: true });
  await User.create({
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  });
});

function extractCookies(res) {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  return (Array.isArray(raw) ? raw : [raw]).map(c => c.split(';')[0]).join('; ');
}

describe('Auth Integration', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject invalid password', async () => {
      const res = await request
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('should reject missing credentials', async () => {
      const res = await request.post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token using body', async () => {
      const loginRes = await request
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const res = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });

    it('should refresh token using cookie', async () => {
      const loginRes = await request
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const cookies = extractCookies(loginRes);

      const res = await request
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject revoked refresh token', async () => {
      const loginRes = await request
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      // First refresh (revokes old token)
      await request
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      // Second refresh with same token should fail
      const res = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const loginRes = await request
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const res = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
    });

    it('should reject without token', async () => {
      const res = await request.get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke refresh tokens and clear cookies', async () => {
      const loginRes = await request
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const res = await request
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Refresh should fail after logout
      const refreshRes = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });
});
