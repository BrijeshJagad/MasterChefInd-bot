const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getBot } = require("./bot");
const { User, Menu, Announcement } = require("../services/models");
const { getMenu, saveMenu, getAvailableWeeks } = require("../services/menu");
const { getDay, formatMenu, formatFullMenu, getWeekKey, getISTDate } = require("../services/utils");
const { parseMenuFromPDF } = require("../services/parser");

// Simple in-memory state for password challenge and time settings
const pendingUploads = new Map();
const pendingTimeUpdates = new Map();

function initHandlers() {
  const bot = getBot();

  // Set Bot Commands for the blue 'Menu' button
  bot.setMyCommands([
    { command: 'today', description: "Today's delicious menu" },
    { command: 'tomorrow', description: "Check what's cooking tomorrow" },
    { command: 'all', description: 'View full weekly plan' },
    { command: 'announcements', description: 'Latest platform updates' },
    { command: 'settings', description: 'Configure notification times' },
    { command: 'on', description: 'Enable daily reminders' },
    { command: 'off', description: 'Privacy mode: Disable reminders' },
    { command: 'widget', description: 'Get your personalized API link' }
  ]).catch(err => console.error("Could not set bot commands:", err.message));

  async function ensureUser(chatId) {
    let user = await User.findOne({ chatId });
    if (!user) user = await User.create({ chatId, reminders: true });
    return user;
  }

  async function sendMainMenu(chatId, returnKeyboard = false) {
    const user = await User.findOne({ chatId }) || { reminders: true };
    const toggleLabel = user.reminders ? "🔕 Turn OFF Notifications" : "🔔 Turn ON Notifications";
    const toggleAction = user.reminders ? "off" : "on";

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🍽️ Today", callback_data: "today" },
          { text: "📅 Tomorrow", callback_data: "tomorrow" }
        ],
        [
          { text: "📋 Full Weekly Plan", callback_data: "all" },
          { text: "📊 History & Stats", callback_data: "history" }
        ],
        [
          { text: "📑 Download PDF", callback_data: "download_pdf" },
          { text: "⚡ Web Dashboard", url: "https://masterchefind-bot.onrender.com" }
        ],
        [
          { text: toggleLabel, callback_data: toggleAction },
          { text: "📢 Announcements", callback_data: "announcements" }
        ],
        [
          { text: "📱 Get Widget URL", callback_data: "widget_url" },
          { text: "⚙️ Notification Settings", callback_data: "settings" }
        ]
      ]
    };

    if (returnKeyboard) return keyboard;

    bot.sendMessage(chatId, `🍽️ *Main Menu*\n\nChoose an option 👇\n_Or upload a new PDF menu to update it!_`, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  }

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.document) return; // handled by document event

    // Check if user is in "Waiting for Password" state
    if (pendingUploads.has(chatId)) {
      const pending = pendingUploads.get(chatId);
      if (msg.text === process.env.ADMIN_PASSWORD) {
        bot.sendMessage(chatId, "🔐 *Password Correct!* Processing menu... ⏳", { parse_mode: "Markdown" });

        try {
          const tempPath = path.join(__dirname, `../../temp_${chatId}.pdf`);
          fs.writeFileSync(tempPath, pending.buffer);

          const { menu, weekKey } = await parseMenuFromPDF(tempPath);
          await saveMenu(menu, {
            buffer: pending.buffer,
            fileName: pending.fileName,
            contentType: pending.contentType
          }, weekKey);

          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          pendingUploads.delete(chatId);

          bot.sendMessage(chatId, `✅ *Menu Updated for Week ${weekKey}!*\n\n${formatFullMenu(menu)}`, { parse_mode: "Markdown", reply_markup: await sendMainMenu(chatId, true) });
        } catch (err) {
          console.error(err);
          bot.sendMessage(chatId, `❌ Failed to parse PDF: ${err.message}`);
          pendingUploads.delete(chatId);
        }
      } else {
        bot.sendMessage(chatId, "❌ *Invalid Admin Password.* Upload cancelled.", { parse_mode: "Markdown" });
        pendingUploads.delete(chatId);
      }
      return;
    }

    // Check if user is in "Waiting for Time Update" state
    if (pendingTimeUpdates.has(chatId)) {
      const pending = pendingTimeUpdates.get(chatId);
      const input = (msg.text || "").trim();

      // Validate HH:MM
      if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(input)) {
        await User.updateOne({ chatId }, { [`timing.${pending.mealType}`]: input }, { upsert: true });
        bot.sendMessage(chatId, `✅ *${pending.mealType.charAt(0).toUpperCase() + pending.mealType.slice(1)}* notification time set to *${input}*!`, { parse_mode: "Markdown", reply_markup: await sendMainMenu(chatId, true) });
      } else {
        bot.sendMessage(chatId, `❌ *Invalid format.* Please use HH:MM (e.g. 07:30, 20:00). Cancelling update.`, { parse_mode: "Markdown", reply_markup: await sendMainMenu(chatId, true) });
      }
      pendingTimeUpdates.delete(chatId);
      return;
    }

    await ensureUser(chatId);
    if (msg.text && msg.text.startsWith("/")) return;
    sendMainMenu(chatId);
  });

  bot.onText(/\/start/, async (msg) => {
    const name = msg.from.first_name || "there";
    const welcomeText = `🚀 *Welcome to MasterChef Canteen, ${name}!* 👨‍🍳\n\nI'm your intelligent personal assistant for meal planning and canteen updates. My goal is to make sure you never miss a great meal!\n\n✨ *Key Features:*\n🔹 Interactive Menus\n🔹 Personalized Reminders\n🔹 Broadcast Updates\n\nReady to see what's cooking?`;
    const keyboard = await sendMainMenu(msg.chat.id, true);
    bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: "Markdown", reply_markup: keyboard });
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;

    // IMPORTANT: Always answer immediately to stop and loading spinners
    bot.answerCallbackQuery(query.id);

    if (action === "history") {
      const weeks = await getAvailableWeeks();
      if (weeks.length === 0) return bot.sendMessage(chatId, "⚠️ No historical records found.");

      const buttons = [];
      // Build one row per week
      weeks.forEach(w => {
        buttons.push([{ text: `📅 Week ${w}`, callback_data: `view_week_${w}` }]);
      });
      // Add home button at the end
      buttons.push([{ text: "🏠 Home", callback_data: "home" }]);

      return bot.sendMessage(chatId, "📑 *Available Weekly Menus*\n\nSelect a week to view:", {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      });
    }

    if (action === "home") {
      return sendMainMenu(chatId);
    }

    if (action.startsWith("view_week_")) {
      const weekKey = action.replace("view_week_", "");
      const menuDoc = await getMenu(weekKey).catch(() => null);

      if (!menuDoc) return bot.sendMessage(chatId, "⚠️ Menu data not found.");

      const keyboard = {
        inline_keyboard: [
          [{ text: "📥 Download PDF", callback_data: `download_pdf_${weekKey}` }],
          [
            { text: "🔙 Back to History", callback_data: "history" },
            { text: "🏠 Home", callback_data: "home" }
          ]
        ]
      };

      return bot.sendMessage(chatId, `📅 *Week ${weekKey}*\n\n${formatFullMenu(menuDoc.data)}`, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
    }

    if (action === "today") {
      const day = getDay(0);
      const weekKey = getWeekKey(getISTDate(0));
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc) return bot.sendMessage(chatId, "⚠️ Menu not uploaded for this week yet.", { reply_markup: await sendMainMenu(chatId, true) });
      return bot.sendMessage(chatId, formatMenu(day, menuDoc.data), { parse_mode: "Markdown", reply_markup: await sendMainMenu(chatId, true) });
    }
    if (action === "tomorrow") {
      const day = getDay(1);
      const weekKey = getWeekKey(getISTDate(1));
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc) return bot.sendMessage(chatId, "⚠️ Menu not uploaded for tomorrow yet.", { reply_markup: await sendMainMenu(chatId, true) });
      return bot.sendMessage(chatId, `📅 *Tomorrow*\n\n${formatMenu(day, menuDoc.data)}`, { parse_mode: "Markdown", reply_markup: await sendMainMenu(chatId, true) });
    }
    if (action === "all") {
      const menuDoc = await getMenu();
      const currentWeekKey = getWeekKey(getISTDate(0));
      const isLatestArchive = menuDoc && menuDoc.weekKey !== currentWeekKey;
      const statusPrefix = isLatestArchive ? `⚠️ _Showing Latest Available Menu (Week ${menuDoc?.weekKey})_\n\n` : "";
      return bot.sendMessage(chatId, statusPrefix + formatFullMenu(menuDoc?.data), { parse_mode: "Markdown", reply_markup: await sendMainMenu(chatId, true) });
    }
    if (action.startsWith("download_pdf")) {
      const parts = action.split("_");
      const targetWeek = parts.length > 2 ? parts.pop() : null;
      const doc = targetWeek ? await getMenu(targetWeek) : await getMenu();

      if (doc && doc.pdfBuffer) {
        let baseName = doc.weekKey ? `MasterChef_Menu_W${doc.weekKey}` : "MasterChef_Menu";
        const safeName = `${baseName}`;
        return bot.sendDocument(chatId, doc.pdfBuffer, { caption: `📄 Weekly Menu (Week ${doc.weekKey || 'Latest'})` }, { filename: safeName });
      } else {
        return bot.sendMessage(chatId, "⚠️ No PDF menu available to download for this week.");
      }
    }
    if (action === "on") {
      await User.updateOne({ chatId }, { reminders: true }, { upsert: true });
      return bot.sendMessage(chatId, "🔔 Notifications turned ON!", { reply_markup: await sendMainMenu(chatId, true) });
    }
    if (action === "off") {
      await User.updateOne({ chatId }, { reminders: false }, { upsert: true });
      return bot.sendMessage(chatId, "🔕 Notifications turned OFF", { reply_markup: await sendMainMenu(chatId, true) });
    }

    if (action === "settings") {
      const user = await User.findOne({ chatId }) || {};
      const timing = user.timing || {};
      const breakfastTime = timing.breakfast || "07:30";
      const lunchTime = timing.lunch || "11:00";
      const dinnerTime = timing.dinner || "20:00";

      const keyboard = {
        inline_keyboard: [
          [{ text: `🌅 Breakfast (${breakfastTime})`, callback_data: `set_breakfast` }],
          [{ text: `🍛 Lunch (${lunchTime})`, callback_data: `set_lunch` }],
          [{ text: `🍽️ Dinner (${dinnerTime})`, callback_data: `set_dinner` }],
          [{ text: "🏠 Home", callback_data: "home" }]
        ]
      };
      return bot.sendMessage(chatId, `⚙️ *Notification Settings*\n\nYour current notification timings are:\n- Breakfast: ${breakfastTime}\n- Lunch: ${lunchTime}\n- Dinner: ${dinnerTime}\n\nClick a button below to change the time.`, { parse_mode: "Markdown", reply_markup: keyboard });
    }

    if (action.startsWith("set_")) {
      const mealType = action.replace("set_", "");
      pendingTimeUpdates.set(chatId, { mealType, timestamp: Date.now() });
      return bot.sendMessage(chatId, `⏳ Please send the new time for *${mealType.charAt(0).toUpperCase() + mealType.slice(1)}* in \`HH:MM\` format (24-hour clock, e.g., \`07:30\` or \`19:00\`).`, { parse_mode: "Markdown" });
    }

    if (action === "announcements") {
      const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(10);
      if (announcements.length === 0) {
        return bot.sendMessage(chatId, "📭 *No announcements yet.* Check back later!", { parse_mode: "Markdown" });
      }

      let text = "📢 *Recent Announcements*\n\n";
      announcements.forEach((ann, idx) => {
        const date = new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        text += `${idx + 1}. *[${date}]* ${ann.message}\n\n`;
      });

      return bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]] } });
    }

    if (action === "widget_url") {
      const url = `https://masterchefind-bot.onrender.com/api/next-meal?chatId=${chatId}`;
      const text = `📱 *Personalized Widget URL*\n\nHere is your unique API endpoint for iOS Shortcuts or Android widgets. It is securely linked to your account and uses your custom meal notification timings!\n\n\`${url}\`\n\n_Tap the link above to copy it._`;
      return bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: await sendMainMenu(chatId, true) });
    }
  });

  bot.on("document", async (msg) => {
    const chatId = msg.chat.id;

    if (!msg.document.file_name.endsWith(".pdf")) {
      return bot.sendMessage(chatId, "⚠️ Please upload a PDF file.");
    }

    bot.sendMessage(chatId, "🛡️ *Security Check*: Please send the **Admin Password** to authorize this menu update.", { parse_mode: "Markdown" });

    try {
      const fileUrl = await bot.getFileLink(msg.document.file_id);
      const res = await axios.get(fileUrl, { responseType: "arraybuffer" });

      pendingUploads.set(chatId, {
        buffer: Buffer.from(res.data),
        fileName: msg.document.file_name,
        contentType: msg.document.mime_type,
        timestamp: Date.now()
      });

      // Cleanup pending after 2 minutes
      setTimeout(() => {
        if (pendingUploads.has(chatId) && pendingUploads.get(chatId).timestamp === pendingUploads.get(chatId).timestamp) {
          pendingUploads.delete(chatId);
        }
      }, 120000);

    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ Internal error during security setup.");
    }
  });

  bot.onText(/\/today/, async msg => {
    const weekKey = getWeekKey(getISTDate(0));
    const menuDoc = await getMenu(weekKey);
    if (!menuDoc) return bot.sendMessage(msg.chat.id, "⚠️ Menu not uploaded for this week yet.", { reply_markup: await sendMainMenu(msg.chat.id, true) });
    bot.sendMessage(msg.chat.id, formatMenu(getDay(0), menuDoc.data), { parse_mode: "Markdown", reply_markup: await sendMainMenu(msg.chat.id, true) });
  });

  bot.onText(/\/tomorrow/, async msg => {
    const weekKey = getWeekKey(getISTDate(1));
    const menuDoc = await getMenu(weekKey);
    if (!menuDoc) return bot.sendMessage(msg.chat.id, "⚠️ Menu not uploaded for tomorrow yet.", { reply_markup: await sendMainMenu(msg.chat.id, true) });
    const day = getDay(1);
    bot.sendMessage(msg.chat.id, `📅 Tomorrow\n\n${formatMenu(day, menuDoc.data)}`, { parse_mode: "Markdown", reply_markup: await sendMainMenu(msg.chat.id, true) });
  });

  bot.onText(/\/all/, async msg => {
    const menuDoc = await getMenu();
    const currentWeekKey = getWeekKey(getISTDate(0));
    const isLatestArchive = menuDoc && menuDoc.weekKey !== currentWeekKey;
    const statusPrefix = isLatestArchive ? `⚠️ _Showing Latest Available Menu (Week ${menuDoc?.weekKey})_\n\n` : "";
    bot.sendMessage(msg.chat.id, statusPrefix + formatFullMenu(menuDoc?.data), { parse_mode: "Markdown", reply_markup: await sendMainMenu(msg.chat.id, true) });
  });

  bot.onText(/\/on/, async msg => {
    await User.updateOne({ chatId: msg.chat.id }, { reminders: true }, { upsert: true });
    bot.sendMessage(msg.chat.id, "🔔 Notifications turned ON!", { reply_markup: await sendMainMenu(msg.chat.id, true) });
  });

  bot.onText(/\/off/, async msg => {
    await User.updateOne({ chatId: msg.chat.id }, { reminders: false }, { upsert: true });
    bot.sendMessage(msg.chat.id, "🔕 Notifications turned OFF", { reply_markup: await sendMainMenu(msg.chat.id, true) });
  });

  bot.onText(/\/settings/, async msg => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ chatId }) || {};
    const timing = user.timing || {};
    const breakfastTime = timing.breakfast || "07:30";
    const lunchTime = timing.lunch || "11:00";
    const dinnerTime = timing.dinner || "20:00";

    const keyboard = {
      inline_keyboard: [
        [{ text: `🌅 Breakfast (${breakfastTime})`, callback_data: `set_breakfast` }],
        [{ text: `🍛 Lunch (${lunchTime})`, callback_data: `set_lunch` }],
        [{ text: `🍽️ Dinner (${dinnerTime})`, callback_data: `set_dinner` }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ]
    };
    bot.sendMessage(chatId, `⚙️ *Notification Settings*\n\nYour current notification timings are:\n- Breakfast: ${breakfastTime}\n- Lunch: ${lunchTime}\n- Dinner: ${dinnerTime}\n\nClick a button below to change the time.`, { parse_mode: "Markdown", reply_markup: keyboard });
  });

  bot.onText(/\/announcements/, async msg => {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(10);
    if (announcements.length === 0) {
      return bot.sendMessage(msg.chat.id, "📭 *No announcements yet.*", { parse_mode: "Markdown" });
    }

    let text = "📢 *Recent Announcements*\n\n";
    announcements.forEach((ann, idx) => {
      const date = new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      text += `${idx + 1}. *[${date}]* ${ann.message}\n\n`;
    });

    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
  });

  bot.onText(/\/widget/, async msg => {
    const chatId = msg.chat.id;
    const url = `https://masterchefind-bot.onrender.com/api/next-meal?chatId=${chatId}`;
    const text = `📱 *Personalized Widget URL*\n\nHere is your unique API endpoint for iOS Shortcuts or Android widgets. It is securely linked to your account and uses your custom meal notification timings!\n\n\`${url}\`\n\n_Tap the link above to copy it._`;
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });

  console.log("🤖 Telegram Handlers initialized");
}

module.exports = { initHandlers };
