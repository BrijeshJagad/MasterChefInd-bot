import request from 'supertest';
import express, { Application } from 'express';
import logger from '../src/services/logger';
import { getRecentLogs } from '../src/services/telemetry';
import { setupApiRoutes } from '../src/api/routes';

jest.mock('../src/services/menu', () => ({
  getMenu: jest.fn(),
  saveMenu: jest.fn(),
  getAvailableWeeks: jest.fn(),
}));

describe('OpenTelemetry & Structured Logger', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    setupApiRoutes(app);
  });

  test('logger should record structured events into recent logs ring-buffer', () => {
    logger.info('test.action_a', 'Testing info action', { customId: 101 });
    logger.error('test.action_error', 'Testing error action', { error: new Error('Boom') });

    const logs = getRecentLogs({ action: 'test.action_a' });
    expect(logs.length).toBeGreaterThan(0);
    const firstLog = logs[0];
    expect(firstLog).toBeDefined();
    expect(firstLog?.action).toBe('test.action_a');
    expect(firstLog?.severity).toBe('INFO');
    expect(firstLog?.['customId']).toBe(101);

    const errorLogs = getRecentLogs({ severity: 'ERROR' });
    expect(errorLogs.length).toBeGreaterThan(0);
    const firstError = errorLogs[0];
    expect(firstError?.error).toBeDefined();
    expect(firstError?.error?.message).toBe('Boom');
  });

  test('GET /api/system/stats should return system metrics and resource stats', async () => {
    const res = await request(app).get('/api/system/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.memory).toBeDefined();
    expect(res.body.memory.heapUsedMb).toBeDefined();
    expect(res.body.stats).toBeDefined();
  });

  test('GET /api/system/logs should allow querying recent telemetry logs', async () => {
    logger.info('telegram.poll_vote', 'User 999 voted 19:30', { chatId: '999', votedTime: '19:30' });

    const res = await request(app).get('/api/system/logs?action=telegram.poll_vote');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.logs[0].chatId).toBe('999');
    expect(res.body.logs[0].votedTime).toBe('19:30');
  });
});
