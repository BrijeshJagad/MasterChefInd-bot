import crypto from 'crypto';
import axios from 'axios';
import { getBot, TelegramMessage, TelegramCallbackQuery } from './bot';
import { User, Announcement } from '../services/models';
import { getMenu, saveMenu, getAvailableWeeks } from '../services/menu';
import { getDay, formatMenu, formatFullMenu, getWeekKey, getISTDate } from '../services/utils';
import { parseMenuWithGemini } from '../services/geminiParser';
import {
  castVote,
  getTodayPoll,
  getOrCreateTodayPoll,
  buildPollKeyboard,
  storeMessageId,
  formatTime,
  InlineKeyboardMarkup,
} from '../services/dinnerPoll';
import { PendingUploadSession, IUser } from '../../types/common';

// Simple in-memory state for password challenge and time settings
const pendingUploads = new Map<number | string, PendingUploadSession>();
const pendingTimeUpdates = new Map<number | string, { mealType: string; timestamp: number }>();

export function initHandlers(): void {
  const bot = getBot();

  // Set Bot Commands for the blue 'Menu' button
  const isDinnerPollEnabled = process.env['ENABLE_REMINDERS'] === 'true' || process.env['ENABLE_REMINDERS'] === '1';
  const commands = [
    { command: 'today', description: "Today's delicious menu" },
    { command: 'tomorrow', description: "Check what's cooking tomorrow" },
    { command: 'all', description: 'View full weekly plan' },
  ];

  if (isDinnerPollEnabled) {
    commands.push({ command: 'dinnerpoll', description: "Vote on tonight's dinner time" });
  }

  commands.push(
    { command: 'announcements', description: 'Latest platform updates' },
    { command: 'settings', description: 'Configure notification times' },
    { command: 'on', description: 'Enable daily reminders' },
    { command: 'off', description: 'Privacy mode: Disable reminders' },
    { command: 'widget', description: 'Get your personalized API link' }
  );

  bot.setMyCommands(commands).catch((err: Error) => console.error('Could not set bot commands:', err.message));

  async function ensureUser(chatId: number | string): Promise<IUser> {
    let user = await User.findOne({ chatId: String(chatId) });
    if (!user) user = await User.create({ chatId: String(chatId), reminders: true });
    return user;
  }

  async function sendMainMenu(chatId: number | string, returnKeyboard: boolean = false): Promise<InlineKeyboardMarkup | void> {
    const user = (await User.findOne({ chatId: String(chatId) })) || { reminders: true };
    const dinnerPollActive = process.env['ENABLE_REMINDERS'] === 'true' || process.env['ENABLE_REMINDERS'] === '1';
    const toggleLabel = user.reminders ? '🔕 Turn OFF Notifications' : '🔔 Turn ON Notifications';
    const toggleAction = user.reminders ? 'off' : 'on';

    const rows: { text: string; callback_data?: string; url?: string }[][] = [
      [
        { text: '🍽️ Today', callback_data: 'today' },
        { text: '📅 Tomorrow', callback_data: 'tomorrow' },
      ],
      [
        { text: '📋 Full Weekly Plan', callback_data: 'all' },
        { text: '📊 History & Stats', callback_data: 'history' },
      ],
    ];

    if (dinnerPollActive) {
      rows.push([
        { text: '🗳️ Dinner Vote', callback_data: 'dinnerpoll' },
        { text: '📢 Announcements', callback_data: 'announcements' },
      ]);
    } else {
      rows.push([
        { text: '📢 Announcements', callback_data: 'announcements' },
      ]);
    }

    rows.push([
      { text: '📑 Download PDF', callback_data: 'download_pdf' },
      { text: '⚡ Web Dashboard', url: 'https://masterchefind-bot.onrender.com' },
    ]);

    rows.push([
      { text: toggleLabel, callback_data: toggleAction },
      { text: '⚙️ Notification Settings', callback_data: 'settings' },
    ]);

    rows.push([
      { text: '📱 Get Widget URL', callback_data: 'widget_url' },
    ]);

    const keyboard: InlineKeyboardMarkup = { inline_keyboard: rows as InlineKeyboardMarkup['inline_keyboard'] };

    if (returnKeyboard) return keyboard;

    await bot.sendMessage(chatId, '🍽️ *Main Menu*\n\nChoose an option 👇\n_Or upload a new PDF / Image menu to update it!_', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }

  bot.on('message', async (msg: TelegramMessage) => {
    const chatId = msg.chat.id;
    if (msg.document) return; // handled by document event

    // Check if user is in "Waiting for Password" state
    if (pendingUploads.has(chatId)) {
      const pending = pendingUploads.get(chatId);
      if (!pending) return;
      const adminPassword = process.env['ADMIN_PASSWORD'];
      const isAuthValid = typeof msg.text === 'string' && adminPassword && (() => {
        const inputHash = crypto.scryptSync(msg.text, 'masterchef-auth-salt', 32);
        const expectedHash = crypto.scryptSync(adminPassword, 'masterchef-auth-salt', 32);
        return crypto.timingSafeEqual(inputHash, expectedHash);
      })();

      if (isAuthValid) {
        await bot.sendMessage(chatId, '🔐 *Password Correct!* Processing menu... ⏳', { parse_mode: 'Markdown' });

        try {
          const { menu, weekKey } = await parseMenuWithGemini(pending.buffer, pending.contentType || 'application/pdf');
          await saveMenu(menu, {
            buffer: pending.buffer,
            fileName: pending.fileName,
            contentType: pending.contentType,
          }, weekKey);

          pendingUploads.delete(chatId);

          const keyboard = await sendMainMenu(chatId, true);
          await bot.sendMessage(chatId, `✅ *Menu Updated for Week ${weekKey}!*\n\n${formatFullMenu(menu)}`, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });
        } catch (err: unknown) {
          console.error(err);
          const msgText = err instanceof Error ? err.message : String(err);
          await bot.sendMessage(chatId, `❌ Failed to parse menu: ${msgText}`);
          pendingUploads.delete(chatId);
        }
      } else {
        await bot.sendMessage(chatId, '❌ *Invalid Admin Password.* Upload cancelled.', { parse_mode: 'Markdown' });
        pendingUploads.delete(chatId);
      }
      return;
    }

    // Check if user is in "Waiting for Time Update" state
    if (pendingTimeUpdates.has(chatId)) {
      const pending = pendingTimeUpdates.get(chatId);
      if (!pending) return;
      const input = (msg.text || '').trim();

      // Validate HH:MM
      if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(input)) {
        await User.updateOne({ chatId: String(chatId) }, { [`timing.${pending.mealType}`]: input }, { upsert: true });
        const keyboard = await sendMainMenu(chatId, true);
        await bot.sendMessage(chatId, `✅ *${pending.mealType.charAt(0).toUpperCase() + pending.mealType.slice(1)}* notification time set to *${input}*!`, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } else {
        const keyboard = await sendMainMenu(chatId, true);
        await bot.sendMessage(chatId, '❌ *Invalid format.* Please use HH:MM (e.g. 07:30, 20:00). Cancelling update.', {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
      pendingTimeUpdates.delete(chatId);
      return;
    }

    await ensureUser(chatId);
    if (msg.text && msg.text.startsWith('/')) return;
    await sendMainMenu(chatId);
  });

  bot.onText(/\/start/, async (msg: TelegramMessage) => {
    const name = msg.from?.first_name || 'there';
    const welcomeText = `🚀 *Welcome to MasterChef Canteen, ${name}!* 👨‍🍳\n\nI'm your intelligent personal assistant for meal planning and canteen updates. My goal is to make sure you never miss a great meal!\n\n✨ *Key Features:*\n🔹 Interactive Menus\n🔹 Personalized Reminders\n🔹 Broadcast Updates\n\nReady to see what's cooking?`;
    const keyboard = await sendMainMenu(msg.chat.id, true);
    await bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.on('callback_query', async (query: TelegramCallbackQuery) => {
    if (!query.message) return;
    const chatId = query.message.chat.id;
    const action = query.data || '';

    // IMPORTANT: Always answer immediately to stop loading spinners
    await bot.answerCallbackQuery(query.id);

    // ── Dinner Poll Voting ──
    if (action.startsWith('dinner_vote_')) {
      const time = action.replace('dinner_vote_', '');
      const poll = await getTodayPoll();

      if (!poll || poll.status !== 'open') {
        return await bot.answerCallbackQuery(query.id, { text: '⏰ Voting is closed for today.', show_alert: true });
      }

      const updatedPoll = await castVote(String(chatId), time);
      if (!updatedPoll) {
        return await bot.answerCallbackQuery(query.id, { text: '⏰ Voting is closed for today.', show_alert: true });
      }

      const votesObj = updatedPoll.votes instanceof Map
        ? Object.fromEntries(updatedPoll.votes)
        : updatedPoll.votes;

      const keyboard = buildPollKeyboard(votesObj);
      const text = `🗳️ *Dinner Vote — What time tonight?*\n\nVoting closes at 7:30 PM. Tap your preferred time 👇\n\n✅ _Your vote: ${formatTime(time)}_`;

      try {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch {
        // Message unchanged
      }
      return;
    }

    if (action === 'history') {
      const weeks = await getAvailableWeeks();
      if (weeks.length === 0) return await bot.sendMessage(chatId, '⚠️ No historical records found.');

      const buttons: { text: string; callback_data: string }[][] = [];
      weeks.forEach(w => {
        buttons.push([{ text: `📅 Week ${w}`, callback_data: `view_week_${w}` }]);
      });
      buttons.push([{ text: '🏠 Home', callback_data: 'home' }]);

      return await bot.sendMessage(chatId, '📑 *Available Weekly Menus*\n\nSelect a week to view:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons },
      });
    }

    if (action === 'home') {
      return await sendMainMenu(chatId);
    }

    if (action === 'dinnerpoll') {
      const existing = await getTodayPoll();
      if (existing && existing.status === 'closed') {
        const keyboard = await sendMainMenu(chatId, true);
        return await bot.sendMessage(chatId, `📊 *Today's poll is already closed.*\n\n🏆 Dinner is at *${formatTime(existing.winningTime ?? '20:00')}* tonight!`, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
      if (existing && existing.status === 'notified') {
        const keyboard = await sendMainMenu(chatId, true);
        return await bot.sendMessage(chatId, `✅ *Tonight's dinner was at ${formatTime(existing.winningTime ?? '20:00')}.*\n\nSee you tomorrow!`, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }

      const poll = await getOrCreateTodayPoll();
      if (!poll) return;

      const votesObj: Record<string, string> = poll.votes instanceof Map 
        ? Object.fromEntries(poll.votes) 
        : (poll.votes as Record<string, string>);
      const userVote = votesObj[String(chatId)];
      const keyboard = buildPollKeyboard(votesObj);
      const footer = userVote ? `\n\n✅ _Your current vote: ${formatTime(userVote)}_` : '';
      const text = `🗳️ *Dinner Vote — What time tonight?*\n\nVoting closes at 7:30 PM. Tap your preferred time 👇${footer}`;

      const sent = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
      await storeMessageId(poll.date, String(chatId), sent.message_id);
      return;
    }

    if (action.startsWith('view_week_')) {
      const weekKey = action.replace('view_week_', '');
      const menuDoc = await getMenu(weekKey).catch(() => null);
      if (!menuDoc) return await bot.sendMessage(chatId, '⚠️ Menu data not found.');

      const keyboard = {
        inline_keyboard: [
          [{ text: '📥 Download PDF', callback_data: `download_pdf_${weekKey}` }],
          [
            { text: '🔙 Back to History', callback_data: 'history' },
            { text: '🏠 Home', callback_data: 'home' },
          ],
        ],
      };

      return await bot.sendMessage(chatId, `📅 *Week ${weekKey}*\n\n${formatFullMenu(menuDoc.data)}`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

    if (action === 'today') {
      const day = getDay(0);
      const weekKey = getWeekKey(getISTDate(0));
      const menuDoc = await getMenu(weekKey);
      const keyboard = await sendMainMenu(chatId, true);
      if (!menuDoc) return await bot.sendMessage(chatId, '⚠️ Menu not uploaded for this week yet.', { reply_markup: keyboard });
      return await bot.sendMessage(chatId, formatMenu(day, menuDoc.data), { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    if (action === 'tomorrow') {
      const day = getDay(1);
      const weekKey = getWeekKey(getISTDate(1));
      const menuDoc = await getMenu(weekKey);
      const keyboard = await sendMainMenu(chatId, true);
      if (!menuDoc) return await bot.sendMessage(chatId, '⚠️ Menu not uploaded for tomorrow yet.', { reply_markup: keyboard });
      return await bot.sendMessage(chatId, `📅 *Tomorrow*\n\n${formatMenu(day, menuDoc.data)}`, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    if (action === 'all') {
      const menuDoc = await getMenu();
      const currentWeekKey = getWeekKey(getISTDate(0));
      const isLatestArchive = menuDoc && menuDoc.weekKey !== currentWeekKey;
      const statusPrefix = isLatestArchive ? `⚠️ _Showing Latest Available Menu (Week ${menuDoc?.weekKey})_\n\n` : '';
      const keyboard = await sendMainMenu(chatId, true);
      return await bot.sendMessage(chatId, statusPrefix + formatFullMenu(menuDoc?.data), { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    if (action.startsWith('download_pdf')) {
      const parts = action.split('_');
      const targetWeek = parts.length > 2 ? parts.pop() : null;
      const doc = targetWeek ? await getMenu(targetWeek) : await getMenu();

      if (doc && doc.pdfBuffer) {
        const baseName = doc.weekKey ? `MasterChef_Menu_W${doc.weekKey}` : 'MasterChef_Menu';
        return await bot.sendDocument(chatId, doc.pdfBuffer, { caption: `📄 Weekly Menu (Week ${doc.weekKey || 'Latest'})` }, { filename: baseName });
      } else {
        return await bot.sendMessage(chatId, '⚠️ No PDF menu available to download for this week.');
      }
    }

    if (action === 'on') {
      await User.updateOne({ chatId: String(chatId) }, { reminders: true }, { upsert: true });
      const keyboard = await sendMainMenu(chatId, true);
      return await bot.sendMessage(chatId, '🔔 Notifications turned ON!', { reply_markup: keyboard });
    }

    if (action === 'off') {
      await User.updateOne({ chatId: String(chatId) }, { reminders: false }, { upsert: true });
      const keyboard = await sendMainMenu(chatId, true);
      return await bot.sendMessage(chatId, '🔕 Notifications turned OFF', { reply_markup: keyboard });
    }

    if (action === 'settings') {
      const user = await User.findOne({ chatId: String(chatId) });
      const timing = user?.timing;
      const breakfastTime = timing?.breakfast || '07:30';
      const lunchTime = timing?.lunch || '11:00';
      const dinnerTime = timing?.dinner || '20:00';

      const keyboard = {
        inline_keyboard: [
          [{ text: `🌅 Breakfast (${breakfastTime})`, callback_data: 'set_breakfast' }],
          [{ text: `🍛 Lunch (${lunchTime})`, callback_data: 'set_lunch' }],
          [{ text: `🍽️ Dinner (${dinnerTime})`, callback_data: 'set_dinner' }],
          [{ text: '🏠 Home', callback_data: 'home' }],
        ],
      };
      return await bot.sendMessage(chatId, `⚙️ *Notification Settings*\n\nYour current notification timings are:\n- Breakfast: ${breakfastTime}\n- Lunch: ${lunchTime}\n- Dinner: ${dinnerTime}\n\nClick a button below to change the time.`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

    if (action.startsWith('set_')) {
      const mealType = action.replace('set_', '');
      pendingTimeUpdates.set(chatId, { mealType, timestamp: Date.now() });
      return await bot.sendMessage(chatId, `⏳ Please send the new time for *${mealType.charAt(0).toUpperCase() + mealType.slice(1)}* in \`HH:MM\` format (24-hour clock, e.g., \`07:30\` or \`19:00\`).`, { parse_mode: 'Markdown' });
    }

    if (action === 'announcements') {
      const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(10);
      if (announcements.length === 0) {
        return await bot.sendMessage(chatId, '📭 *No announcements yet.* Check back later!', { parse_mode: 'Markdown' });
      }

      let text = '📢 *Recent Announcements*\n\n';
      announcements.forEach((ann, idx) => {
        const date = new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        text += `${idx + 1}. *[${date}]* ${ann.message}\n\n`;
      });

      return await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🏠 Home', callback_data: 'home' }]] } });
    }

    if (action === 'widget_url') {
      const url = `https://masterchefind-bot.onrender.com/api/next-meal?chatId=${chatId}`;
      const text = `📱 *Personalized Widget URL*\n\nHere is your unique API endpoint for iOS Shortcuts or Android widgets. It is securely linked to your account and uses your custom meal notification timings!\n\n\`${url}\`\n\n_Tap the link above to copy it._`;
      const keyboard = await sendMainMenu(chatId, true);
      return await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  });

  // Document Upload (PDF / Image documents)
  bot.on('document', async (msg: TelegramMessage) => {
    const chatId = msg.chat.id;
    if (!msg.document) return;
    const fileName = msg.document.file_name || '';
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpe?g|png|webp|heic)$/i.test(fileName) || Boolean(msg.document.mime_type && msg.document.mime_type.startsWith('image/'));

    if (!isPDF && !isImage) {
      return await bot.sendMessage(chatId, '⚠️ Please upload a PDF or image file (JPG, PNG).');
    }

    await bot.sendMessage(chatId, '🛡️ *Security Check*: Please send the **Admin Password** to authorize this menu update.', { parse_mode: 'Markdown' });

    try {
      const fileUrl = await bot.getFileLink(msg.document.file_id);
      const res = await axios.get(fileUrl, { responseType: 'arraybuffer' });

      pendingUploads.set(chatId, {
        buffer: Buffer.from(res.data),
        fileName: msg.document.file_name || (isPDF ? 'menu.pdf' : 'menu.jpg'),
        contentType: msg.document.mime_type || (isPDF ? 'application/pdf' : 'image/jpeg'),
        timestamp: Date.now(),
      });

      // Cleanup pending after 2 minutes
      setTimeout(() => {
        if (pendingUploads.has(chatId)) {
          pendingUploads.delete(chatId);
        }
      }, 120000);

    } catch (err: unknown) {
      console.error(err);
      await bot.sendMessage(chatId, '❌ Internal error during security setup.');
    }
  });

  // Photo Upload (Direct photo snaps / screenshots)
  bot.on('photo', async (msg: TelegramMessage) => {
    const chatId = msg.chat.id;
    if (!msg.photo || msg.photo.length === 0) return;

    const bestPhoto = msg.photo[msg.photo.length - 1];
    if (!bestPhoto) return;

    await bot.sendMessage(chatId, '🛡️ *Security Check*: Please send the **Admin Password** to authorize this menu update.', { parse_mode: 'Markdown' });

    try {
      const fileUrl = await bot.getFileLink(bestPhoto.file_id);
      const res = await axios.get(fileUrl, { responseType: 'arraybuffer' });

      pendingUploads.set(chatId, {
        buffer: Buffer.from(res.data),
        fileName: `menu_${Date.now()}.jpg`,
        contentType: 'image/jpeg',
        timestamp: Date.now(),
      });

      setTimeout(() => {
        if (pendingUploads.has(chatId)) {
          pendingUploads.delete(chatId);
        }
      }, 120000);

    } catch (err: unknown) {
      console.error(err);
      await bot.sendMessage(chatId, '❌ Internal error during security setup.');
    }
  });

  bot.onText(/\/today/, async (msg: TelegramMessage) => {
    const weekKey = getWeekKey(getISTDate(0));
    const menuDoc = await getMenu(weekKey);
    const keyboard = await sendMainMenu(msg.chat.id, true);
    if (!menuDoc) return await bot.sendMessage(msg.chat.id, '⚠️ Menu not uploaded for this week yet.', { reply_markup: keyboard });
    await bot.sendMessage(msg.chat.id, formatMenu(getDay(0), menuDoc.data), { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.onText(/\/tomorrow/, async (msg: TelegramMessage) => {
    const weekKey = getWeekKey(getISTDate(1));
    const menuDoc = await getMenu(weekKey);
    const keyboard = await sendMainMenu(msg.chat.id, true);
    if (!menuDoc) return await bot.sendMessage(msg.chat.id, '⚠️ Menu not uploaded for tomorrow yet.', { reply_markup: keyboard });
    const day = getDay(1);
    await bot.sendMessage(msg.chat.id, `📅 Tomorrow\n\n${formatMenu(day, menuDoc.data)}`, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.onText(/\/all/, async (msg: TelegramMessage) => {
    const menuDoc = await getMenu();
    const currentWeekKey = getWeekKey(getISTDate(0));
    const isLatestArchive = menuDoc && menuDoc.weekKey !== currentWeekKey;
    const statusPrefix = isLatestArchive ? `⚠️ _Showing Latest Available Menu (Week ${menuDoc?.weekKey})_\n\n` : '';
    const keyboard = await sendMainMenu(msg.chat.id, true);
    await bot.sendMessage(msg.chat.id, statusPrefix + formatFullMenu(menuDoc?.data), { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  bot.onText(/\/on/, async (msg: TelegramMessage) => {
    await User.updateOne({ chatId: String(msg.chat.id) }, { reminders: true }, { upsert: true });
    const keyboard = await sendMainMenu(msg.chat.id, true);
    await bot.sendMessage(msg.chat.id, '🔔 Notifications turned ON!', { reply_markup: keyboard });
  });

  bot.onText(/\/off/, async (msg: TelegramMessage) => {
    await User.updateOne({ chatId: String(msg.chat.id) }, { reminders: false }, { upsert: true });
    const keyboard = await sendMainMenu(msg.chat.id, true);
    await bot.sendMessage(msg.chat.id, '🔕 Notifications turned OFF', { reply_markup: keyboard });
  });

  bot.onText(/\/settings/, async (msg: TelegramMessage) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ chatId: String(chatId) });
    const timing = user?.timing;
    const breakfastTime = timing?.breakfast || '07:30';
    const lunchTime = timing?.lunch || '11:00';
    const dinnerTime = timing?.dinner || '20:00';

    const keyboard = {
      inline_keyboard: [
        [{ text: `🌅 Breakfast (${breakfastTime})`, callback_data: 'set_breakfast' }],
        [{ text: `🍛 Lunch (${lunchTime})`, callback_data: 'set_lunch' }],
        [{ text: `🍽️ Dinner (${dinnerTime})`, callback_data: 'set_dinner' }],
        [{ text: '🏠 Home', callback_data: 'home' }],
      ],
    };
    await bot.sendMessage(chatId, `⚙️ *Notification Settings*\n\nYour current notification timings are:\n- Breakfast: ${breakfastTime}\n- Lunch: ${lunchTime}\n- Dinner: ${dinnerTime}\n\nClick a button below to change the time.`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  bot.onText(/\/announcements/, async (msg: TelegramMessage) => {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(10);
    if (announcements.length === 0) {
      return await bot.sendMessage(msg.chat.id, '📭 *No announcements yet.*', { parse_mode: 'Markdown' });
    }

    let text = '📢 *Recent Announcements*\n\n';
    announcements.forEach((ann, idx) => {
      const date = new Date(ann.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      text += `${idx + 1}. *[${date}]* ${ann.message}\n\n`;
    });

    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/widget/, async (msg: TelegramMessage) => {
    const chatId = msg.chat.id;
    const url = `https://masterchefind-bot.onrender.com/api/next-meal?chatId=${chatId}`;
    const text = `📱 *Personalized Widget URL*\n\nHere is your unique API endpoint for iOS Shortcuts or Android widgets. It is securely linked to your account and uses your custom meal notification timings!\n\n\`${url}\`\n\n_Tap the link above to copy it._`;
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/dinnerpoll/, async (msg: TelegramMessage) => {
    const chatId = msg.chat.id;
    await ensureUser(chatId);

    const existing = await getTodayPoll();
    if (existing && existing.status === 'closed') {
      return await bot.sendMessage(chatId, `📊 *Today's poll is already closed.*\n\n🏆 Dinner is at *${formatTime(existing.winningTime ?? '20:00')}* tonight!`, { parse_mode: 'Markdown' });
    }
    if (existing && existing.status === 'notified') {
      return await bot.sendMessage(chatId, `✅ *Tonight's dinner was at ${formatTime(existing.winningTime ?? '20:00')}.*\n\nSee you tomorrow!`, { parse_mode: 'Markdown' });
    }

    const poll = await getOrCreateTodayPoll();
    if (!poll) return;

    const votesObj: Record<string, string> = poll.votes instanceof Map 
      ? Object.fromEntries(poll.votes) 
      : (poll.votes as Record<string, string>);
    const userVote = votesObj[String(chatId)];

    const keyboard = buildPollKeyboard(votesObj);
    const footer = userVote ? `\n\n✅ _Your current vote: ${formatTime(userVote)}_` : '';
    const text = `🗳️ *Dinner Vote — What time tonight?*\n\nVoting closes at 7:30 PM. Tap your preferred time 👇${footer}`;

    const sent = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
    await storeMessageId(poll.date, String(chatId), sent.message_id);
  });

  console.log('🤖 Telegram Handlers initialized');
}
