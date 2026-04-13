const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const PDFParser = require("pdf2json");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
const mongoose = require("mongoose");
require("dotenv").config();

// ================= BOT =================
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: false
});

// 🌐 Dummy server for Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🤖 Bot is running");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ⏳ Safe polling start (fix 409)
async function startBot() {
  try {
    const token = process.env.BOT_TOKEN;

    console.log("🧹 Cleaning old Telegram sessions (HTTP)...");

    // ✅ 1. Delete webhook
    await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);

    // ✅ 2. Clear pending updates
    await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
      params: { offset: -1 }
    });

    console.log("⏳ Waiting before starting polling...");

    // ⏳ Delay (Render safe)
    await new Promise(res => setTimeout(res, 8000));

    // ✅ Start polling
    await bot.startPolling({
      interval: 300,
      params: { timeout: 10 }
    });

    console.log("✅ Polling started safely");

  } catch (err) {
    console.error("❌ Startup error:", err.message);
  }
}

startBot();

console.log("🚀 Bot running with MongoDB (Menu + Users)");

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
  weekId: String,
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
  const chatId = msg.chat.id;
  await ensureUser(chatId);

  // ignore button clicks
  if (msg.text && msg.text.startsWith("/")) return;

  sendMainMenu(chatId);
});

bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || "there";
  const welcomeText = `Hey ${name}! 👋 Welcome to your Canteen Bot. 👨‍🍳

I can help you check what's cooking today and send you automated reminders so you never miss a meal! What would you like to see first?`;
  
  bot.sendMessage(msg.chat.id, welcomeText, {
    parse_mode: "Markdown",
    reply_markup: sendMainMenu(msg.chat.id, true) // Pass true to only get the keyboard
  });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  const menu = await getMenu();

  if (action === "today") {
    const day = getDay(0);
    bot.sendMessage(chatId, formatMenu(day, menu), { parse_mode: "Markdown" });
  }

  if (action === "tomorrow") {
    const day = getDay(1);
    bot.sendMessage(chatId,
      `📅 *Tomorrow*\n\n${formatMenu(day, menu)}`,
      { parse_mode: "Markdown" }
    );
  }

  if (action === "all") {
    bot.sendMessage(chatId, formatFullMenu(menu), { parse_mode: "Markdown" });
  }

  if (action === "on") {
    await User.updateOne({ chatId }, { reminders: true }, { upsert: true });
    bot.sendMessage(chatId, "🔔 Reminders ON");
  }

  if (action === "off") {
    await User.updateOne({ chatId }, { reminders: false }, { upsert: true });
    bot.sendMessage(chatId, "🔕 Reminders OFF");
  }

  bot.answerCallbackQuery(query.id);
});

function sendMainMenu(chatId, returnKeyboard = false) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🍽️ Today", callback_data: "today" },
        { text: "📅 Tomorrow", callback_data: "tomorrow" }
      ],
      [
        { text: "📋 Full Weekly Plan", callback_data: "all" }
      ],
      [
        { text: "🔔 Notifications: ON", callback_data: "on" },
        { text: "🔕 OFF", callback_data: "off" }
      ]
    ]
  };

  if (returnKeyboard) return keyboard;

  bot.sendMessage(chatId, `🍽️ *Main Menu*\n\nChoose an option 👇`, {
    parse_mode: "Markdown",
    reply_markup: keyboard
  });
}

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

// ================= MENU DB =================
function getWeekId() {
  const d = getISTDate(0);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}

async function saveMenu(menu) {
  await Menu.findOneAndUpdate(
    { weekId: getWeekId() },
    { data: menu },
    { upsert: true }
  );
}

async function getMenu() {
  const menu = await Menu.findOne({ weekId: getWeekId() });
  return menu?.data || null;
}

// ================= PDF PARSER =================
function parseMenuFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", err => reject(err));

    pdfParser.on("pdfParser_dataReady", pdfData => {
      const items = [];

      pdfData.Pages.forEach(page => {
        page.Texts.forEach(t => {
          items.push({
            text: decodeURIComponent(t.R[0].T),
            x: t.x,
            y: t.y
          });
        });
      });

      resolve(buildMenu(items));
    });

    pdfParser.loadPDF(filePath);
  });
}

