const client = require("prom-client");
const { getISTDate } = require("./utils");

// Create a dedicated Prometheus Registry
const register = new client.Registry();

// Add default system/process metrics (CPU, Memory, Event Loop Lag, GC, File Descriptors, etc.)
client.collectDefaultMetrics({
  register,
  prefix: "nodejs_",
  labels: { app: "masterchef-bot" }
});

// ===== HTTP Metrics =====
const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

// ===== Application / Business Metrics =====
const masterchefUsersTotal = new client.Gauge({
  name: "masterchef_registered_users_total",
  help: "Total registered Telegram users in database",
  registers: [register]
});

const masterchefRemindersActiveTotal = new client.Gauge({
  name: "masterchef_reminders_active_total",
  help: "Total users who have reminders enabled",
  registers: [register]
});

const masterchefMenusStoredTotal = new client.Gauge({
  name: "masterchef_menus_stored_total",
  help: "Total weekly menus recorded in database",
  registers: [register]
});

const masterchefDinnerPollVotesTotal = new client.Gauge({
  name: "masterchef_dinner_poll_votes_today_total",
  help: "Total dinner poll votes recorded today",
  registers: [register]
});

const masterchefBotStatus = new client.Gauge({
  name: "masterchef_bot_online",
  help: "Telegram bot polling status (1 = running, 0 = stopped)",
  registers: [register]
});

// Update dynamic database metrics on scrape
async function updateAppMetrics() {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return;
    }
    const { User, Menu, DinnerPoll } = require("./models");

    const [userCount, reminderCount, menuCount] = await Promise.all([
      User.countDocuments().catch(() => 0),
      User.countDocuments({ reminders: true }).catch(() => 0),
      Menu.countDocuments().catch(() => 0)
    ]);

    masterchefUsersTotal.set(userCount);
    masterchefRemindersActiveTotal.set(reminderCount);
    masterchefMenusStoredTotal.set(menuCount);

    const istNow = getISTDate(0);
    const dateStr = istNow.toISOString().split("T")[0];
    const poll = await DinnerPoll.findOne({ date: dateStr }).catch(() => null);

    if (poll && poll.votes) {
      const votesCount = poll.votes instanceof Map ? poll.votes.size : Object.keys(poll.votes).length;
      masterchefDinnerPollVotesTotal.set(votesCount);
    } else {
      masterchefDinnerPollVotesTotal.set(0);
    }
  } catch (err) {
    console.error("Error updating Prometheus app metrics:", err.message);
  }
}

function setBotStatus(online) {
  masterchefBotStatus.set(online ? 1 : 0);
}

// Middleware to track request counts and durations
function metricsMiddleware(req, res, next) {
  // Ignore static Next.js assets to prevent metric bloat
  if (
    req.path.startsWith("/_next") ||
    req.path.startsWith("/static") ||
    req.path.endsWith(".ico") ||
    req.path.endsWith(".png") ||
    req.path.endsWith(".jpg")
  ) {
    return next();
  }

  const start = process.hrtime();

  res.on("finish", () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;

    // Normalize routes to avoid high cardinality (e.g., /api/menu/202619 -> /api/menu/:weekKey)
    let route = req.baseUrl + (req.route ? req.route.path : req.path);
    route = route.replace(/\/\d{6}/g, "/:weekKey");

    const labels = {
      method: req.method,
      route: route || req.path,
      status_code: res.statusCode
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationMicroseconds.observe(labels, durationInSeconds);
  });

  next();
}

module.exports = {
  register,
  updateAppMetrics,
  setBotStatus,
  metricsMiddleware
};
