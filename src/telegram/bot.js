const { Bot, Api } = require("node-telegram-bot-api");
const axios = require("axios");

class ModernTelegramBot {
  constructor(token, options = {}) {
    this.token = token;
    this.rawBot = new Bot(token, options);
    this.api = this.rawBot.api;
    this._listeners = {
      message: [],
      callback_query: [],
      document: [],
      photo: []
    };
    this._textHandlers = [];

    // Global middleware bridging updates
    this.rawBot.use(async (ctx, next) => {
      // 1. Message updates
      if (ctx.message) {
        const msg = ctx.message;
        
        // Execute regex onText handlers first
        if (msg.text) {
          for (const { regex, handler } of this._textHandlers) {
            const match = msg.text.match(regex);
            if (match) {
              try {
                await handler(msg, match);
              } catch (err) {
                console.error("Error in onText handler:", err);
              }
            }
          }
        }

        // Specific media listeners
        if (msg.document) {
          for (const fn of this._listeners.document) {
            try { await fn(msg); } catch (err) { console.error("Error in document listener:", err); }
          }
        }
        if (msg.photo) {
          for (const fn of this._listeners.photo) {
            try { await fn(msg); } catch (err) { console.error("Error in photo listener:", err); }
          }
        }

        // General message listeners
        for (const fn of this._listeners.message) {
          try { await fn(msg); } catch (err) { console.error("Error in message listener:", err); }
        }
      }

      // 2. Callback queries
      if (ctx.callbackQuery) {
        const query = ctx.callbackQuery;
        for (const fn of this._listeners.callback_query) {
          try { await fn(query); } catch (err) { console.error("Error in callback_query listener:", err); }
        }
      }

      await next();
    });
  }

  on(event, handler) {
    if (this._listeners[event]) {
      this._listeners[event].push(handler);
    } else {
      this.rawBot.on(event, (ctx) => handler(ctx.update?.[event] || ctx));
    }
  }

  onText(regex, handler) {
    this._textHandlers.push({ regex, handler });
  }

  async sendMessage(chatId, text, options = {}) {
    return this.api.sendMessage({
      chat_id: chatId,
      text: String(text),
      ...options
    });
  }

  async sendPhoto(chatId, photo, options = {}) {
    return this.api.sendPhoto({
      chat_id: chatId,
      photo: photo,
      ...options
    });
  }

  async sendDocument(chatId, doc, options = {}) {
    return this.api.sendDocument({
      chat_id: chatId,
      document: doc,
      ...options
    });
  }

  async answerCallbackQuery(callbackQueryId, options = {}) {
    return this.api.answerCallbackQuery({
      callback_query_id: callbackQueryId,
      ...options
    });
  }

  async editMessageText(text, options = {}) {
    return this.api.editMessageText({
      text: String(text),
      ...options
    });
  }

  async editMessageReplyMarkup(replyMarkup, options = {}) {
    return this.api.editMessageReplyMarkup({
      reply_markup: replyMarkup,
      ...options
    });
  }

  async setMyCommands(commands, options = {}) {
    return this.api.setMyCommands({
      commands: commands,
      ...options
    });
  }

  async getFileLink(fileId) {
    const file = await this.api.getFile({ file_id: fileId });
    return `https://api.telegram.org/file/bot${this.token}/${file.file_path}`;
  }

  startPolling(options = {}) {
    return this.rawBot.startPolling(undefined, options);
  }

  stop() {
    this.rawBot.stop();
  }
}

let botInstance = null;

function getBot() {
  if (!botInstance) {
    if (!process.env.BOT_TOKEN) {
      console.error("❌ BOT_TOKEN is not defined in environment variables.");
      process.exit(1);
    }
    botInstance = new ModernTelegramBot(process.env.BOT_TOKEN);
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
    try {
      await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);
      await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, { params: { offset: -1 } });
    } catch (apiErr) {
      console.log("ℹ️ Webhook/Updates cleanup (normal if already clean):", apiErr.message);
    }
    
    // Launch polling in background so promise resolves and server startup proceeds
    bot.startPolling().catch(err => {
      console.error("❌ Telegram Polling runtime error:", err.message);
    });
    console.log("✅ Polling started safely with node-telegram-bot-api v2.3.0");
  } catch (err) {
    const detail = err.response?.data?.description || err.message;
    console.error("❌ Telegram Startup error:", detail);
  }
}

module.exports = { getBot, startBotPolling, ModernTelegramBot };
