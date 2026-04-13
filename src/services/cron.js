const cron = require("node-cron");
const { User } = require("./models");
const { getMenu } = require("./menu");
const { getDay, formatMenu } = require("./utils");

function initCron(bot) {
  async function sendToUsers(builder) {
    const users = await User.find({ reminders: true });
    const menuDoc = await getMenu();
    if (!menuDoc || !menuDoc.data) return;
    
    users.forEach(u => bot.sendMessage(u.chatId, builder(menuDoc.data)));
  }

  cron.schedule("0 7 * * *", async () => {
    const d = getDay(0);
    sendToUsers(m => `🌅 ${formatMenu(d, m)}`);
  }, { timezone: "Asia/Kolkata" });

  cron.schedule("0 11 * * *", async () => {
    const d = getDay(0);
    sendToUsers(m => `🍛 ${m[d]?.lunch || "—"}`);
  }, { timezone: "Asia/Kolkata" });

  cron.schedule("0 20 * * *", async () => {
    const d = getDay(0);
    sendToUsers(m => `🍽️ ${m[d]?.dinner || "—"}`);
  }, { timezone: "Asia/Kolkata" });

  console.log("⏰ Cron jobs initialized");
}

module.exports = { initCron };
