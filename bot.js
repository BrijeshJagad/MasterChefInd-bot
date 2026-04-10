const TelegramBot = require("node-telegram-bot-api");
const PDFParser = require("pdf2json");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
require("dotenv").config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let chatId = null;
let weeklyMenu = {};

bot.on("document", async (msg) => {
  chatId = msg.chat.id;
  bot.sendMessage(chatId, "📄 Processing menu... ⏳");

  try {
    if (msg.document.mime_type !== "application/pdf") {
      bot.sendMessage(chatId, "Please upload a PDF file.");
      return;
    }

    const fileId = msg.document.file_id;
    const fileUrl = await bot.getFileLink(fileId);

    const res = await axios.get(fileUrl, { responseType: "arraybuffer" });
    fs.writeFileSync("menu.pdf", res.data);

    weeklyMenu = await parseMenuFromPDF("menu.pdf");

    bot.sendMessage(chatId, "✅ *Menu parsed successfully!*\n\nUse /today to check 🍽️", {
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "Failed to parse PDF.");
  }
});

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

function buildMenu(items) {
  const days = [
    "MONDAY", "TUESDAY", "WEDNESDAY",
    "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
  ];

  const rows = groupRows(items);
  const headers = detectHeaders(rows);
  const dayRows = rows.filter(row =>
    row.items.some(item => days.some(day => item.text.toUpperCase().includes(day)))
  );

  if (headers && dayRows.length > 0) {
    return buildMenuFromColumns(rows, dayRows, headers, days);
  }

  return buildMenuFromSequentialLines(rows.map(row => row.text), days);
}

function groupRows(items) {
  const rows = [];
  const tolerance = 0.35;
  const sortedItems = [...items].sort((a, b) => (a.y - b.y) || (a.x - b.x));

  for (const item of sortedItems) {
    const lastRow = rows[rows.length - 1];

    if (!lastRow || Math.abs(lastRow.y - item.y) > tolerance) {
      rows.push({ y: item.y, items: [item] });
      continue;
    }

    lastRow.items.push(item);
  }

  return rows.map(row => {
    row.items.sort((a, b) => a.x - b.x);

    return {
      y: row.y,
      items: row.items,
      text: row.items.map(item => item.text).join(" ").replace(/\s+/g, " ").trim()
    };
  });
}

function detectHeaders(rows) {
  for (const row of rows) {
    const headers = {};

    for (const item of row.items) {
      const upper = item.text.toUpperCase();

      if (upper.includes("BREAKFAST")) headers.breakfast = item.x;
      if (upper.includes("LUNCH")) headers.lunch = item.x;
      if (upper.includes("DINNER")) headers.dinner = item.x;
    }

    if (
      Number.isFinite(headers.breakfast) &&
      Number.isFinite(headers.lunch) &&
      Number.isFinite(headers.dinner)
    ) {
      return headers;
    }
  }

  return null;
}

function buildMenuFromColumns(rows, dayRows, headers, days) {
  const menu = {};
  const dayAnchors = dayRows.map(row => {
    const dayItem = row.items.find(item =>
      days.some(day => item.text.toUpperCase().includes(day))
    );

    if (!dayItem) return null;

    return {
      day: capitalize(days.find(day => dayItem.text.toUpperCase().includes(day))),
      y: dayItem.y
    };
  }).filter(Boolean);

  dayAnchors.forEach(anchor => {
    menu[anchor.day] = {
      breakfast: "",
      lunch: "",
      dinner: ""
    };
  });

  const grouped = Object.fromEntries(dayAnchors.map(anchor => [
    anchor.day,
    {
      breakfast: [],
      lunch: [],
      dinner: []
    }
  ]));

  for (const row of rows) {
    if (/^TIME$/i.test(row.text)) break;
    if (/\d{1,2}:\d{2}\s?(AM|PM)\s+TO\s+\d{1,2}:\d{2}\s?(AM|PM)/i.test(row.text)) break;

    for (const item of row.items) {
      const upper = item.text.toUpperCase();

      if (days.some(name => upper.includes(name))) continue;
      if (/^\d{2}[-/]\d{2}(?:[-/]\d{2,4})?$/.test(item.text)) continue;
      if (/\d{2}\/\d{2}\/\d{2,4}\s+TO\s+\d{2}\/\d{2}\/\d{2,4}/i.test(upper)) continue;
      if (/^(BREAKFAST|LUNCH|DINNER)$/i.test(item.text)) continue;

      const nearestDay = getNearestDay(item.y, dayAnchors);
      const bucket = getColumnName(item.x, headers);

      if (nearestDay && bucket) {
        grouped[nearestDay.day][bucket].push(item.text);
      }
    }
  }

  dayAnchors.forEach(anchor => {
    menu[anchor.day] = {
      breakfast: clean(grouped[anchor.day].breakfast.join(", ")),
      lunch: clean(grouped[anchor.day].lunch.join(", ")),
      dinner: clean(grouped[anchor.day].dinner.join(", "))
    };
  });

  return menu;
}

function getNearestDay(y, dayAnchors) {
  let nearest = null;

  for (const anchor of dayAnchors) {
    const distance = Math.abs(y - anchor.y);

    if (!nearest || distance < nearest.distance) {
      nearest = { day: anchor.day, distance };
    }
  }

  return nearest;
}

function getColumnName(x, headers) {
  const columns = [
    { name: "breakfast", distance: Math.abs(x - headers.breakfast) },
    { name: "lunch", distance: Math.abs(x - headers.lunch) },
    { name: "dinner", distance: Math.abs(x - headers.dinner) }
  ];

  columns.sort((a, b) => a.distance - b.distance);
  return columns[0]?.name || null;
}

function buildMenuFromSequentialLines(lines, days) {
  const menu = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    const dayMatch = days.find(day => line.includes(day));

    if (!dayMatch) continue;

    const breakfast = lines[i + 1] || "";
    const lunch =
      (lines[i + 2] || "") + " " +
      (lines[i + 3] || "") + " " +
      (lines[i + 4] || "");
    let dinner = lines[i + 5] || "";

    if (lines[i + 6] && !days.some(day => lines[i + 6].toUpperCase().includes(day))) {
      dinner += ", " + lines[i + 6];
    }

    menu[capitalize(dayMatch)] = {
      breakfast: clean(breakfast),
      lunch: clean(lunch),
      dinner: clean(dinner)
    };
  }

  return menu;
}

