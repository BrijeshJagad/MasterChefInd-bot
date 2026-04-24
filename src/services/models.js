const mongoose = require("mongoose");

// ===== User Schema =====
const userSchema = new mongoose.Schema({
  chatId: String,
  reminders: { type: Boolean, default: true },
  timing: {
    breakfast: { type: String, default: "07:30" },
    lunch: { type: String, default: "11:00" },
    dinner: { type: String, default: "20:00" }
  }
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

// ===== Announcement Schema =====
const announcementSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model("Announcement", announcementSchema);

module.exports = { User, Menu, Announcement };
