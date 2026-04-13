require("dotenv").config();
const express = require("express");
const next = require("next");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./src/services/db");
const { startBotPolling, getBot } = require("./src/telegram/bot");
const { initHandlers } = require("./src/telegram/handlers");
const { initCron } = require("./src/services/cron");
const { setupApiRoutes } = require("./src/api/routes");

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

nextApp.prepare().then(async () => {
  console.log("🚀 Production-ready server preparing...");

  // Connect to MongoDB
  await connectDB();

  // Initialize Express server
  const server = express();
  
  // Security & Logging
  server.use(helmet({
    contentSecurityPolicy: false, // Next.js needs inline scripts often
  }));
  server.use(morgan(dev ? "dev" : "combined"));
  server.use(express.json());

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
    console.error("🔥 Global Error:", err.stack);
    res.status(500).json({ error: "Internal Server Error", message: dev ? err.message : undefined });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`✅ Server running on http://localhost:${PORT}`);
    
    // Start Telegram Bot
    startBotPolling().then(() => {
      initHandlers();
      
      // Start Cron Jobs once Bot is successfully loaded
      initCron(getBot());
    });
  });
}).catch(err => {
  console.error("❌ Fatal Startup Error:", err);
  process.exit(1);
});