function clean(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/OFF/i, "❌ OFF")
    .trim();
}

function capitalize(word) {
  return word.charAt(0) + word.slice(1).toLowerCase();
}

function getDay(offset = 0) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return days[d.getDay()];
}

function formatMenu(day, data) {
  if (!data) return "⚠️ Menu not available. Upload PDF first.";

  return `🍽️ *${day} Menu*

🥞 *Breakfast* (7:30–9:00)
${data.breakfast || "—"}

🍛 *Lunch* (11:00–2:00)
${data.lunch || "—"}

🍽️ *Dinner* (8:00–10:00)
${data.dinner || "—"}`;
}

bot.onText(/\/start/, (msg) => {
  chatId = msg.chat.id;

  bot.sendMessage(chatId, `👋 Welcome to *MasterChef Bot* 🍽️

Your personal meal assistant 😎`, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [
        ["🍽️ /today", "📅 /tomorrow"],
        ["🗓️ /all"]
      ],
      resize_keyboard: true
    }
  });
});

bot.onText(/\/today/, (msg) => {
  const day = getDay(0);
  bot.sendMessage(msg.chat.id, formatMenu(day, weeklyMenu[day]), { parse_mode: "Markdown" });
});

bot.onText(/\/tomorrow/, (msg) => {
  const day = getDay(1);
  bot.sendMessage(msg.chat.id, formatMenu(day, weeklyMenu[day]), { parse_mode: "Markdown" });
});

bot.onText(/\/all/, (msg) => {
  let text = "📅 *Weekly Menu*\n\n";

  Object.keys(weeklyMenu).forEach(day => {
    text += `━━━━━━━━━━━━━━━\n`;
    text += `📍 *${day}*\n`;
    text += `🥞 ${weeklyMenu[day].breakfast}\n`;
    text += `🍛 ${weeklyMenu[day].lunch}\n`;
    text += `🍽️ ${weeklyMenu[day].dinner}\n\n`;
  });

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🤖 *Meal Bot Commands*

/today → Today's menu 🍽️  
/tomorrow → Tomorrow's menu 📅  
/all → Full week menu 🗓️  

📄 Upload new PDF every week to update
  `, { parse_mode: "Markdown" });
});

cron.schedule("0 7 * * *", () => {
  if (!chatId) return;

  const day = getDay(0);
  bot.sendMessage(chatId,
  `🌅 *Good Morning!*\n\n${formatMenu(day, weeklyMenu[day])}`,
  { parse_mode: "Markdown" }
);
});
