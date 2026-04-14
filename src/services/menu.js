const { Menu } = require("./models");
const { getWeekKey } = require("./utils");

async function saveMenu(menu, pdfData = null, customWeekKey = null) {
  const weekKey = customWeekKey || getWeekKey();
  const update = { data: menu, weekKey };
  if (pdfData) {
    update.pdfBuffer = pdfData.buffer;
    update.fileName = pdfData.fileName;
    update.contentType = pdfData.contentType;
  }
  
  await Menu.findOneAndUpdate(
    { weekKey: weekKey },
    update,
    { upsert: true }
  );
  return weekKey;
}

async function getMenu(weekKey = null) {
  const query = weekKey ? { weekKey } : {};
  // If no weekKey, get the latest one by weekKey string sort
  return await Menu.findOne(query).sort({ weekKey: -1 });
}

async function deleteMenu(weekKey) {
  if (!weekKey) throw new Error("weekKey is required for deletion");
  return await Menu.findOneAndDelete({ weekKey });
}

async function getAvailableWeeks() {
  const weeks = await Menu.find({}, { weekKey: 1 }).sort({ weekKey: -1 });
  return weeks.map(w => w.weekKey);
}

module.exports = { saveMenu, getMenu, deleteMenu, getAvailableWeeks };
