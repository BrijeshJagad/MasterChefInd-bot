// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Bot } = require('node-telegram-bot-api');
import axios from 'axios';

interface TelegramErrorLike {
  description?: string;
  message?: string;
}

function isTelegramError(err: unknown): err is TelegramErrorLike {
  return (
    typeof err === 'object' &&
    err !== null &&
    ('description' in err || 'message' in err)
  );
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: { id: number | string; [key: string]: unknown };
  from?: { id: number | string; first_name?: string; username?: string; [key: string]: unknown };
  text?: string;
  photo?: { file_id: string; width: number; height: number; [key: string]: unknown }[];
  document?: { file_id: string; file_name?: string; mime_type?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number | string; first_name?: string; username?: string; [key: string]: unknown };
  message?: TelegramMessage;
  data?: string;
  [key: string]: unknown;
}

export type MessageHandler = (msg: TelegramMessage) => void | Promise<void>;
export type CallbackQueryHandler = (query: TelegramCallbackQuery) => void | Promise<void>;
export type TextRegexHandler = (msg: TelegramMessage, match: RegExpMatchArray) => void | Promise<void>;

export class ModernTelegramBot {
  public token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public rawBot: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _listeners: Record<string, ((arg: any) => void | Promise<void>)[]>;
  private _textHandlers: { regex: RegExp; handler: TextRegexHandler }[];

  constructor(token: string, options: Record<string, unknown> = {}) {
    this.token = token;
    this.rawBot = new Bot(token, options);
    this.api = this.rawBot.api;
    this._listeners = {
      message: [],
      callback_query: [],
      document: [],
      photo: [],
    };
    this._textHandlers = [];

    // Global middleware bridging updates to legacy handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.rawBot.use(async (ctx: any, next: () => Promise<void>) => {
      try {
        if (ctx.message) {
          const msg = ctx.message as TelegramMessage;
          
          if (msg.text) {
            for (const { regex, handler } of this._textHandlers) {
              const match = msg.text.match(regex);
              if (match) {
                try {
                  await handler(msg, match);
                } catch (err: unknown) {
                  const errorMsg = err instanceof Error ? err.message : String(err);
                  console.error('Error in onText handler:', errorMsg);
                }
              }
            }
          }

          if (msg.document) {
            for (const fn of this._listeners['document'] || []) {
              try { await fn(msg); } catch (err: unknown) { console.error('Error in document listener:', err); }
            }
          }

          if (msg.photo) {
            for (const fn of this._listeners['photo'] || []) {
              try { await fn(msg); } catch (err: unknown) { console.error('Error in photo listener:', err); }
            }
          }

          for (const fn of this._listeners['message'] || []) {
            try { await fn(msg); } catch (err: unknown) { console.error('Error in message listener:', err); }
          }
        }

        if (ctx.callbackQuery) {
          const query = ctx.callbackQuery as TelegramCallbackQuery;
          for (const fn of this._listeners['callback_query'] || []) {
            try { await fn(query); } catch (err: unknown) { console.error('Error in callback_query listener:', err); }
          }
        }
      } catch (middlewareErr: unknown) {
        console.error('Error processing Telegram update in middleware:', middlewareErr);
      }

      await next();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public on(event: string, handler: any): void {
    if (this._listeners[event]) {
      this._listeners[event]?.push(handler);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.rawBot.on(event, (ctx: any) => handler(ctx.update?.[event] || ctx));
    }
  }

  public onText(regex: RegExp, handler: TextRegexHandler): void {
    this._textHandlers.push({ regex, handler });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async sendMessage(chatId: number | string, text: string, options: Record<string, any> = {}): Promise<any> {
    try {
      return await this.api.sendMessage({
        chat_id: chatId,
        text: String(text),
        ...options,
      });
    } catch (err: unknown) {
      const desc = isTelegramError(err) ? (err.description ?? err.message ?? '') : '';
      if (options['parse_mode'] && desc.toLowerCase().includes('entities')) {
        const fallbackOptions = { ...options };
        delete fallbackOptions['parse_mode'];
        return await this.api.sendMessage({
          chat_id: chatId,
          text: String(text),
          ...fallbackOptions,
        });
      }
      throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async sendPhoto(chatId: number | string, photo: unknown, options: Record<string, any> = {}): Promise<any> {
    return this.api.sendPhoto({
      chat_id: chatId,
      photo: photo,
      ...options,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async sendDocument(chatId: number | string, doc: unknown, options: Record<string, any> = {}, fileOptions: Record<string, any> = {}): Promise<any> {
    return this.api.sendDocument({
      chat_id: chatId,
      document: doc,
      ...options,
      ...fileOptions,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async answerCallbackQuery(callbackQueryId: string | number, options: Record<string, any> = {}): Promise<any> {
    try {
      return await this.api.answerCallbackQuery({
        callback_query_id: String(callbackQueryId),
        ...options,
      });
    } catch {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async editMessageText(text: string, options: Record<string, any> = {}): Promise<any> {
    try {
      return await this.api.editMessageText({
        text: String(text),
        ...options,
      });
    } catch (err: unknown) {
      const desc = isTelegramError(err) ? (err.description ?? err.message ?? '') : '';
      if (desc.includes('message is not modified')) return null;
      if (options['parse_mode'] && desc.toLowerCase().includes('entities')) {
        const fallbackOptions = { ...options };
        delete fallbackOptions['parse_mode'];
        return await this.api.editMessageText({
          text: String(text),
          ...fallbackOptions,
        });
      }
      throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async editMessageReplyMarkup(replyMarkup: unknown, options: Record<string, any> = {}): Promise<any> {
    try {
      return await this.api.editMessageReplyMarkup({
        reply_markup: replyMarkup,
        ...options,
      });
    } catch (err: unknown) {
      const desc = isTelegramError(err) ? (err.description ?? err.message ?? '') : '';
      if (desc.includes('message is not modified')) return null;
      throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async setMyCommands(commands: unknown[], options: Record<string, any> = {}): Promise<any> {
    return this.api.setMyCommands({
      commands: commands,
      ...options,
    });
  }

  public async getFileLink(fileId: string): Promise<string> {
    const file = await this.api.getFile({ file_id: fileId });
    return `https://api.telegram.org/file/bot${this.token}/${file.file_path}`;
  }

  public startPolling(options: Record<string, unknown> = {}): Promise<void> {
    return this.rawBot.startPolling(undefined, options);
  }

  public stop(): void {
    this.rawBot.stop();
  }
}

let botInstance: ModernTelegramBot | null = null;

export function getBot(): ModernTelegramBot {
  if (!botInstance) {
    const token = process.env['BOT_TOKEN'];
    if (!token) {
      console.error('❌ BOT_TOKEN is not defined in environment variables.');
      process.exit(1);
    }
    botInstance = new ModernTelegramBot(token);
  }
  return botInstance;
}

export async function startBotPolling(): Promise<void> {
  const bot = getBot();
  const token = process.env['BOT_TOKEN'];
  if (!token || token.includes('your_telegram')) {
    console.error('❌ Invalid BOT_TOKEN. Please check your .env file.');
    return;
  }

  try {
    await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`, { timeout: 3000 });
  } catch {
    // Non-fatal
  }
  
  bot.startPolling().catch(err => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Telegram Polling error:', msg);
  });
  console.log('✅ Telegram Bot polling running (v2.3.0)');
}
