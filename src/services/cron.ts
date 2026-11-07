import cron from 'node-cron';
import { User } from './models';
import { getMenu } from './menu';
import { getDay, formatMenu } from './utils';
import logger from './logger';
import {
  getOrCreateTodayPoll,
  getTodayPoll,
  closePoll,
  markNotified,
  buildPollKeyboard,
  formatTime,
  storeMessageId,
} from './dinnerPoll';
import { IDayMeals } from '../../types/common';

export interface TelegramBotLike {
  sendMessage: (
    chatId: number | string,
    text: string,
    options?: { parse_mode?: string; reply_markup?: unknown; [key: string]: unknown }
  ) => Promise<{ message_id: number; [key: string]: unknown }>;
}

export function initCron(bot: TelegramBotLike): void {
  const isDinnerPollEnabled = process.env['ENABLE_REMINDERS'] === 'true' || process.env['ENABLE_REMINDERS'] === '1';

  // ── Per-minute: personal meal reminders (always active) + winning dinner reminder (if enabled) ──
  cron.schedule('* * * * *', async () => {
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
    const currentHHMM = now;

    const users = await User.find({ reminders: true });
    const menuDoc = await getMenu();
    if (!menuDoc || !menuDoc.data) return;
    const d = getDay(0);
    const dayData: IDayMeals | undefined = menuDoc.data[d];

    // 1. Send personal meal reminders (Breakfast / Lunch / Dinner)
    users.forEach(u => {
      const breakfastTime = u.timing?.breakfast || '07:30';
      const lunchTime = u.timing?.lunch || '11:00';
      const dinnerTime = u.timing?.dinner || '20:00';

      let mealType: string | null = null;
      let text = '';

      if (currentHHMM === breakfastTime) {
        mealType = 'breakfast';
        text = `🌅 *Breakfast (07:30 to 09:30)*\n\n${formatMenu(d, menuDoc.data)}`;
      } else if (currentHHMM === lunchTime) {
        mealType = 'lunch';
        text = `🍛 *Lunch (11:00 to 14:00)*\n\n${dayData?.lunch || '—'}`;
      } else if (currentHHMM === dinnerTime) {
        mealType = 'dinner';
        text = `🍽️ *Dinner (20:00 to 22:00)*\n\n${dayData?.dinner || '—'}`;
      }

      if (mealType && text) {
        bot.sendMessage(u.chatId, text, { parse_mode: 'Markdown' }).then(() => {
          logger.info('cron.meal_reminder_sent', `Sent ${mealType} reminder to user ${u.chatId}`, {
            action: 'cron.meal_reminder_sent',
            chatId: u.chatId,
            mealType,
            scheduledTime: currentHHMM,
          });
        }).catch((err: Error) => {
          logger.warn('cron.meal_reminder_failed', `Failed sending ${mealType} reminder to ${u.chatId}: ${err.message}`, {
            error: err,
            chatId: u.chatId,
            mealType,
          });
        });
      }
    });

    // 2. Fire dinner group reminder at the winning vote time (if ENABLE_REMINDERS is on)
    if (isDinnerPollEnabled) {
      const poll = await getTodayPoll();
      if (poll && poll.status === 'closed' && poll.winningTime === currentHHMM) {
        const allUsers = await User.find({ reminders: true });
        const menuDinner = dayData?.dinner || '—';
        const msg = `🍽️ *Dinner Time!* It's ${formatTime(poll.winningTime)} — time to head to the canteen!\n\n*Tonight:* ${menuDinner}`;
        let sentCount = 0;
        for (const u of allUsers) {
          try {
            await bot.sendMessage(u.chatId, msg, { parse_mode: 'Markdown' });
            sentCount++;
          } catch (err: unknown) {
            const errObj = err as Error;
            logger.warn('cron.dinner_reminder_failed', `Dinner reminder failed for ${u.chatId}: ${errObj.message}`, { error: errObj, chatId: u.chatId });
          }
        }
        await markNotified();
        logger.info('cron.group_dinner_notified', `Dispatched group dinner alert to ${sentCount} users`, {
          action: 'cron.group_dinner_notified',
          winningTime: poll.winningTime,
          recipients: sentCount,
        });
      }
    }
  }, { timezone: 'Asia/Kolkata' });

  // ── If ENABLE_REMINDERS is ON: Schedule Daily Dinner Poll & Result Announcer ──
  if (isDinnerPollEnabled) {
    // ── 6:30 PM IST: Send daily dinner poll to all users ──
    cron.schedule('30 18 * * *', async () => {
      const users = await User.find({ reminders: true });
      if (users.length === 0) return;

      const poll = await getOrCreateTodayPoll();
      if (!poll) return;

      const keyboard = buildPollKeyboard({});
      const text = `🗳️ *Dinner Vote — What time tonight?*\n\nVoting closes at 7:30 PM. Tap your preferred time 👇`;

      let sentCount = 0;
      for (const u of users) {
        try {
          const sent = await bot.sendMessage(u.chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
          await storeMessageId(poll.date, String(u.chatId), sent.message_id);
          sentCount++;
        } catch (err: unknown) {
          const errObj = err as Error;
          logger.warn('cron.poll_send_failed', `Poll send failed for ${u.chatId}: ${errObj.message}`, { error: errObj, chatId: u.chatId });
        }
      }
      logger.info('cron.dinner_poll_broadcast', `Dinner voting poll dispatched to ${sentCount} active subscribers`, {
        action: 'cron.dinner_poll_broadcast',
        recipients: sentCount,
        date: poll.date,
      });
    }, { timezone: 'Asia/Kolkata' });

    // ── 7:30 PM IST: Close poll and announce winner ──
    cron.schedule('30 19 * * *', async () => {
      const result = await closePoll();
      if (!result) return;

      const { winner, counts, totalVotes } = result;
      const users = await User.find({ reminders: true });

      const breakdown = Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([t, v]) => `  ${formatTime(t)}: ${v} vote${v > 1 ? 's' : ''}`)
        .join('\n');

      const msg = totalVotes === 0
        ? `📊 *Dinner Poll Closed*\n\nNo votes cast today. Defaulting to *${formatTime(winner)}*.\n\n_You'll get a reminder at ${formatTime(winner)}!_`
        : `📊 *Dinner Poll Closed!*\n\n🏆 Tonight's dinner is at *${formatTime(winner)}*!\n\n*Results:*\n${breakdown}\n\n_See you at the canteen at ${formatTime(winner)}!_ 🍽️`;

      let sentCount = 0;
      for (const u of users) {
        try {
          await bot.sendMessage(u.chatId, msg, { parse_mode: 'Markdown' });
          sentCount++;
        } catch (err: unknown) {
          const errObj = err as Error;
          logger.warn('cron.poll_result_failed', `Poll close announcement failed for ${u.chatId}: ${errObj.message}`, { error: errObj, chatId: u.chatId });
        }
      }
      logger.info('cron.poll_winner_broadcast', `Announced dinner poll winner ${winner} (${totalVotes} votes) to ${sentCount} users`, {
        action: 'cron.poll_winner_broadcast',
        winner,
        totalVotes,
        sentCount,
      });
    }, { timezone: 'Asia/Kolkata' });

    logger.info('cron.init', 'Cron jobs initialized (Daily meal reminders + Dinner poll ENABLED)');
  } else {
    logger.info('cron.init', 'Cron jobs initialized (Daily meal reminders ACTIVE | Dinner poll DISABLED)');
  }
}
