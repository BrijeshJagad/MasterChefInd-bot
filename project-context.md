# Project Context: MasterChefInd-bot

## 1. Overview
A Telegram-based canteen menu automation bot for students and employees, which parses PDF menus and sends daily reminders in the IST timezone.

## 2. Tech Stack
- **Language**: Node.js (CommonJS)
- **Library**: `node-telegram-bot-api`
- **Database**: MongoDB (via `mongoose`)
- **Server**: `express` (for health monitoring/dummy server)
- **Scheduling**: `node-cron`
- **PDF Extraction**: `pdf2json`

## 3. Core Architecture
- **`bot.js`**: Orchestrates everything, including the Telegram bot instance, MongoDB connection, health server, and cron jobs.
- **`parser.js`**: Contains the logic to extract and build a structured menu from a PDF.
- **Database Collections**:
  - `User`: `{ chatId: String, reminders: Boolean }`
  - `Menu`: `{ weekId: String, data: Object }`

## 4. Key Patterns & Rules
- **Timezone**: All operations (including dates and schedules) use the `Asia/Kolkata` (IST) timezone.
- **Menu Identifier**: `weekId` is formatted as `YYYY-MM-DD` for the current week's menu.
- **Telegram Interaction**: Uses both `bot.onText` (slash commands) and `bot.on("callback_query")` for inline buttons.
- **Environment**: Sensitive data (`BOT_TOKEN`, `MONGO_URI`) is stored in `.env`.

## 5. Development Guidelines
- Always ensure new features are compatible with the IST-based cron schedules.
- Maintain existing code modularity by separating parsing logic (`parser.js`) from bot logic (`bot.js`).
- Use Markdown formatting for Telegram messages to maintain clean and readable output.
