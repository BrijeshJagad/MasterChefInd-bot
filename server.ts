import dotenv from 'dotenv';
dotenv.config();

// Initialize OpenTelemetry tracing & logs exporter first
import './src/services/telemetry';
import logger from './src/services/logger';

import express, { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const next = require('next');
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './src/services/db';
import { startBotPolling, getBot } from './src/telegram/bot';
import { initHandlers } from './src/telegram/handlers';
import { initCron } from './src/services/cron';
import { setupApiRoutes } from './src/api/routes';
import { register, updateAppMetrics, setBotStatus, metricsMiddleware } from './src/services/metrics';

const dev = process.env['NODE_ENV'] !== 'production';
const nextApp = next({ dev, dir: './frontend' });
const handle = nextApp.getRequestHandler();

const PORT = process.env['PORT'] || 3000;

// Production Grade Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('system.unhandled_rejection', 'Unhandled Promise Rejection', { error: reason as Error });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('system.uncaught_exception', 'Fatal uncaught exception encountered', { error: err });
  process.exit(1);
});

nextApp.prepare().then(async () => {
  logger.info('system.startup', 'Preparing full-stack MasterChef server...');

  // Connect to MongoDB
  await connectDB();

  // Initialize Express server
  const server = express();
  
  // Security headers with comprehensive Content Security Policy (CSP)
  server.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          fontSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // CORS Middleware for Mobile (Capacitor/Cordova) & Cross-Origin Desktop Apps
  server.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Prometheus Metrics Collection Middleware
  server.use(metricsMiddleware);

  // Structured OpenTelemetry HTTP Request Logging Middleware
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/_next') ||
      req.path.startsWith('/static') ||
      req.path.endsWith('.ico') ||
      req.path.endsWith('.png') ||
      req.path.endsWith('.jpg')
    ) {
      return next();
    }

    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const isError = res.statusCode >= 400;
      const action = isError ? 'http.request_error' : 'http.request';
      const logFn = res.statusCode >= 500 ? logger.error : (res.statusCode >= 400 ? logger.warn : logger.info);

      logFn(action, `${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`, {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('user-agent') || '',
      });
    });

    next();
  });

  // Prometheus /metrics endpoint (exempt from rate limiter for scraping)
  server.get('/metrics', async (req: Request, res: Response) => {
    if (process.env['METRICS_AUTH_TOKEN']) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${process.env['METRICS_AUTH_TOKEN']}`) {
        res.status(401).send('Unauthorized');
        return;
      }
    }
    try {
      await updateAppMetrics();
      res.setHeader('Content-Type', register.contentType);
      res.send(await register.metrics());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).send(msg);
    }
  });

  // Apply Rate Limiter to API routes
  server.use('/api/', limiter);

  // Mount API routes
  setupApiRoutes(server);

  // Fallback to Next.js handler (RSCs, Frontend, Static assets)
  server.all(/.*/, (req: Request, res: Response) => {
    return handle(req, res);
  });

  // Global Error Handler
  server.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('http.error', `Express error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
      error: err,
      path: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({ error: 'Internal Server Error', message: dev ? err.message : undefined });
  });

  server.listen(PORT, () => {
    logger.info('system.ready', `Server running successfully on http://localhost:${PORT}`, { port: PORT });
    
    // Start Telegram Bot
    initHandlers();
    startBotPolling().then(() => {
      setBotStatus(true);
      logger.info('telegram.bot_ready', 'Telegram bot polling active and handlers initialized');
      
      // Start Cron Jobs once Bot is successfully loaded
      initCron(getBot());
    }).catch((err: Error) => {
      logger.warn('telegram.bot_failed', `Telegram bot failed to start: ${err.message}`, { error: err });
      setBotStatus(false);
    });
  });
}).catch((err: Error) => {
  logger.error('system.fatal', `Fatal startup error: ${err.message}`, { error: err });
  process.exit(1);
});
