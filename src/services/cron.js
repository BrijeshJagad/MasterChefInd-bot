const cron = require("node-cron");
const { User } = require("./models");
const { getMenu } = require("./menu");
const { getDay, formatMenu } = require("./utils");
const {
  getOrCreateTodayPoll,
  getTodayPoll,
  closePoll,
  markNotified,
  buildPollKeyboard,
  formatTime,
  storeMessageId
} = require("./dinnerPoll");

function initCron(bot) {
  // ── Per-minute: personal meal reminders + dinner poll reminder ──
  cron.schedule("* * * * *", async () => {
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" });
    const currentHHMM = now;

    const users = await User.find({ reminders: true });
    const menuDoc = await getMenu();
    if (!menuDoc || !menuDoc.data) return;
    const d = getDay(0);

    users.forEach(u => {
      const breakfastTime = u.timing?.breakfast || "07:30";
      const lunchTime = u.timing?.lunch || "11:00";
      const dinnerTime = u.timing?.dinner || "20:00";

      if (currentHHMM === breakfastTime) {
        bot.sendMessage(u.chatId, `🌅 *Breakfast (07:30 to 09:30)*\n\n${formatMenu(d, menuDoc.data)}`, { parse_mode: "Markdown" });
      } else if (currentHHMM === lunchTime) {
        bot.sendMessage(u.chatId, `🍛 *Lunch (11:00 to 14:00)*\n\n${menuDoc.data[d]?.lunch || "—"}`, { parse_mode: "Markdown" });
      } else if (currentHHMM === dinnerTime) {
        bot.sendMessage(u.chatId, `🍽️ *Dinner (20:00 to 22:00)*\n\n${menuDoc.data[d]?.dinner || "—"}`, { parse_mode: "Markdown" });
      }
    });

    // Fire dinner group reminder at the winning time
    const poll = await getTodayPoll();
    if (poll && poll.status === "closed" && poll.winningTime === currentHHMM) {
      const allUsers = await User.find({ reminders: true });
      const menuDinner = menuDoc.data[d]?.dinner || "—";
      const msg = `🍽️ *Dinner Time!* It's ${formatTime(poll.winningTime)} — time to head to the canteen!\n\n*Tonight:* ${menuDinner}`;
      for (const u of allUsers) {
        try {
          await bot.sendMessage(u.chatId, msg, { parse_mode: "Markdown" });
        } catch (err) {
          console.error(`Dinner reminder failed for ${u.chatId}:`, err.message);
        }
      }
      await markNotified();
    }
  }, { timezone: "Asia/Kolkata" });

  // ── 6:30 PM IST: Send daily dinner poll to all users ──
  cron.schedule("30 18 * * *", async () => {
    const users = await User.find({ reminders: true });
    if (users.length === 0) return;

    const poll = await getOrCreateTodayPoll();
    const keyboard = buildPollKeyboard({});
    const text = `🗳️ *Dinner Vote — What time tonight?*\n\nVoting closes at 7:30 PM. Tap your preferred time 👇`;

    for (const u of users) {
      try {
        const sent = await bot.sendMessage(u.chatId, text, { parse_mode: "Markdown", reply_markup: keyboard });
        await storeMessageId(poll.date, String(u.chatId), sent.message_id);
      } catch (err) {
        console.error(`Poll send failed for ${u.chatId}:`, err.message);
      }
    }
    console.log(`🗳️ Dinner poll sent to ${users.length} users`);
  }, { timezone: "Asia/Kolkata" });

  // ── 7:30 PM IST: Close poll and announce winner ──
  cron.schedule("30 19 * * *", async () => {
    const result = await closePoll();
    if (!result) return;

    const { winner, counts, totalVotes } = result;
    const users = await User.find({ reminders: true });

    const breakdown = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([t, v]) => `  ${formatTime(t)}: ${v} vote${v > 1 ? "s" : ""}`)
      .join("\n");

    const msg = totalVotes === 0
      ? `📊 *Dinner Poll Closed*\n\nNo votes cast today. Defaulting to *${formatTime(winner)}*.\n\n_You'll get a reminder at ${formatTime(winner)}!_`
      : `📊 *Dinner Poll Closed!*\n\n🏆 Tonight's dinner is at *${formatTime(winner)}*!\n\n*Results:*\n${breakdown}\n\n_See you at the canteen at ${formatTime(winner)}!_ 🍽️`;

    for (const u of users) {
      try {
        await bot.sendMessage(u.chatId, msg, { parse_mode: "Markdown" });
      } catch (err) {
        console.error(`Poll close announcement failed for ${u.chatId}:`, err.message);
      }
    }
    console.log(`📊 Dinner poll closed. Winner: ${winner} (${totalVotes} votes)`);
  }, { timezone: "Asia/Kolkata" });

  console.log("⏰ Cron jobs initialized (meal reminders + dinner poll)");
}

module.exports = { initCron };
