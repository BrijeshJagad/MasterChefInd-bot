import mongoose, { Schema, Model } from 'mongoose';
import { IUser, IMenu, IAnnouncement, IDinnerPoll } from '../../types/common';

// ===== User Schema =====
const userSchema = new Schema<IUser>({
  chatId: { type: String, required: true },
  reminders: { type: Boolean, default: true },
  timing: {
    breakfast: { type: String, default: '07:30' },
    lunch: { type: String, default: '11:00' },
    dinner: { type: String, default: '20:00' },
  },
});
export const User: Model<IUser> = mongoose.models['User'] || mongoose.model<IUser>('User', userSchema);

// ===== Menu Schema =====
const menuSchema = new Schema<IMenu>({
  weekKey: { type: String, index: true, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  pdfBuffer: { type: Buffer },
  fileName: { type: String },
  contentType: { type: String },
});
export const Menu: Model<IMenu> = mongoose.models['Menu'] || mongoose.model<IMenu>('Menu', menuSchema);

// ===== Announcement Schema =====
const announcementSchema = new Schema<IAnnouncement>({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
export const Announcement: Model<IAnnouncement> = mongoose.models['Announcement'] || mongoose.model<IAnnouncement>('Announcement', announcementSchema);

// ===== Dinner Poll Schema =====
const dinnerPollSchema = new Schema<IDinnerPoll>({
  date: { type: String, unique: true, required: true }, // YYYY-MM-DD IST
  votes: { type: Map, of: String, default: () => new Map() }, // chatId -> HH:MM
  messageIds: { type: Map, of: Number, default: () => new Map() }, // chatId -> messageId for live editing
  status: { type: String, default: 'open' }, // open | closed | notified
  winningTime: { type: String },
});
export const DinnerPoll: Model<IDinnerPoll> = mongoose.models['DinnerPoll'] || mongoose.model<IDinnerPoll>('DinnerPoll', dinnerPollSchema);
