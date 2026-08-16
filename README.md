# 👨‍🍳 MasterChef Logistics Dashboard
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/BrijeshJagad/MasterChefInd-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **production-grade canteen management ecosystem** featuring a high-fidelity web dashboard and an integrated Telegram bot. Built for scale, security, and a premium user experience.

---

## 🚀 Key Features

### 💎 Ultimate Dashboard V8.0
*   **Modern Aesthetics**: Glassmorphism 3.0 icons, smooth transitions, and a curated deep-slate dark mode.
*   **Fully Responsive**: PWA-ready layout that adapts perfectly from mobile devices to desktop monitors.
*   **Interactive History**: Navigate through all historical menu data with a persistent sidebar.
*   **Admin Tools**: Full suite of live-edit controls, smart forms, and drag-and-drop PDF ingestion protected by JWT authentication.
*   **One-Click Export**: Download any weekly menu as a professional PDF or raw JSON data.

### 🤖 Intelligent Telegram Bot
*   **Document Parsing**: Automatically extracts menu data from floating-coordinate PDFs.
*   **Broadcast Ready**: Global Announcements system automatically pushes critical updates to registered users.
*   **Admin Controls**: Securely upload and manage menus directly via Telegram.
*   **Personalized Routing**: Set precise individual timing configurations (HH:MM) to receive menu alerts dynamically.

### 🛠️ Robust APIs & Integrations
*   **Strict IST Enforcement**: Native Indian Standard Time (IST) offset computation ensures daily menu turnovers are pinpoint accurate regardless of server locale.
*   **Next Meal Endpoint (`/api/next-meal`)**: Provides contextual real-time data indicating the upcoming menu item. Highly compatible with **iOS Shortcuts** and Siri ("Hey Siri, what's for dinner?").
*   **Historical Data (`/api/all-weeks-data`)**: Open REST endpoint for retrieving all menu history instantly in lightweight JSON.

### 🛡️ Hardened Backend
*   **Unified Server**: Orchestrates Next.js, Express, and Telegram Polling in a single high-performance process.
*   **Security First**: Integrated with `helmet` for headers, `express-rate-limit` for API protection, and password-validated admin routes.
*   **Weekly Indexing**: Robust `YYYYWW` indexing system ensures bulletproof data retrieval without cross-week bleeding.

---

### 🌐 Offline & Progressive Web App (PWA)
*   **Dual-Layer Offline Caching**: Instantly loads cached menu records and available weeks from browser storage when disconnected or on unstable networks.
*   **Service Worker Fallback**: Seamless asset caching (`sw.js`) and Web App Manifest (`manifest.json`) enabling one-click "Add to Home Screen" on Android, iOS, and Desktop Chrome/Edge.

### 📱 Multi-Platform & Native Packaging
*   **Android App (APK)**: Capacitor-powered native Android shell.
*   **iOS App**: Native Xcode project generated via Capacitor.
*   **Windows Desktop App (`.exe`)**: Standalone Electron desktop executable with offline fallback.
*   **CI/CD Automated Builds**: Pre-configured GitHub Actions workflow (`.github/workflows/build-apps.yml`) building APKs, `.exe`, and iOS archives on every push or workflow trigger.

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, Next.js (App Router, Static Export), Material UI 6+, Glassmorphism UI
*   **Offline / PWA**: Service Worker API, LocalStorage Cache, Web App Manifest
*   **Desktop & Mobile**: Electron, Capacitor (Android & iOS)
*   **Backend**: Node.js, Express, Next.js Unified Routing
*   **Bot**: `node-telegram-bot-api`
*   **Database**: MongoDB (Mongoose)
*   **Security**: Rate-Limiting, Helmet, JWT Authentication

---

## 📥 Getting Started

### 1. Installation
```bash
git clone https://github.com/BrijeshJagad/MasterChefInd-bot.git
cd MasterChefInd-bot
npm install
```

### 2. Configuration
Create a `.env` file in the root directory:
```env
BOT_TOKEN=your_telegram_bot_token
MONGO_URI=your_mongodb_connection_string
ADMIN_PASSWORD=your_secure_upload_password
PORT=3000
NEXT_PUBLIC_API_URL=https://masterchefind-bot.onrender.com
```

### 3. Local Development
```bash
# Start unified full-stack server
npm run dev

# Run standalone Electron Desktop app
npm run desktop
```

---

## 📦 Incremental Releases & Downloads

Every push to `main` automatically builds and publishes an official **GitHub Release** with incremental version tags (`v1.{buildNumber}`):

### Available Release Assets:
* 🤖 **Android**: `masterchef-v1.{version}.apk` (Direct install on Android devices)
* 🪟 **Windows**: `masterchef-v1.{version}.exe` (Standalone Windows executable)
* 🍎 **iOS**: `masterchef-v1.{version}.zip` (iOS application package)

You can download the latest builds anytime directly from the **[Releases](https://github.com/BrijeshJagad/MasterChefInd-bot/releases)** tab on the repository page!

---

## 📲 Local Build Instructions

### Android (APK)
```bash
# 1. Build frontend static files
npm run build

# 2. Sync to Android and launch in Android Studio
npm install --save-dev @capacitor/cli @capacitor/core @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```

### Windows Desktop (`.exe`)
```bash
# 1. Build frontend
npm run build

# 2. Package into Windows Executable
npx electron-builder --win --x64 -c.extraMetadata.main=electron/main.js -c.directories.output=dist-electron
```

### iOS (Xcode)
```bash
# 1. Build frontend
npm run build

# 2. Sync to iOS and launch Xcode (macOS required)
npm install --save-dev @capacitor/cli @capacitor/core @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

---

## 👤 Maintainers

**Brijesh Jagad**  
[![LinkedIn](https://img.shields.io/badge/-LinkedIn-blue?style=flat&logo=linkedin)](https://in.linkedin.com/in/brijesh-jagad)
[![GitHub](https://img.shields.io/badge/-GitHub-black?style=flat&logo=github)](https://github.com/BrijeshJagad)

**Urva Suthar**  
[![LinkedIn](https://img.shields.io/badge/-LinkedIn-blue?style=flat&logo=linkedin)](https://in.linkedin.com/in/urva-suthar)
[![GitHub](https://img.shields.io/badge/-GitHub-black?style=flat&logo=github)](https://github.com/UrvaSuthar)

---
Built with the **BMAD Method** for high-velocity, high-quality development.
