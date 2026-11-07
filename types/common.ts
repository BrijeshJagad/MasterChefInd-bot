import { Document, Types } from 'mongoose';

// -------------------------------------------------------------
// Meal and Menu Domain Types
// -------------------------------------------------------------
export interface IDayMeals {
  date?: string;     // Format: "DD/MM" or "DD-MM"
  breakfast: string; // Dish list or "—" or "❌ OFF"
  lunch: string;
  dinner: string;
}

export type WeeklyMenuData = Record<string, IDayMeals>;

export interface IMenu {
  weekKey: string;   // Format: "YYYYWW" e.g. "202616"
  data: WeeklyMenuData;
  pdfBuffer?: Buffer;
  fileName?: string;
  contentType?: string;
}

export type MenuDocument = Document<Types.ObjectId, {}, IMenu> & IMenu;

// -------------------------------------------------------------
// User & Notification Settings Domain Types
// -------------------------------------------------------------
export interface IUserTimings {
  breakfast: string; // Format: "HH:MM" e.g. "07:30"
  lunch: string;     // Format: "HH:MM" e.g. "11:00"
  dinner: string;    // Format: "HH:MM" e.g. "20:00"
}

export interface IUser {
  chatId: string;
  reminders: boolean;
  timing: IUserTimings;
}

export type UserDocument = Document<Types.ObjectId, {}, IUser> & IUser;

// -------------------------------------------------------------
// Announcement Domain Types
// -------------------------------------------------------------
export interface IAnnouncement {
  message: string;
  createdAt: Date;
}

export type AnnouncementDocument = Document<Types.ObjectId, {}, IAnnouncement> & IAnnouncement;

// -------------------------------------------------------------
// Dinner Poll Domain Types
// -------------------------------------------------------------
export type PollStatus = 'open' | 'closed' | 'notified';

export interface IDinnerPoll {
  date: string; // Format: "YYYY-MM-DD"
  votes: Map<string, string> | Record<string, string>; // chatId -> HH:MM
  messageIds: Map<string, number> | Record<string, number>; // chatId -> messageId
  status: PollStatus;
  winningTime?: string;
}

export type DinnerPollDocument = Document<Types.ObjectId, {}, IDinnerPoll> & IDinnerPoll;

// -------------------------------------------------------------
// Telemetry & Structured Logging Domain Types
// -------------------------------------------------------------
export type LogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface ILogPayload {
  timestamp: string;
  severity: LogSeverity;
  action: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  chatId?: string | number;
  votedTime?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  model?: string;
  weekKey?: string;
  [key: string]: unknown;
}

export interface IRecentLogsFilter {
  severity?: LogSeverity;
  action?: string;
  chatId?: string;
  limit?: number;
}

// -------------------------------------------------------------
// REST API DTOs
// -------------------------------------------------------------
export interface ApiResponseSuccess<T = unknown> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

export interface ApiResponseError {
  error: string;
  message?: string;
}

export interface AdminJwtPayload {
  role: 'admin';
  iat?: number;
  exp?: number;
}

// -------------------------------------------------------------
// Telegram Bot & Admin Ingestion Session Types
// -------------------------------------------------------------
export interface PendingUploadSession {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  timestamp: number;
}
