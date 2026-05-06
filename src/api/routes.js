const multer = require("multer");
const { getMenu, saveMenu, getAvailableWeeks } = require("../services/menu");
const { getDay } = require("../services/utils");
const { parseMenuFromPDF } = require("../services/parser");
const { User, Announcement } = require("../services/models");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { getBot } = require("../telegram/bot");

const JWT_SECRET = process.env.JWT_SECRET || 'masterchef-canteen-super-secret';
const upload = multer({ storage: multer.memoryStorage() });

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

  // API: Admin Authentication
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }

    // Sign JWT with 2 hour expiration
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
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
      const weekKey = req.query.week || getWeekKey();
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
      const weekKey = req.query.week || null;
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
      
      const istDate = getISTDate();
      const hour = istDate.getHours();
      const min = istDate.getMinutes();
      const timeFloat = hour + min / 60;

      const targetOffset = timeFloat >= 22.5 ? 1 : 0;
      const targetDate = getISTDate(targetOffset);
      const targetWeekKey = getWeekKey(targetDate);

      const menuDoc = await getMenu(targetWeekKey);
      if (!menuDoc || !menuDoc.data) return res.status(404).json({ error: "Menu not found for current week" });

      const day = getDay(targetOffset);
      const dayData = menuDoc.data[day];
      if (!dayData) return res.status(404).json({ error: `Menu for ${day} not found` });

      let nextMeal = "";
      let menu = "";

      if (targetOffset === 1 || timeFloat < 10) {
        nextMeal = "breakfast";
        menu = dayData.breakfast;
      } else if (timeFloat < 15) {
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

  // API: Download PDF
  app.get("/api/download/pdf", async (req, res) => {
    try {
      const weekKey = req.query.week || null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.pdfBuffer) {
        return res.status(404).send("PDF not found.");
      }
      
      res.setHeader("Content-Type", menuDoc.contentType || "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${menuDoc.fileName || 'menu.pdf'}"`);
      res.send(menuDoc.pdfBuffer);
    } catch (err) {
      res.status(500).send("Error downloading PDF");
    }
  });

  // API: Download JSON
  app.get("/api/download/json", async (req, res) => {
    try {
      const weekKey = req.query.week || null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) {
        return res.status(404).send("Menu data not found.");
      }
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="menu_${menuDoc.weekKey}.json"`);
      res.send(JSON.stringify(menuDoc.data, null, 2));
    } catch (err) {
      res.status(500).send("Error downloading JSON");
    }
  });

  // API: Upload Menu PDF
  app.post("/api/upload", verifyJWT, upload.single("pdf"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const tempPath = path.join(__dirname, `../../temp_${Date.now()}.pdf`);
    try {
      fs.writeFileSync(tempPath, req.file.buffer);

      const { menu, weekKey } = await parseMenuFromPDF(tempPath);
      await saveMenu(menu, {
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        contentType: req.file.mimetype
      }, weekKey);

      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.json({ 
        success: true, 
        message: `Menu for Week ${weekKey} uploaded and parsed successfully!`,
        weekKey 
      });
    } catch (err) {
      console.error("Upload error:", err);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.status(500).json({ error: "Failed to process PDF: " + err.message });
    }
  });

  // API: Create Menu Data (JSON)
  app.post("/api/menu", verifyJWT, async (req, res) => {
    try {
      const { weekKey, menuData } = req.body;
      if (!weekKey || !menuData) {
        return res.status(400).json({ error: "Missing weekKey or menuData." });
      }

      const { generateMenuPDF } = require("../services/pdfGenerator");
      const pdfBuffer = await generateMenuPDF(menuData, weekKey);

      await saveMenu(menuData, {
        buffer: pdfBuffer,
        fileName: `MasterChef_Menu_W${weekKey}.pdf`,
        contentType: 'application/pdf'
      }, weekKey);
      
      res.json({ success: true, message: `Menu for Week ${weekKey} created and PDF synthesized successfully.` });
    } catch (err) {
      console.error("Create error:", err);
      res.status(500).json({ error: "Failed to create menu." });
    }
  });

  // API: Update Menu Data (JSON)
  app.put("/api/menu/:weekKey", verifyJWT, async (req, res) => {
    try {
      const { weekKey } = req.params;
      const { menuData } = req.body;
      
      if (!menuData) {
        return res.status(400).json({ error: "Missing menuData in request body." });
      }

      // Generate a fresh PDF reflecting these edits
      const { generateMenuPDF } = require("../services/pdfGenerator");
      const pdfBuffer = await generateMenuPDF(menuData, weekKey);

      await saveMenu(menuData, {
        buffer: pdfBuffer,
        fileName: `MasterChef_Menu_W${weekKey}_Edited.pdf`,
        contentType: 'application/pdf'
      }, weekKey);
      
      res.json({ success: true, message: `Menu for Week ${weekKey} updated and PDF regenerated successfully.` });
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ error: "Failed to update menu." });
    }
  });

  // API: Delete Menu
  app.delete("/api/menu/:weekKey", verifyJWT, async (req, res) => {
    try {
      const { weekKey } = req.params;
      const { deleteMenu } = require("../services/menu");
      console.log(`Deleting week: ${weekKey}`);
      await deleteMenu(weekKey);
      res.json({ success: true, message: `Week ${weekKey} deleted successfully.` });
    } catch (err) {
      console.error("Delete error:", err);
      res.status(500).json({ error: "Failed to delete menu." });
    }
  });

  // API: Get Announcements
  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, announcements });
    } catch (err) {
      console.error("Get announcements error:", err);
      res.status(500).json({ error: "Failed to fetch announcements." });
    }
  });

  // API: Create Announcement & Broadcast (Admin)
  app.post("/api/announcements", verifyJWT, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || message.trim() === "") {
        return res.status(400).json({ error: "Announcement message cannot be empty." });
      }

      // 1. Save to DB
      const announcement = await Announcement.create({ message: message.trim() });

      // 2. Broadcast to Telegram Users
      const users = await User.find({ reminders: true }); // Broadcasting to those with reminders on.
      const bot = getBot();
      let broadcastCount = 0;
      
      const broadcastMsg = `📢 *Announcement:*\n\n${announcement.message}`;
      
      for (const user of users) {
        try {
          await bot.sendMessage(user.chatId, broadcastMsg, { parse_mode: "Markdown" });
          broadcastCount++;
        } catch (err) {
          console.error(`Failed to broadcast to user ${user.chatId}:`, err.message);
        }
      }

      res.json({ 
        success: true, 
        message: `Announcement created and mapped to ${broadcastCount} users successfully!`,
        announcement 
      });
    } catch (err) {
      console.error("Create announcement error:", err);
      res.status(500).json({ error: "Failed to create announcement." });
    }
  });

  console.log("🌐 API Routes initialized with History support");
}

module.exports = { setupApiRoutes };
