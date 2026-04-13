const mongoose = require("mongoose");

// ===== User Schema =====
const userSchema = new mongoose.Schema({
  chatId: String,
  reminders: { type: Boolean, default: true }
});
const User = mongoose.model("User", userSchema);

// ===== Menu Schema =====
const menuSchema = new mongoose.Schema({
  weekKey: { type: String, index: true },
  data: Object,
  pdfBuffer: Buffer,
  fileName: String,
  contentType: String
});
const Menu = mongoose.model("Menu", menuSchema);

module.exports = { User, Menu };
