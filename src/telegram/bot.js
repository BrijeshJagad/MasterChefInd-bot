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

    // Global middleware bridging updates to legacy handlers
    this.rawBot.use(async (ctx, next) => {
      try {
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
                  console.error("Error in onText handler:", err.message);
                }
              }
            }
          }

          // Document handlers
          if (msg.document) {
            for (const fn of this._listeners.document) {
              try { await fn(msg); } catch (err) { console.error("Error in document listener:", err.message); }
            }
          }

          // Photo handlers
          if (msg.photo) {
            for (const fn of this._listeners.photo) {
              try { await fn(msg); } catch (err) { console.error("Error in photo listener:", err.message); }
            }
          }

          // General message listeners
          for (const fn of this._listeners.message) {
            try { await fn(msg); } catch (err) { console.error("Error in message listener:", err.message); }
          }
        }

        // 2. Callback query updates
        if (ctx.callbackQuery) {
          const query = ctx.callbackQuery;
          for (const fn of this._listeners.callback_query) {
            try { await fn(query); } catch (err) { console.error("Error in callback_query listener:", err.message); }
          }
        }
      } catch (middlewareErr) {
        console.error("Error processing Telegram update in middleware:", middlewareErr);
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
    try {
      return await this.api.sendMessage({
        chat_id: chatId,
        text: String(text),
        ...options
      });
    } catch (err) {
      // If Telegram rejects markdown formatting entities, auto-fallback to plain text
      const desc = err.description || err.message || "";
      if (options.parse_mode && desc.toLowerCase().includes("entities")) {
        const fallbackOptions = { ...options };
        delete fallbackOptions.parse_mode;
        return await this.api.sendMessage({
          chat_id: chatId,
          text: String(text),
          ...fallbackOptions
        });
      }
      throw err;
    }
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
    try {
      return await this.api.answerCallbackQuery({
        callback_query_id: String(callbackQueryId),
        ...options
      });
    } catch (err) {
      // Non-fatal if query is too old
      return null;
    }
  }

  async editMessageText(text, options = {}) {
    try {
      return await this.api.editMessageText({
        text: String(text),
        ...options
      });
    } catch (err) {
      const desc = err.description || err.message || "";
      if (desc.includes("message is not modified")) return null;
      if (options.parse_mode && desc.toLowerCase().includes("entities")) {
        const fallbackOptions = { ...options };
        delete fallbackOptions.parse_mode;
        return await this.api.editMessageText({
          text: String(text),
          ...fallbackOptions
        });
      }
      throw err;
    }
  }

  async editMessageReplyMarkup(replyMarkup, options = {}) {
    try {
      return await this.api.editMessageReplyMarkup({
        reply_markup: replyMarkup,
        ...options
      });
    } catch (err) {
      const desc = err.description || err.message || "";
      if (desc.includes("message is not modified")) return null;
      throw err;
    }
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
  const token = process.env.BOT_TOKEN;
  if (!token || token.includes("your_telegram")) {
    console.error("❌ Invalid BOT_TOKEN. Please check your .env file.");
    return;
  }

  // Ensure webhook is removed fast (non-blocking with 3s timeout)
  try {
    await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`, { timeout: 3000 });
  } catch (apiErr) {
    // Ignore timeout / non-fatal
  }
  
  // Start polling in background
  bot.startPolling().catch(err => {
    console.error("❌ Telegram Polling error:", err.message);
  });
  console.log("✅ Telegram Bot polling running (v2.3.0)");
}

module.exports = { getBot, startBotPolling, ModernTelegramBot };
