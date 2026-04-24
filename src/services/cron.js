const cron = require("node-cron");
const { User } = require("./models");
const { getMenu } = require("./menu");
const { getDay, formatMenu } = require("./utils");

function initCron(bot) {
  cron.schedule("* * * * *", async () => {
    // Get current time in HH:MM format for Asia/Kolkata
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" });
    const currentHHMM = now;

    // We fetch users here who have reminders turned on. Then we check their specific timings.
    const users = await User.find({ reminders: true });
    const menuDoc = await getMenu();
    if (!menuDoc || !menuDoc.data) return;
    
    const d = getDay(0);

    users.forEach(u => {
      // For legacy DB docs without timings, provide defaults fallback to match what models.js gives
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

  }, { timezone: "Asia/Kolkata" });

  console.log("⏰ Cron jobs initialized (Running every minute)");
}

module.exports = { initCron };
