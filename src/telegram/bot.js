const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

let botInstance = null;

function getBot() {
  if (!botInstance) {
    if (!process.env.BOT_TOKEN) {
      console.error("❌ BOT_TOKEN is not defined in environment variables.");
      process.exit(1);
    }
    botInstance = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
  }
  return botInstance;
}

async function startBotPolling() {
  const bot = getBot();
  try {
    const token = process.env.BOT_TOKEN;
    if (!token || token.includes("your_telegram")) {
      console.error("❌ Invalid BOT_TOKEN. Please check your .env file.");
      return;
    }

    console.log("🧹 Cleaning old Telegram sessions (HTTP)...");
    
    // Use try/catch specifically for cleanup to avoid stopping the whole process on minor API errors
    try {
      await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);
      await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, { params: { offset: -1 } });
    } catch (apiErr) {
      console.log("ℹ️ Webhook/Updates cleanup (normal if already clean):", apiErr.message);
    }
    
    console.log("⏳ Waiting 8s for Telegram cooldown...");
    await new Promise(res => setTimeout(res, 8000));
    
    await bot.startPolling({ interval: 300, params: { timeout: 10 } });
    console.log("✅ Polling started safely");
  } catch (err) {
    const detail = err.response?.data?.description || err.message;
    console.error("❌ Telegram Startup error:", detail);
  }
}

module.exports = { getBot, startBotPolling };
