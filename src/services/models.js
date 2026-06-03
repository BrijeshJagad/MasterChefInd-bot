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

// ===== Dinner Poll Schema =====
const dinnerPollSchema = new mongoose.Schema({
  date: { type: String, unique: true },       // YYYY-MM-DD IST
  votes: { type: Map, of: String, default: {} },      // chatId -> HH:MM
  messageIds: { type: Map, of: Number, default: {} }, // chatId -> messageId for live editing
  status: { type: String, default: "open" },  // open | closed | notified
  winningTime: String
});
const DinnerPoll = mongoose.model("DinnerPoll", dinnerPollSchema);

module.exports = { User, Menu, Announcement, DinnerPoll };
