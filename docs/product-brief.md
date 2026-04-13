# Product Brief: MasterChefInd-bot

## 1. Vision & Goals
The **MasterChefInd-bot** is a Telegram-based canteen menu automation tool. Its primary mission is to simplify access to daily and weekly meal menus for students or employees, providing timely reminders and an automated way to update the menu via PDF uploads.

## 2. Target Audience
- **Students/Employees**: Who need to know the daily menu quickly.
- **Canteen Administrators**: Who want to update the menu by simply uploading the PDF menu provided by the catering service.

## 3. Core Features
- **Menu Retrieval**: Check "Today", "Tomorrow", or the "Full Week" menu via interactive buttons or commands.
- **Automated Reminders**: Daily notifications for Breakfast (7 AM), Lunch (11 AM), and Dinner (8 PM) in IST timezone.
- **PDF Parsing**: Automatically transform a canteen menu PDF into a structured menu stored in MongoDB.
- **Subscription Management**: Users can toggle reminders on or off.

## 4. Technical Overview
- **Platform**: Telegram (via `node-telegram-bot-api`).
- **Database**: MongoDB (via `mongoose`) for storing user preferences and weekly menu data.
- **Runtime**: Node.js with `express` for health monitoring and `node-cron` for scheduled tasks.
- **PDF Processing**: Uses `pdf2json` and custom parsing logic in `parser.js`.

## 5. Key User Flows
1. **First Time Set-up**: User starts the bot (`/start`), which registers them for reminders by default.
2. **Checking Menus**: User requests a menu via buttons; the bot fetches the data from MongoDB and formats it into a readable Markdown message.
3. **Menu Updates**: An administrator uploads a new PDF; the bot processes it and updates the `Menu` collection for the current week.
