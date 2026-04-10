const TelegramBot = require("node-telegram-bot-api");
const PDFParser = require("pdf2json");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
const mongoose = require("mongoose");
require("dotenv").config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error(err));

// ===== User Schema =====
const userSchema = new mongoose.Schema({
  chatId: String,
  reminders: { type: Boolean, default: true }
});
const User = mongoose.model("User", userSchema);

// ===== Menu Schema =====
const menuSchema = new mongoose.Schema({
  weekId: String, // e.g. "2026-04-06"
  data: Object
});
const Menu = mongoose.model("Menu", menuSchema);

// ================= USER =================
async function ensureUser(chatId) {
  let user = await User.findOne({ chatId });
  if (!user) user = await User.create({ chatId, reminders: true });
  return user;
}

bot.on("message", async (msg) => {
  await ensureUser(msg.chat.id);
});

// ================= MENU =================

// Save menu
async function saveMenu(menu) {
  const weekId = getWeekId();

  await Menu.findOneAndUpdate(
    { weekId },
    { data: menu },
    { upsert: true }
  );
}

// Get menu
async function getMenu() {
  const weekId = getWeekId();
  const menu = await Menu.findOne({ weekId });
  return menu?.data || null;
}

// Week identifier
function getWeekId() {
  const d = getISTDate(0);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ================= PDF =================
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  await ensureUser(chatId);

  bot.sendMessage(chatId, "📄 Processing menu... ⏳");

  try {
    if (msg.document.mime_type !== "application/pdf") {
      bot.sendMessage(chatId, "Please upload a PDF file.");
      return;
    }

    const fileUrl = await bot.getFileLink(msg.document.file_id);
    const res = await axios.get(fileUrl, { responseType: "arraybuffer" });

    fs.writeFileSync("menu.pdf", res.data);

    const parsedMenu = await parseMenuFromPDF("menu.pdf");

    await saveMenu(parsedMenu);

    bot.sendMessage(chatId,
      "✅ *Menu saved successfully!*\n\nUse /today 🍽️",
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Failed to parse PDF.");
  }
});

// ================= TIME =================
function getISTDate(offset = 0) {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  ist.setDate(ist.getDate() + offset);
  return ist;
}

function getDay(offset = 0) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[getISTDate(offset).getDay()];
}

// ================= UI =================
function formatMenu(day, data) {
  if (!data || !data[day]) return "⚠️ Menu not uploaded yet.";

  return `🍽️ *${day} Menu*

🥞 *Breakfast*
${data[day].breakfast || "—"}

🍛 *Lunch*
${data[day].lunch || "—"}

🍽️ *Dinner*
${data[day].dinner || "—"}`;
}

// ================= COMMANDS =================
bot.onText(/\/today/, async (msg) => {
  const chatId = msg.chat.id;

  const menu = await getMenu();
  const day = getDay(0);

  bot.sendMessage(chatId, formatMenu(day, menu), { parse_mode: "Markdown" });
});

bot.onText(/\/tomorrow/, async (msg) => {
  const chatId = msg.chat.id;

  const menu = await getMenu();
  const day = getDay(1);

  bot.sendMessage(chatId,
    `📅 *Tomorrow*\n\n${formatMenu(day, menu)}`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/all/, async (msg) => {
  const chatId = msg.chat.id;

  const menu = await getMenu();
  if (!menu) {
    bot.sendMessage(chatId, "⚠️ Menu not uploaded yet.");
    return;
  }

  let text = "📅 *Weekly Menu*\n\n";

  Object.keys(menu).forEach(day => {
    text += `━━━━━━━━━━━━━━━\n📍 *${day}*\n`;
    text += `🥞 ${menu[day].breakfast}\n`;
    text += `🍛 ${menu[day].lunch}\n`;
    text += `🍽️ ${menu[day].dinner}\n\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

// ================= REMINDERS =================
bot.onText(/\/on/, async (msg) => {
  await User.updateOne({ chatId: msg.chat.id }, { reminders: true }, { upsert: true });
  bot.sendMessage(msg.chat.id, "🔔 Reminders ON");
});

bot.onText(/\/off/, async (msg) => {
  await User.updateOne({ chatId: msg.chat.id }, { reminders: false }, { upsert: true });
  bot.sendMessage(msg.chat.id, "🔕 Reminders OFF");
});

// ================= CRON =================
async function sendToUsers(builder) {
  const users = await User.find({ reminders: true });
  const menu = await getMenu();

  if (!menu) return;

  users.forEach(user => {
    bot.sendMessage(user.chatId, builder(menu), {
      parse_mode: "Markdown"
    });
  });
}

cron.schedule("0 7 * * *", async () => {
  const day = getDay(0);
  await sendToUsers(menu =>
    `🌅 *Good Morning!*\n\n${formatMenu(day, menu)}`
  );
}, { timezone: "Asia/Kolkata" });

cron.schedule("0 11 * * *", async () => {
  const day = getDay(0);
  await sendToUsers(menu =>
    `🍛 *Lunch Time!*\n\n${menu[day]?.lunch}`
  );
}, { timezone: "Asia/Kolkata" });

cron.schedule("0 20 * * *", async () => {
  const day = getDay(0);
  await sendToUsers(menu =>
    `🍽️ *Dinner Time!*\n\n${menu[day]?.dinner}`
  );
}, { timezone: "Asia/Kolkata" });

console.log("🚀 Bot running with MongoDB (Menu + Users)");