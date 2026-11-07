const { Menu } = require("./models");
const { getWeekKey } = require("./utils");

async function saveMenu(menu, pdfData = null, customWeekKey = null) {
  const safeWeekKey = typeof customWeekKey === "string" ? customWeekKey : getWeekKey();
  const update = { data: menu, weekKey: safeWeekKey };
  if (pdfData) {
    update.pdfBuffer = pdfData.buffer;
    update.fileName = pdfData.fileName;
    update.contentType = pdfData.contentType;
  }
  
  await Menu.findOneAndUpdate(
    { weekKey: { $eq: String(safeWeekKey) } },
    update,
    { upsert: true }
  );
  return safeWeekKey;
}

async function getMenu(weekKey = null) {
  const safeKey = typeof weekKey === "string" && weekKey.trim() !== "" ? weekKey.trim() : null;
  const query = safeKey ? { weekKey: { $eq: safeKey } } : {};
  return await Menu.findOne(query).sort({ weekKey: -1 });
}

async function deleteMenu(weekKey) {
  if (!weekKey || typeof weekKey !== "string") throw new Error("A valid string weekKey is required for deletion");
  return await Menu.findOneAndDelete({ weekKey: { $eq: weekKey } });
}

async function getAvailableWeeks() {
  const weeks = await Menu.find({}, { weekKey: 1 }).sort({ weekKey: -1 });
  return weeks.map(w => w.weekKey);
}

module.exports = { saveMenu, getMenu, deleteMenu, getAvailableWeeks };
