# 👨‍🍳 MasterChef Logistics & Canteen Management Ecosystem v2.0
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/BrijeshJagad/MasterChefInd-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![BMAD Method](https://img.shields.io/badge/Framework-BMAD%20Method%20v6.3-blueviolet.svg)](docs/bmad-methodology.md)
[![OpenTelemetry](https://img.shields.io/badge/Observability-OpenTelemetry-blue.svg)](monitoring/OPENTELEMETRY_GUIDE.md)

A **production-grade canteen management and dining logistics ecosystem** featuring a high-fidelity web dashboard, an integrated Telegram bot, multi-engine AI vision OCR, real-time OpenTelemetry observability, and native cross-platform mobile and desktop applications. Fully modernized to strict **TypeScript/TSX** and enterprise **Material UI (MUI)** standards.

---

## 🚀 Key Features

### 💎 Ultimate Dashboard V2.0 & System Insights
*   **Modern Enterprise Aesthetic**: Benchmarked against premier SaaS design systems (Linear, Vercel, Minimals UI) with subtle neutral palettes, soft-drop shadows, and clean typography (`Plus Jakarta Sans` / `Inter`).
*   **Meal Slot Micro-Badges**: Replaced legacy harsh borders and raw emojis with clean outlined Material icons and subtle tinted micro-chips for Breakfast, Lunch, and Dinner.
*   **System Insights Explorer (`/insights`)**: Real-time telemetry monitoring dashboard displaying live process memory gauges (RSS, Heap, External), CPU metrics, uptime, user counts, and queryable event streams.
*   **Interactive Menu History**: Retroactively browse and view all historical weekly menus via a persistent sidebar drawer indexed by ISO calendar weeks (`YYYYWW`).
*   **Admin Management Suite**: Full management portal protected by Scrypt password hashing and JWT authorization for live menu edits, weekly creations, announcements, and JSON import/export.
*   **One-Click PDF & JSON Exports**: Download any weekly menu as a synthesized PDF poster (generated via PDFKit) or lightweight JSON data.

### 🤖 Intelligent Telegram Bot (v2.3 Modern Adapter)
*   **Modern Architecture**: Powered by `node-telegram-bot-api` v2.3.0 with a custom modern adapter pattern and legacy fallback.
*   **Instant Meal Ingestion**: Upload canteen menus directly in Telegram as PDF documents, photo snapshots (PNG, JPEG, WEBP), or camera images.
*   **Automated Dinner Voting Poll**: Automated 6:30 PM IST daily community dinner voting polls and 7:30 PM winner announcements (toggled via `ENABLE_REMINDERS`).
*   **Granular Reminders**: Automated daily alerts for Breakfast (07:30), Lunch (11:00), and Dinner (20:00) in Indian Standard Time (IST) with customizable individual reminder timings (`/timing`).
*   **Community Broadcasts**: Admin announcements pushed instantly to all registered users.

### 👁️ Resilient Triple-Tier OCR Engine
*   **Tier 1 — Instant Local PDF.js**: Coordinate-based cell extraction using Mozilla `pdfjs-dist` (<50ms, 0 API tokens consumed, 100% offline, immune to corrupt XRef stream headers and CVE-2024-4367).
*   **Tier 2 — Google Gemini Multimodal AI**: Uses `@google/genai` (Gemini 2.5 Flash, 2.0 Flash, 2.0 Flash Lite, 1.5 Flash) with strict JSON schema enforcement to parse complex scanned schedules and mobile photos.
*   **Tier 3 — Groq LPU Vision Fallback**: Ultra-low latency fallback using Groq's LPU (`llama-3.2-11b-vision-preview`) when external rate limits or network issues occur.
*   **Tier 4 — Heuristic Parser**: Coordinate grouping fallback via `pdf2json`.

### 🛡️ Hardened Security Architecture
*   **Scrypt Key Derivation**: Admin password authentication uses Node.js `crypto.scryptSync` with unique salts.
*   **Constant-Time Verification**: Compares password hashes using `crypto.timingSafeEqual` to eliminate side-channel timing attacks.
*   **NoSQL Injection Mitigation**: All week queries and user identifiers are strictly validated against regex filters (`/^\d{4,8}$/`).
*   **Defense-in-Depth**: Integrated with `helmet` for HTTP headers, `express-rate-limit` for DDoS protection, and path sanitization.

### 🔭 OpenTelemetry & Production Observability
*   **OTLP JSON Streaming**: Streams structured events (`http.request`, `telegram.message`, `dinner_poll.vote`, `menu.uploaded`, `gemini.ocr_success`) directly to free backends such as **Axiom** or **Grafana Cloud**.
*   **In-Memory Ring Buffer**: Maintains recent logs locally for immediate querying inside the `/insights` page.

### 🌐 Offline & Progressive Web App (PWA)
*   **Dual-Layer Caching**: Instant offline menu browsing backed by Service Workers (`sw.js`) and LocalStorage.
*   **Installable**: One-click "Add to Home Screen" on Android, iOS Safari, and Desktop Chrome/Edge.

### 📱 Multi-Platform Native Packaging
*   **Android App (`.apk`)**: Standalone Android application built via Capacitor.
*   **Windows Desktop (`.exe`)**: Desktop installer powered by Electron.
*   **iOS App (`.zip`)**: Native Xcode workspace and simulator package.
*   **Automated Releases**: GitHub Actions workflow (`.github/workflows/build-apps.yml`) compiling and releasing artifacts on every release.

---

## 🏛️ The BMAD Method Integration

This repository is built and maintained following the **BMAD Method** (Breakthrough Method for Agile AI Development).

```
_bmad/
├── _config/                # Manifests (agents, skills, files, and manifest.yaml)
├── bmm/                    # Breakthrough Method Module configuration & help
└── core/                   # BMAD Core engine parameters
_bmad-output/
├── planning-artifacts/     # Product briefs, solution designs, epics & stories
└── implementation-artifacts/ # Sprint status tracking and checkpoint logs
```

For detailed documentation on the BMAD methodology, agent profiles, and sprint workflows, see [BMAD Methodology Guide](docs/bmad-methodology.md).

---

## 🛠️ Tech Stack

*   **Language & Tooling**: 100% Strict TypeScript 5.7+ / TSX, `tsx`, `ts-jest`
*   **Frontend**: React 19.3, Next.js 16.4 (App Router), Material UI (MUI 9+), Emotion
*   **Backend**: Node.js 22+, Express 5.3, Next.js Custom Server
*   **Bot**: `node-telegram-bot-api` v2.3.0
*   **Vision & OCR**: Google Gen AI SDK (`@google/genai`), Groq Vision API, Mozilla PDF.js (`pdfjs-dist`), PDFKit
*   **Database**: MongoDB Atlas via `mongoose` 9.12+
*   **Observability**: OpenTelemetry (OTLP), Prometheus (`prom-client`), Custom Structured Logger
*   **Packaging**: Electron 44+, Capacitor 6+ (Android & iOS)
*   **Framework**: BMAD Method v6.3.0

---

## 📥 Getting Started

### 1. Installation
```bash
git clone https://github.com/BrijeshJagad/MasterChefInd-bot.git
cd MasterChefInd-bot
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
BOT_TOKEN=your_telegram_bot_token
MONGO_URI=your_mongodb_connection_string
ADMIN_PASSWORD=your_secure_admin_password
PORT=3000
NEXT_PUBLIC_API_URL=https://masterchefind-bot.onrender.com
GEMINI_API_KEY=your_google_gemini_api_key
GROQ_API_KEY=your_optional_groq_api_key
ENABLE_REMINDERS=true

# Optional: OpenTelemetry Streaming (e.g. Axiom or Grafana Cloud)
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.axiom.co/v1/logs
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer YOUR_AXIOM_TOKEN,X-Axiom-Dataset=masterchef
```

### 3. Local Execution & Type Verification
```bash
# Typecheck entire workspace (root backend + frontend)
npm run typecheck

# Run unit and API test suites (12/12 passing)
npm test

# Start unified full-stack server (Next.js + Express + Telegram Polling)
npm run dev

# Run standalone Electron Desktop app
npm run desktop
```

---

## 📖 REST API Overview

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check probe. |
| `/api/today` | `GET` | Today's menu in IST. |
| `/api/menu` | `GET` | Full menu breakdown for a specific week (`?week=YYYYWW`). |
| `/api/next-meal` | `GET` | Upcoming meal based on current IST time (iOS Shortcuts / Siri ready). |
| `/api/all-weeks-data`| `GET` | Historical JSON of all weekly menus. |
| `/api/download/pdf` | `GET` | Download menu PDF poster. |
| `/api/download/json`| `GET` | Export raw weekly JSON. |
| `/api/upload` | `POST` | Upload and parse new menu PDF or image *(Admin JWT required)*. |
| `/api/announcements`| `GET/POST`| Fetch or broadcast community announcements *(Admin JWT required for POST)*. |
| `/api/system/stats` | `GET` | Live process memory, CPU, and database stats. |
| `/api/system/logs` | `GET` | Query recent telemetry and action events. |

For complete request schemas, response formats, and curl snippets, refer to the [REST API Reference](docs/api-reference.md).

---

## 📲 Platform Build Instructions

### Android (`.apk`)
```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

### Windows Desktop (`.exe`)
```bash
npm run build
npx electron-builder --win --x64 --config electron-builder.json --publish never
```

### iOS (Xcode)
```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

---

## 📚 Documentation Index

- 📘 [Project Context & Rules](project-context.md)
- 🏛️ [BMAD Methodology Guide](docs/bmad-methodology.md)
- 📐 [System Architecture Blueprint](docs/architecture.md)
- 📑 [REST API Reference](docs/api-reference.md)
- 🍎 [Apple Shortcuts & Siri Guide](docs/apple-shortcuts.md)
- 📊 [Multi-Engine Parser Validation Report](docs/parser-validation-report.md)
- 🔭 [OpenTelemetry Logging Guide](monitoring/OPENTELEMETRY_GUIDE.md)
- 🛡️ [Security Policy & Vulnerability Reporting](SECURITY.md)
- 📜 [Changelog](CHANGELOG.md)

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
