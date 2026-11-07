const multer = require("multer");
const crypto = require("crypto");
const { getMenu, saveMenu, getAvailableWeeks } = require("../services/menu");
const { getDay } = require("../services/utils");
const { parseMenuFromPDF } = require("../services/parser");
const { parseMenuWithGemini } = require("../services/geminiParser");
const { User, Announcement, Menu } = require("../services/models");
const mongoose = require("mongoose");
const path = require("path");
const jwt = require("jsonwebtoken");
const { getBot } = require("../telegram/bot");
const logger = require("../services/logger");

// Cryptographically secure secret fallback if JWT_SECRET is unset in production
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production"
  ? crypto.randomBytes(32).toString("hex")
  : "masterchef-canteen-super-secret");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max file size limit
});

// Middleware to verify JWT
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

function setupApiRoutes(app) {
  app.get("/api/health", (req, res) => res.send("OK"));

  // API: Admin Authentication (Constant-time timingSafeEqual validation)
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!password || typeof password !== "string" || !adminPassword) {
      logger.warn("auth.login_failed", "Invalid admin password attempt", {
        ip: req.ip || req.socket.remoteAddress
      });
      return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }

    // Cryptographically secure password verification using scrypt (CWE-916 compliant) and constant-time equality
    const inputHash = crypto.scryptSync(password, "masterchef-auth-salt", 32);
    const expectedHash = crypto.scryptSync(adminPassword, "masterchef-auth-salt", 32);

    if (!crypto.timingSafeEqual(inputHash, expectedHash)) {
      logger.warn("auth.login_failed", "Invalid admin password attempt", {
        ip: req.ip || req.socket.remoteAddress
      });
      return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }

    // Sign JWT with 2 hour expiration
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
    logger.info("auth.login_success", "Admin authenticated successfully", {
      ip: req.ip || req.socket.remoteAddress
    });
    res.json({ success: true, token });
  });

  // API: Get List of Available Weeks
  app.get("/api/weeks", async (req, res) => {
    try {
      const weeks = await getAvailableWeeks();
      res.json({ success: true, weeks });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch weeks" });
    }
  });

  // API: Get Today's Menu (Always for the current week usually, but can be targeted)
  app.get("/api/today", async (req, res) => {
    try {
      const { getWeekKey } = require("../services/utils");
      const rawWeek = req.query.week;
      const weekKey = typeof rawWeek === "string" && /^\d{4,8}$/.test(rawWeek) ? rawWeek : getWeekKey();
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) return res.status(404).json({ error: "Menu not found for current week" });

      const day = getDay(0);
      const dayData = menuDoc.data[day];

      if (!dayData) return res.status(404).json({ error: `Menu for ${day} not found` });

      res.json({
        success: true,
        weekKey: menuDoc.weekKey,
        day: day,
        date: dayData.date || "",
        breakfast: dayData.breakfast || "—",
        lunch: dayData.lunch || "—",
        dinner: dayData.dinner || "—"
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // API: Get Menu for a specific week
  app.get("/api/menu", async (req, res) => {
    try {
      const rawWeek = req.query.week;
      const weekKey = typeof rawWeek === "string" && /^\d{4,8}$/.test(rawWeek) ? rawWeek : null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) return res.status(404).json({ error: "Menu not found" });
      res.json({
        success: true,
        weekKey: menuDoc.weekKey,
        menu: menuDoc.data
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // API: Get Next Meal based on current time
  app.get("/api/next-meal", async (req, res) => {
    try {
      const { getMenu } = require("../services/menu");
      const { getDay, getWeekKey, getISTDate } = require("../services/utils");
      const { User } = require("../services/models");

      const rawChatId = req.query.chatId;
      const chatId = typeof rawChatId === "string" ? rawChatId : null;

      // Default static cutoffs
      let cutoffBreakfast = 9.5;  // 10:00 AM
      let cutoffLunch = 14;      // 3:00 PM
      let cutoffRollover = 22; // 10:30 PM

      // If a chatId is provided, calculate cutoffs based on their custom notification timings
      if (chatId) {
        const user = await User.findOne({ chatId: String(chatId) });
        if (user && user.timing) {
          const timeToFloat = (str) => {
            if (!str) return 0;
            const [h, m] = str.split(':').map(Number);
            return h + (m || 0) / 60;
          };

          const tLunch = timeToFloat(user.timing.lunch) || 11;
          const tDinner = timeToFloat(user.timing.dinner) || 20;

          cutoffBreakfast = tLunch;
          cutoffLunch = tDinner;
          cutoffRollover = tDinner + 2.5;
        }
      }

      const istDate = getISTDate();
      const hour = istDate.getHours();
      const min = istDate.getMinutes();
      const timeFloat = hour + min / 60;

      const targetOffset = timeFloat >= cutoffRollover ? 1 : 0;
      const targetDate = getISTDate(targetOffset);
      const targetWeekKey = getWeekKey(targetDate);

      const menuDoc = await getMenu(targetWeekKey);
      if (!menuDoc || !menuDoc.data) return res.status(404).json({ error: "Menu not found for current week" });

      const day = getDay(targetOffset);
      const dayData = menuDoc.data[day];
      if (!dayData) return res.status(404).json({ error: `Menu for ${day} not found` });

      let nextMeal = "";
      let menu = "";

      if (targetOffset === 1 || timeFloat < cutoffBreakfast) {
        nextMeal = "breakfast";
        menu = dayData.breakfast;
      } else if (timeFloat < cutoffLunch) {
        nextMeal = "lunch";
        menu = dayData.lunch;
      } else {
        nextMeal = "dinner";
        menu = dayData.dinner;
      }

      res.json({
        success: true,
        day: day,
        meal: nextMeal,
        menu: menu || "—"
      });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // API: Get all weeks data as JSON
  app.get("/api/all-weeks-data", async (req, res) => {
    try {
      const { Menu } = require("../services/models");
      const menus = await Menu.find({}, { pdfBuffer: 0 }).sort({ weekKey: -1 });
      res.json({ success: true, data: menus });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // API: Download PDF (with Path & Header Injection protection)
  app.get("/api/download/pdf", async (req, res) => {
    try {
      const rawWeek = req.query.week;
      const weekKey = typeof rawWeek === "string" && /^\d{4,8}$/.test(rawWeek) ? rawWeek : null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.pdfBuffer) {
        return res.status(404).send("PDF not found.");
      }

      const safeFileName = path.basename(menuDoc.fileName || 'menu.pdf').replace(/["\r\n\\]/g, '');
      res.setHeader("Content-Type", menuDoc.contentType || "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
      res.send(menuDoc.pdfBuffer);
    } catch (err) {
      res.status(500).send("Error downloading PDF");
    }
  });

  // API: Download JSON (with Path & Header Injection protection)
  app.get("/api/download/json", async (req, res) => {
    try {
      const rawWeek = req.query.week;
      const weekKey = typeof rawWeek === "string" && /^\d{4,8}$/.test(rawWeek) ? rawWeek : null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) {
        return res.status(404).send("Menu data not found.");
      }

      const safeWeek = String(menuDoc.weekKey || 'latest').replace(/[^a-zA-Z0-9_-]/g, '');
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="menu_${safeWeek}.json"`);
      res.send(JSON.stringify(menuDoc.data, null, 2));
    } catch (err) {
      res.status(500).send("Error downloading JSON");
    }
  });

  // API: Upload Menu PDF or Image (Path Traversal protected)
  app.post("/api/upload", verifyJWT, (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) return res.status(400).json({ error: "File upload error: " + err.message });
      next();
    });
  }, async (req, res) => {
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : req.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: "No file uploaded. Please select a PDF or image." });
    }

    const safeBaseName = path.basename(uploadedFile.originalname || 'menu.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    try {
      const mimeType = uploadedFile.mimetype || (safeBaseName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const { menu, weekKey } = await parseMenuWithGemini(uploadedFile.buffer, mimeType);

      if (!menu || Object.keys(menu).length === 0) {
        throw new Error("Could not parse menu structure from the provided file.");
      }

      await saveMenu(menu, {
        buffer: uploadedFile.buffer,
        fileName: safeBaseName,
        contentType: uploadedFile.mimetype
      }, weekKey);

      logger.info("menu.uploaded", `Menu uploaded for Week ${weekKey}`, { weekKey, fileName: safeBaseName });
      res.json({
        success: true,
        message: `Menu for Week ${weekKey} uploaded and parsed successfully!`,
        weekKey,
        menu
      });
    } catch (err) {
      logger.error("menu.upload_error", `Menu upload failed: ${err.message}`, { error: err });
      res.status(500).json({ error: "Failed to process menu file. Please ensure the file is a valid canteen menu." });
    }
  });

  // API: Create Menu Data (JSON)
  app.post("/api/menu", verifyJWT, async (req, res) => {
    try {
      const { weekKey, menuData } = req.body;
      if (!weekKey || !menuData || typeof weekKey !== "string") {
        return res.status(400).json({ error: "Missing or invalid weekKey or menuData." });
      }

      const safeWeekKey = weekKey.replace(/[^a-zA-Z0-9_-]/g, '');
      const { generateMenuPDF } = require("../services/pdfGenerator");
      const pdfBuffer = await generateMenuPDF(menuData, safeWeekKey);

      await saveMenu(menuData, {
        buffer: pdfBuffer,
        fileName: `MasterChef_Menu_W${safeWeekKey}.pdf`,
        contentType: 'application/pdf'
      }, safeWeekKey);

      res.json({ success: true, message: `Menu for Week ${safeWeekKey} created and PDF synthesized successfully.` });
    } catch (err) {
      logger.error("menu.create_error", `Failed to create menu: ${err.message}`, { error: err });
      res.status(500).json({ error: "Failed to create menu." });
    }
  });

  // API: Update Menu Data (JSON)
  app.put("/api/menu/:weekKey", verifyJWT, async (req, res) => {
    try {
      const rawWeek = req.params.weekKey;
      const weekKey = typeof rawWeek === "string" ? rawWeek.replace(/[^a-zA-Z0-9_-]/g, '') : null;
      const { menuData } = req.body;

      if (!weekKey || !menuData) {
        return res.status(400).json({ error: "Missing or invalid weekKey or menuData." });
      }

      const { generateMenuPDF } = require("../services/pdfGenerator");
      const pdfBuffer = await generateMenuPDF(menuData, weekKey);

      await saveMenu(menuData, {
        buffer: pdfBuffer,
        fileName: `MasterChef_Menu_W${weekKey}_Edited.pdf`,
        contentType: 'application/pdf'
      }, weekKey);

      res.json({ success: true, message: `Menu for Week ${weekKey} updated and PDF regenerated successfully.` });
    } catch (err) {
      logger.error("menu.update_error", `Failed to update menu: ${err.message}`, { error: err });
      res.status(500).json({ error: "Failed to update menu." });
    }
  });

  // API: Delete Menu
  app.delete("/api/menu/:weekKey", verifyJWT, async (req, res) => {
    try {
      const rawWeek = req.params.weekKey;
      const weekKey = typeof rawWeek === "string" ? rawWeek.replace(/[^a-zA-Z0-9_-]/g, '') : null;
      if (!weekKey) {
        return res.status(400).json({ error: "Missing or invalid weekKey." });
      }
      const { deleteMenu } = require("../services/menu");
      await deleteMenu(weekKey);
      res.json({ success: true, message: `Week ${weekKey} deleted successfully.` });
    } catch (err) {
      logger.error("menu.delete_error", `Failed to delete menu: ${err.message}`, { error: err });
      res.status(500).json({ error: "Failed to delete menu." });
    }
  });

  // API: Get Announcements
  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, announcements });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch announcements." });
    }
  });

  // API: Create Announcement & Broadcast (Admin)
  app.post("/api/announcements", verifyJWT, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string" || message.trim() === "") {
        return res.status(400).json({ error: "Announcement message cannot be empty." });
      }

      const announcement = await Announcement.create({ message: message.trim() });
      const users = await User.find({ reminders: true });
      const bot = getBot();
      let broadcastCount = 0;

      const broadcastMsg = `📢 *Announcement:*\n\n${announcement.message}`;

      for (const user of users) {
        try {
          await bot.sendMessage(user.chatId, broadcastMsg, { parse_mode: "Markdown" });
          broadcastCount++;
        } catch (err) {
          logger.warn("telegram.broadcast_failed", `Failed to broadcast to user ${user.chatId}`, { error: err });
        }
      }

      res.json({
        success: true,
        message: `Announcement created and mapped to ${broadcastCount} users successfully!`,
        announcement
      });
    } catch (err) {
      logger.error("announcement.create_error", `Failed to create announcement: ${err.message}`, { error: err });
      res.status(500).json({ error: "Failed to create announcement." });
    }
  });

  // API: System & Resource Insights
  app.get("/api/system/stats", async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const uptimeSec = Math.floor(process.uptime());
      const hours = Math.floor(uptimeSec / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      const seconds = uptimeSec % 60;

      const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
      const userCount = isDbConnected ? await User.countDocuments().catch(() => 0) : 0;
      const reminderCount = isDbConnected ? await User.countDocuments({ reminders: true }).catch(() => 0) : 0;
      const menuCount = isDbConnected ? await Menu.countDocuments().catch(() => 0) : 0;

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        uptimeSeconds: uptimeSec,
        memory: {
          rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
          heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
          externalMb: (memoryUsage.external / 1024 / 1024).toFixed(2)
        },
        cpu: process.cpuUsage(),
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        platform: process.platform,
        stats: {
          totalUsers: userCount,
          activeReminders: reminderCount,
          totalMenus: menuCount
        }
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch system stats" });
    }
  });

  // API: Query Recent Telemetry & Action Logs
  app.get("/api/system/logs", (req, res) => {
    try {
      const { getRecentLogs } = require("../services/telemetry");
      const safeSeverity = typeof req.query.severity === "string" ? req.query.severity : undefined;
      const safeAction = typeof req.query.action === "string" ? req.query.action : undefined;
      const safeChatId = typeof req.query.chatId === "string" ? req.query.chatId : undefined;
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

      const logs = getRecentLogs({
        severity: safeSeverity,
        action: safeAction,
        chatId: safeChatId,
        limit
      });
      res.json({
        success: true,
        count: logs.length,
        logs
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to retrieve telemetry logs" });
    }
  });

  console.log("🌐 API Routes initialized with History support & System Insights");
}

module.exports = { setupApiRoutes };