// ================= MENU PARSER =================
function buildMenu(items) {
  const days = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
  const rows = groupRows(items);
  const headers = detectHeaders(rows);

  const dayRows = rows.filter(row =>
    row.items.some(item => days.some(day => item.text.toUpperCase().includes(day)))
  );

  if (headers && dayRows.length > 0) {
    return buildMenuFromColumns(rows, dayRows, headers, days);
  }

  return buildMenuFromSequentialLines(rows.map(r => r.text), days);
}

function groupRows(items) {
  const rows = [];
  const sorted = [...items].sort((a,b)=>(a.y-b.y)||(a.x-b.x));

  for (const item of sorted) {
    const last = rows[rows.length - 1];
    if (!last || Math.abs(last.y - item.y) > 0.35) {
      rows.push({ y: item.y, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return rows.map(r => ({
    y: r.y,
    items: r.items.sort((a,b)=>a.x-b.x),
    text: r.items.map(i=>i.text).join(" ").trim()
  }));
}

function detectHeaders(rows) {
  for (const row of rows) {
    const h = {};
    for (const item of row.items) {
      const t = item.text.toUpperCase();
      if (t.includes("BREAKFAST")) h.breakfast = item.x;
      if (t.includes("LUNCH")) h.lunch = item.x;
      if (t.includes("DINNER")) h.dinner = item.x;
    }
    if (h.breakfast && h.lunch && h.dinner) return h;
  }
  return null;
}

function buildMenuFromColumns(rows, dayRows, headers, days) {
  const menu = {};
  const anchors = dayRows.map(r => {
    const item = r.items.find(i => days.some(d => i.text.toUpperCase().includes(d)));
    return { day: capitalize(days.find(d => item.text.toUpperCase().includes(d))), y: item.y };
  });

  const grouped = Object.fromEntries(anchors.map(a => [a.day,{breakfast:[],lunch:[],dinner:[]}]));

  for (const row of rows) {
    if (/TIME/i.test(row.text)) break;

    for (const item of row.items) {
      if (days.some(d => item.text.toUpperCase().includes(d))) continue;

      const day = anchors.reduce((p,c)=>Math.abs(c.y-item.y)<Math.abs(p.y-item.y)?c:p);
      const col = ["breakfast","lunch","dinner"].reduce((p,c)=>
        Math.abs(item.x-headers[c])<Math.abs(item.x-headers[p])?c:p
      );

      grouped[day.day][col].push(item.text);
    }
  }

  anchors.forEach(a=>{
    const breakfastRaw = grouped[a.day].breakfast.join(", ");
    const dateMatch = breakfastRaw.match(/\b\d{2}-\d{2}\b/);
    const date = dateMatch ? dateMatch[0] : "";

    menu[a.day]={
      date: date,
      breakfast: clean(breakfastRaw),
      lunch: clean(grouped[a.day].lunch.join(", ")),
      dinner: clean(grouped[a.day].dinner.join(", "))
    };
  });

  return menu;
}

function buildMenuFromSequentialLines(lines, days) {
  const menu = {};
  for (let i=0;i<lines.length;i++){
    const day=days.find(d=>lines[i].toUpperCase().includes(d));
    if(!day) continue;

    const breakfastRaw = lines[i+1]||"";
    const dateMatch = breakfastRaw.match(/\b\d{2}-\d{2}\b/);
    const date = dateMatch ? dateMatch[0] : "";

    menu[capitalize(day)]={
      date: date,
      breakfast: clean(breakfastRaw),
      lunch: clean((lines[i+2]||"")+" "+(lines[i+3]||"")),
      dinner: clean(lines[i+4]||"")
    };
  }
  return menu;
}

function clean(text){
  return text
    .replace(/\b\d{2}[-/]\d{2}([-/]\d{2,4})?\b/g, "") // remove dates
    .replace(/\b(BREAKFAST|LUNCH|DINNER|TIME|TO)\b/gi, "") // remove headers
    .replace(/\s+/g," ")
    .replace(/\s*,\s*/g,", ")
    .replace(/OFF/i,"❌ OFF")
    .trim()
    .replace(/^,|,$/g, "")
    .trim();
}

function capitalize(w){return w.charAt(0)+w.slice(1).toLowerCase();}

// ================= PDF UPLOAD =================
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "📄 Processing menu... ⏳");

  try {
    const fileUrl = await bot.getFileLink(msg.document.file_id);
    const res = await axios.get(fileUrl, { responseType: "arraybuffer" });

    fs.writeFileSync("menu.pdf", res.data);

    const menu = await parseMenuFromPDF("menu.pdf");
    await saveMenu(menu);

    bot.sendMessage(chatId, `✅ *Menu Saved!*\n\n${formatFullMenu(menu)}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Failed to parse PDF.");
  }
});

// ================= COMMANDS =================
function formatMenu(day, data) {
  if (!data || !data[day]) return "⚠️ Menu not uploaded yet.";

  const dateStr = data[day].date ? ` (${data[day].date})` : "";
  return `*${day}${dateStr.toUpperCase()}*

🍳 *Breakfast*: ${data[day].breakfast || "—"}
🍲 *Lunch*: ${data[day].lunch || "—"}
🥗 *Dinner*: ${data[day].dinner || "—"}`;
}

function formatFullMenu(menu) {
  if (!menu) return "⚠️ No menu uploaded yet.";

  let text = "📅 *WEEKLY MENU*\n";
  Object.keys(menu).forEach(day => {
    const dateStr = menu[day].date ? ` (${menu[day].date})` : "";
    text += `\n*${day}${dateStr.toUpperCase()}*\n`;
    text += `🍳 B: ${menu[day].breakfast || "—"}\n`;
    text += `🍲 L: ${menu[day].lunch || "—"}\n`;
    text += `🥗 D: ${menu[day].dinner || "—"}\n`;
  });
  return text;
}

bot.onText(/\/today/, async msg=>{
  const menu=await getMenu();
  bot.sendMessage(msg.chat.id, formatMenu(getDay(0),menu),{parse_mode:"Markdown"});
});

bot.onText(/\/tomorrow/, async msg=>{
  const menu=await getMenu();
  const day=getDay(1);
  bot.sendMessage(msg.chat.id,`📅 Tomorrow\n\n${formatMenu(day,menu)}`,{parse_mode:"Markdown"});
});

bot.onText(/\/all/, async msg => {
  const menu = await getMenu();
  bot.sendMessage(msg.chat.id, formatFullMenu(menu), { parse_mode: "Markdown" });
});

// ================= REMINDERS =================
bot.onText(/\/on/, msg=>{
  User.updateOne({chatId:msg.chat.id},{reminders:true},{upsert:true});
  bot.sendMessage(msg.chat.id,"🔔 ON");
});

bot.onText(/\/off/, msg=>{
  User.updateOne({chatId:msg.chat.id},{reminders:false},{upsert:true});
  bot.sendMessage(msg.chat.id,"🔕 OFF");
});

// ================= CRON =================
async function sendToUsers(builder){
  const users=await User.find({reminders:true});
  const menu=await getMenu();
  if(!menu) return;

  users.forEach(u=>bot.sendMessage(u.chatId,builder(menu)));
}

cron.schedule("0 7 * * *", async()=>{
  const d=getDay(0);
  sendToUsers(m=>`🌅 ${formatMenu(d,m)}`);
},{timezone:"Asia/Kolkata"});

cron.schedule("0 11 * * *", async()=>{
  const d=getDay(0);
  sendToUsers(m=>`🍛 ${m[d].lunch}`);
},{timezone:"Asia/Kolkata"});

cron.schedule("0 20 * * *", async()=>{
  const d=getDay(0);
  sendToUsers(m=>`🍽️ ${m[d].dinner}`);
},{timezone:"Asia/Kolkata"});
