const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_secret';

const { setupApiRoutes } = require('../src/api/routes');

// Mock services
jest.mock('../src/services/menu', () => ({
  getMenu: jest.fn(),
  saveMenu: jest.fn(),
  getAvailableWeeks: jest.fn()
}));

const { getMenu, getAvailableWeeks } = require('../src/services/menu');

describe('API Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    setupApiRoutes(app);
  });

  test('GET /api/health should return OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('OK');
  });

  test('GET /api/weeks should return list of weeks', async () => {
    getAvailableWeeks.mockResolvedValue(['202615', '202616']);
    const res = await request(app).get('/api/weeks');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.weeks).toEqual(['202615', '202616']);
  });

  test('GET /api/menu should return 404 if no menu found', async () => {
    getMenu.mockResolvedValue(null);
    const res = await request(app).get('/api/menu');
    expect(res.statusCode).toBe(404);
  });

  describe('JWT Authentication', () => {
    beforeAll(() => {
      // Must set before requiring routes if we didn't already, but since module is loaded,
      // we must rely on what it parsed. We will spy on it or just set test_secret during setup if needed.
      // Wait, let's just make sure both match.
      process.env.ADMIN_PASSWORD = 'test_password';
      process.env.JWT_SECRET = 'test_secret'; 
    });

    test('POST /api/auth/login should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'wrong_password' });
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/Invalid Admin Password/);
    });

    test('POST /api/auth/login should issue JWT with correct password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test_password' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();

      const decoded = jwt.verify(res.body.token, 'test_secret');
      expect(decoded.role).toBe('admin');
    });

    test('Protected routes should reject requests without token', async () => {
      const res1 = await request(app).post('/api/menu').send({ weekKey: '123', menuData: {} });
      expect(res1.statusCode).toBe(401);

      const res2 = await request(app).put('/api/menu/202616').send({ menuData: {} });
      expect(res2.statusCode).toBe(401);

      const res3 = await request(app).delete('/api/menu/202616');
      expect(res3.statusCode).toBe(401);
    });
  });
});
