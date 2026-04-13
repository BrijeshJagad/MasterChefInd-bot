const request = require('supertest');
const express = require('express');
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
});
