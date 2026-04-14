const multer = require("multer");
const { getMenu, saveMenu, getAvailableWeeks } = require("../services/menu");
const { getDay } = require("../services/utils");
const { parseMenuFromPDF } = require("../services/parser");
const fs = require("fs");
const path = require("path");

const upload = multer({ storage: multer.memoryStorage() });

function setupApiRoutes(app) {
  app.get("/api/health", (req, res) => res.send("OK"));

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
      const weekKey = req.query.week || null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) return res.status(404).json({ error: "Menu not found" });
      
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
  app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    const password = req.body.password;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }

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
  app.post("/api/menu", async (req, res) => {
    const password = req.headers["x-admin-password"];
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }

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
  app.put("/api/menu/:weekKey", async (req, res) => {
    const password = req.headers["x-admin-password"];
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }

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
  app.delete("/api/menu/:weekKey", async (req, res) => {
    const password = req.headers["x-admin-password"];
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
    }

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

  console.log("🌐 API Routes initialized with History support");
}

module.exports = { setupApiRoutes };
