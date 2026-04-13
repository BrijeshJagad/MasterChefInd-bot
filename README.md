# MasterChefInd-bot 👨‍🍳

A powerful **Telegram-based canteen menu automation bot** designed for students and employees. It streamlines the process of checking daily menus, provides automated meal reminders, and allows administrators to update the entire week's schedule with a single PDF upload.

## 🚀 Features

- **Weekly Menu Persistence**: Upload the menu once per week! The bot intelligently indexes data by Monday's date, ensuring availability throughout the week.
- **Intelligent PDF Parsing**: Automatically extracts meals (Breakfast, Lunch, Dinner) from canteen menu PDFs.
- **Formatted Meal Summaries**: Clean, easy-to-read Markdown messages with the date clearly displayed in the header.
- **Automated Reminders (IST)**:
  - 🌅 **Breakfast**: 7:00 AM
  - 🍛 **Lunch**: 11:00 AM
  - 🍽️ **Dinner**: 8:00 PM
- **User Control**: Quick toggle Commands to turn reminders ON or OFF.

## 🛠️ Tech Stack

- **Node.js**: Main runtime.
- **Telegram Bot API**: Interaction layer.
- **MongoDB (Mongoose)**: Local and remote data persistence.
- **node-cron**: Reliable meal scheduling.
- **pdf2json**: High-fidelity PDF text extraction.
- **BMAD Method**: Integrated AI-driven project management framework.

## 📥 Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/BrijeshJagad/MasterChefInd-bot.git
   cd MasterChefInd-bot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   MONGO_URI=your_mongodb_connection_string
   PORT=3000
   ```

4. **Run the Bot**:
   ```bash
   npm start
   ```

## 📖 Usage

- `/start`: Initialize the bot and register for reminders.
- `/today`: Get the menu for the current day.
- `/tomorrow`: See what's cooking tomorrow.
- `/all`: View the full weekly menu at once.
- `/on` / `/off`: Manage your reminder notifications.
- **PDF Upload**: Simply send a PDF menu document to the bot to update the database for the current week.

---
Built with the **BMAD Method** for high-velocity, high-quality development.
