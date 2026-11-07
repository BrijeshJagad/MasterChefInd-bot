require("dotenv").config();
// Initialize OpenTelemetry tracing & logs exporter first
require("./src/services/telemetry");
const logger = require("./src/services/logger");

const express = require("express");
const next = require("next");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./src/services/db");
const { startBotPolling, getBot } = require("./src/telegram/bot");
const { initHandlers } = require("./src/telegram/handlers");
const { initCron } = require("./src/services/cron");
const { setupApiRoutes } = require("./src/api/routes");
const { register, updateAppMetrics, setBotStatus, metricsMiddleware } = require("./src/services/metrics");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: "./frontend" });
const handle = nextApp.getRequestHandler();

const PORT = process.env.PORT || 3000;

// Production Grade Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." }
});

process.on("unhandledRejection", (reason) => {
  logger.error("system.unhandled_rejection", "Unhandled Promise Rejection", { error: reason });
});

process.on("uncaughtException", (err) => {
  logger.error("system.uncaught_exception", "Fatal uncaught exception encountered", { error: err });
  process.exit(1);
});

nextApp.prepare().then(async () => {
  logger.info("system.startup", "Preparing full-stack MasterChef server...");

  // Connect to MongoDB
  await connectDB();

  // Initialize Express server
  const server = express();
  
  // Security headers
  server.use(helmet({
    contentSecurityPolicy: false,
  }));

  // CORS Middleware for Mobile (Capacitor/Cordova) & Cross-Origin Desktop Apps
  server.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Prometheus Metrics Collection Middleware
  server.use(metricsMiddleware);

  // Structured OpenTelemetry HTTP Request Logging Middleware
  server.use((req, res, next) => {
    if (
      req.path.startsWith("/_next") ||
      req.path.startsWith("/static") ||
      req.path.endsWith(".ico") ||
      req.path.endsWith(".png") ||
      req.path.endsWith(".jpg")
    ) {
      return next();
    }

    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const isError = res.statusCode >= 400;
      const action = isError ? "http.request_error" : "http.request";
      const logFn = res.statusCode >= 500 ? logger.error : (res.statusCode >= 400 ? logger.warn : logger.info);

      logFn(action, `${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`, {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        userAgent: req.get("user-agent") || ""
      });
    });

    next();
  });

  // Prometheus /metrics endpoint (exempt from rate limiter for scraping)
  server.get("/metrics", async (req, res) => {
    if (process.env.METRICS_AUTH_TOKEN) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${process.env.METRICS_AUTH_TOKEN}`) {
        return res.status(401).send("Unauthorized");
      }
    }
    try {
      await updateAppMetrics();
      res.setHeader("Content-Type", register.contentType);
      res.send(await register.metrics());
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  // Apply Rate Limiter to API routes
  server.use("/api/", limiter);

  // Mount API routes
  setupApiRoutes(server);

  // Fallback to Next.js handler (RSCs, Frontend, Static assets)
  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  // Global Error Handler
  server.use((err, req, res, next) => {
    logger.error("http.error", `Express error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
      error: err,
      path: req.originalUrl,
      method: req.method
    });
    res.status(500).json({ error: "Internal Server Error", message: dev ? err.message : undefined });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    logger.info("system.ready", `Server running successfully on http://localhost:${PORT}`, { port: PORT });
    
    // Start Telegram Bot
    startBotPolling().then(() => {
      initHandlers();
      setBotStatus(true);
      logger.info("telegram.bot_ready", "Telegram bot polling active and handlers initialized");
      
      // Start Cron Jobs once Bot is successfully loaded
      initCron(getBot());
    }).catch(err => {
      logger.warn("telegram.bot_failed", `Telegram bot failed to start: ${err.message}`, { error: err });
      setBotStatus(false);
    });
  });
}).catch(err => {
  logger.error("system.fatal", `Fatal startup error: ${err.message}`, { error: err });
  process.exit(1);
});
