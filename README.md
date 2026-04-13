# MasterChefInd-bot 👨‍🍳

A powerful **Telegram-based canteen menu automation bot** designed for students and employees. It streamlines the process of checking daily menus, provides automated meal reminders, and allows administrators to update the entire week's schedule with a single PDF upload.

- **Personalized Interactivity**: Smart greeting by name and a persistent, "one-tap" interactive menu following every response.
- **Smart Reminder Toggle**: A dynamic UI that switches between "Turn ON" and "Turn OFF" based on your current preference.
- **Web Menu Viewer**: A minimalist, mobile-first website to view today's menu in any browser.
- **Apple Shortcuts API**: Deep system integration via JSON endpoints, allowing menu checks via Siri or iPhone widgets.

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

- `/start`: Personalized onboarding and main menu access.
- `/today`: Get the menu for the current day with a persistent interactive menu.
- `/tomorrow`: See what's cooking tomorrow.
- `/all`: View the full weekly menu in the minimalist style.
- `/on` / `/off`: Manage reminders with simple toggle buttons.
- **Web Menu**: Visit your bot's root URL to view the live, minimalist menu.
- **Apple Shortcuts**: Use the `/api/today` endpoint to integrate with iOS. (See [Apple Shortcuts Guide](docs/apple-shortcuts.md)).
- **PDF Upload**: Send any PDF menu to the bot for instant weekly processing.

---
Built with the **BMAD Method** for high-velocity, high-quality development.
