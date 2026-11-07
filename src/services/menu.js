const { Menu } = require("./models");
const { getWeekKey } = require("./utils");

async function saveMenu(menu, pdfData = null, customWeekKey = null) {
  const safeWeekKey = typeof customWeekKey === "string" ? customWeekKey : getWeekKey();
  const setData = {
    data: menu,
    weekKey: String(safeWeekKey)
  };
  if (pdfData) {
    if (pdfData.buffer) setData.pdfBuffer = pdfData.buffer;
    if (pdfData.fileName) setData.fileName = String(pdfData.fileName);
    if (pdfData.contentType) setData.contentType = String(pdfData.contentType);
  }
  
  await Menu.findOneAndUpdate(
    { weekKey: { $eq: String(safeWeekKey) } },
    { $set: setData },
    { upsert: true }
  );
  return safeWeekKey;
}

async function getMenu(weekKey = null) {
  if (typeof weekKey === "string" && weekKey.trim() !== "") {
    return await Menu.findOne({ weekKey: { $eq: weekKey.trim() } });
  }
  return await Menu.findOne({}).sort({ weekKey: -1 });
}

async function deleteMenu(weekKey) {
  if (!weekKey || typeof weekKey !== "string") throw new Error("A valid string weekKey is required for deletion");
  return await Menu.findOneAndDelete({ weekKey: { $eq: String(weekKey) } });
}

async function getAvailableWeeks() {
  const weeks = await Menu.find({}, { weekKey: 1 }).sort({ weekKey: -1 });
  return weeks.map(w => w.weekKey);
}

module.exports = { saveMenu, getMenu, deleteMenu, getAvailableWeeks };
