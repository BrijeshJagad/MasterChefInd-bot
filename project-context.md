# Project Context: MasterChef Logistics & Canteen Management Ecosystem

## 1. Executive Overview
**MasterChefInd-bot** is an enterprise-grade, multi-platform canteen management ecosystem designed for university campuses, residential hostels, and corporate facilities. It integrates:
1. **Intelligent Telegram Bot**: Provides instant meal lookups, personalized reminder alerts, interactive dinner voting polls, and administrative menu ingestion.
2. **Next.js Web Dashboard & Portal**: A high-fidelity, responsive web interface built with Glassmorphism 3.0 aesthetics, offline PWA capabilities, real-time weekly menu viewing, PDF/JSON exports, and full admin management.
3. **System Insights & Observability**: In-app telemetry explorer (`/insights`) backed by an OpenTelemetry (OTLP) pipeline streaming metrics and structured logs to Axiom or Grafana Cloud.
4. **Multi-Engine Ingestion OCR**: A resilient triple-tier ingestion engine featuring instant local-first PDF parsing (`pdfjs-dist`), Google Gemini Multimodal Vision AI (`@google/genai`), and Groq LPU Vision fallback (`llama-3.2-11b-vision-preview`).
5. **Cross-Platform Deployments**: Pre-configured CI/CD workflows producing standalone Android (`.apk`), Windows (`.exe`), and iOS applications.

---

## 2. BMAD Method Integration
This project adopts and adheres to the **BMAD Method** (Breakthrough Method for Agile AI Development), an AI-driven agile development framework.

### BMAD Module Architecture
- **Root Configuration**: `_bmad/`
  - `_bmad/_config/`: Agent manifests, skill manifests, files manifest, and installation YAML (`manifest.yaml`).
  - `_bmad/bmm/`: Breakthrough Method Module configuration (`config.yaml`), module help references, and phase definitions.
  - `_bmad/core/`: BMAD Core engine configuration and baseline parameters.
- **Artifact Directories**:
  - `_bmad-output/planning-artifacts/`: Product briefs, architecture solution designs, epics, and user stories.
  - `_bmad-output/implementation-artifacts/`: Sprint tracking, story spec files, checkpoint preview logs, and test plans.
  - `docs/`: Living system documentation, API references, architecture blueprints, and validation reports.

---

## 3. Tech Stack & Dependencies

### Frontend & UI
- **Framework**: React 19.3+, Next.js 16.4+ (App Router, Static Export & Unified Server) in strict TypeScript/TSX
- **UI Library**: Material UI (MUI) 9+ (`@mui/material`, `@mui/icons-material`, `@mui/material-nextjs`) benchmarked against Linear / Vercel design systems
- **Styling**: Emotion CSS (`@emotion/react`, `@emotion/styled`), Clean Enterprise Surface Tokens, CSS Variables
- **PWA / Offline**: Service Worker API (`sw.js`), LocalStorage Dual-Cache, Web App Manifest (`manifest.json`)

### Backend & Microservices
- **Runtime**: Node.js 22+ (TypeScript, `tsx` runtime)
- **Web Framework**: Express 5.3+ custom server (`server.ts`)
- **Security Middleware**: `helmet` (HTTP headers), `express-rate-limit` (DDoS mitigation), `cors` (origin validation)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), Node.js `crypto` with `scrypt` hashing (32-byte salt, constant-time `timingSafeEqual`)
- **File Ingestion**: `multer` memory storage with 15MB upload boundary and path sanitization

### Telegram Bot
- **Library**: `node-telegram-bot-api` v2.3.0 with modern TypeScript adapter pattern
- **Features**: Interactive inline keyboards, persistent slash commands, photo/document ingestion, callback query router

### AI & PDF Ingestion Pipeline
- **Primary AI OCR**: Google Gen AI SDK (`@google/genai`) supporting Gemini 2.5 Flash, Gemini 2.0 Flash, Gemini 2.0 Flash Lite, Gemini 1.5 Flash, and Gemini 3.8/3.7 preview
- **Secondary AI OCR**: Groq Vision API (`OpenAI` client pointing to `https://api.groq.com/openai/v1`) using `llama-3.2-11b-vision-preview`
- **Instant Local Parser**: Mozilla PDF.js (`pdfjs-dist` legacy build) with strict coordinate cell extraction and `isEvalSupported: false` (CVE-2024-4367 mitigation)
- **Heuristic Parser**: `pdf2json` coordinate grouping fallback

### Database & Scheduling
- **Database**: MongoDB via `mongoose` 9.12+ (strongly typed TypeScript schemas & models)
- **Scheduler**: `node-cron` with strict `Asia/Kolkata` (IST) timezone bindings

### Telemetry & Observability
- **Engine**: OpenTelemetry (OTLP JSON over HTTP) with local ring buffer fallback
- **Metrics**: `prom-client` collecting Node.js runtime and HTTP latency histograms
- **Logging**: Structured JSON logger (`src/services/logger.ts`) with severity triage (`INFO`, `WARN`, `ERROR`)

### Multi-Platform Packaging
- **Desktop**: Electron 44+ (`electron/main.ts`, `electron/preload.ts`, `electron-builder.json`)
- **Mobile**: Capacitor 6+ (Android Studio Gradle build, iOS Xcode workspace)
- **CI/CD**: GitHub Actions (`.github/workflows/build-apps.yml`) v2.0 release pipeline

---

## 4. Directory Structure
```
bot/
├── .github/workflows/          # CI/CD automated release pipeline (Android, Windows, iOS)
├── _bmad/                      # BMAD Method configuration and agent/skill manifests
│   ├── _config/                # Manifests (agent, skill, file, YAML)
│   ├── bmm/                    # BMM Module configuration and documentation
│   └── core/                   # Core BMAD configuration
├── _bmad-output/               # Generated BMAD planning and implementation artifacts
│   ├── planning-artifacts/     # Architecture specs, product briefs, epics
│   └── implementation-artifacts/ # Sprint status, story specs, QA reviews
├── docs/                       # Comprehensive documentation
│   ├── api-reference.md        # Full REST API endpoints and contracts
│   ├── apple-shortcuts.md      # iOS Shortcuts & Siri integration guide
│   ├── architecture.md         # System architecture & data flow diagrams
│   ├── bmad-methodology.md     # BMAD Method workflow and guidelines
│   ├── parser-validation-report.md # Multi-engine OCR validation benchmarks
│   └── product-brief.md        # Product vision, personas, and roadmap
├── electron/                   # Desktop wrapper
│   ├── dist/                   # Compiled Electron JavaScript outputs
│   ├── main.ts                 # Electron main process and window manager
│   ├── preload.ts              # Context-isolated IPC preload bridge
│   └── tsconfig.json           # Dedicated Electron TypeScript compiler config
├── frontend/                   # Next.js 16 web application
│   ├── app/                    # App Router (pages: /, /insights, /announcements)
│   │   ├── announcements/page.tsx # Announcements feed & broadcast sender
│   │   ├── insights/page.tsx   # Telemetry & System Insights dashboard
│   │   ├── components/         # Shared components (Sidebar, TopNav, Dialogs)
│   │   ├── ThemeRegistry.tsx   # Modernized MUI theme & dark/light mode provider
│   │   ├── globals.css         # Modern typography & surface styling
│   │   ├── layout.tsx          # Server Component root layout with metadata/viewport
│   │   └── page.tsx            # Main weekly canteen dining schedule
│   ├── next.config.js          # Next.js build configuration
│   └── tsconfig.json           # Next.js frontend TypeScript compiler config
├── monitoring/                 # Monitoring & observability configurations
│   ├── docker-compose.monitoring.yml # Prometheus & Grafana stack
│   ├── OPENTELEMETRY_GUIDE.md  # OTLP streaming guide (Axiom & Grafana Cloud)
│   └── prometheus.yml          # Prometheus scrape definitions
├── scratch/                    # Scratch diagnostics and developer scripts
│   └── check_db.ts             # Typed database probe utility
├── src/                        # Core backend services and bot
│   ├── api/                    # Express REST API routes
│   │   └── routes.ts           # API route declarations & security middlewares
│   ├── services/               # Microservices
│   │   ├── cron.ts             # node-cron scheduler (IST reminders & polls)
│   │   ├── db.ts               # MongoDB connection lifecycle
│   │   ├── dinnerPoll.ts       # 6:30 PM community dinner voting logic
│   │   ├── geminiParser.ts     # Triple-tier OCR parser (PDF.js -> Gemini -> Groq)
│   │   ├── logger.ts           # Structured JSON logger with telemetry hooks
│   │   ├── menu.ts             # Menu data access & week indexing logic
│   │   ├── metrics.ts          # Prometheus metrics & HTTP profiling
│   │   ├── models.ts           # Mongoose schemas (User, Menu, Announcement, DinnerPoll)
│   │   ├── parser.ts           # Coordinate heuristic fallback parser
│   │   ├── pdfGenerator.ts     # PDFKit weekly menu export synthesizer
│   │   ├── telemetry.ts        # OpenTelemetry OTLP dispatcher & in-memory buffer
│   │   └── utils.ts            # IST date arithmetic, week key calculation, formatters
│   └── telegram/               # Telegram bot layer
│       ├── bot.ts              # Telegram instance initialization & adapter
│       └── handlers.ts         # Command handlers, callbacks, and photo uploads
├── tests/                      # Jest test suites
│   ├── api.test.ts             # REST API unit and integration tests
│   ├── telemetry.test.ts       # Telemetry logging & filtering tests
│   └── utils.test.ts           # IST date and menu utility tests
├── types/                      # Shared ambient TypeScript definitions
│   ├── common.ts               # Shared models and data contracts
│   ├── electron.d.ts           # Window.electronAPI type definitions
│   └── express.d.ts            # Extended Express Request types
├── API_AND_SHORTCUT_GUIDE.md   # External API guide for iOS & Android shortcuts
├── CHANGELOG.md                # Release version history
├── jest.config.js              # Jest configuration (ts-jest preset)
├── package.json                # Project dependencies and script runner (v2.0.0)
├── README.md                   # Primary project readme and onboarding guide
├── SECURITY.md                 # Security policy, reporting, and hardening details
├── server.ts                   # Unified Express + Next.js + Bot bootstrapping server
├── tsconfig.base.json          # Shared compiler options
└── tsconfig.json               # Root backend compiler configuration
```

---

## 5. Core Architectural Rules & Conventions

### 1. Strict IST Timezone Enforcement
All date calculations, reminders, cron jobs, and menu rollover cutoffs **MUST** use Indian Standard Time (`Asia/Kolkata`, UTC+5:30).
- Never use `new Date()` without timezone transformation.
- Always use `getISTDate(offsetDays)` from `src/services/utils.js`.

### 2. Weekly Key Indexing (`YYYYWW`)
Menus are partitioned and stored by ISO calendar week keys formatted as `YYYYWW` (e.g., `202619` for Week 19 of 2026).
- Prevents cross-week menu bleed.
- Allows retroactive browsing of all historical menus.

### 3. Multi-Engine Ingestion Cascade
Menu document uploads (PDF or image) go through the following sequence:
1. **Local-First Extraction**: `geminiParser.js` first attempts coordinate-based cell extraction with `pdfjs-dist`. If text blocks for days and meals are found with confidence, parsing completes in <50ms without API calls or tokens.
2. **Google Gemini Vision AI**: If local extraction is insufficient (e.g., photo snapshots or complex graphics), it streams to Gemini (`gemini-2.5-flash` down to candidate list) enforcing structured JSON schema output.
3. **Groq LPU Vision Fallback**: If Gemini quotas or networks fail, requests fall back to Groq LPU Vision (`llama-3.2-11b-vision-preview`).
4. **Heuristic Fallback**: `parser.js` processes raw text streams as a final safety net.

### 4. Dinner Voting Lifecycle (Controlled by `ENABLE_REMINDERS`)
- **6:30 PM IST**: The bot automatically generates a daily poll message with inline buttons (`19:00`, `19:30`, `20:00`, `20:30`, `21:00`) and sends it to all registered users.
- **7:30 PM IST**: The poll automatically closes, tallies votes, determines the winning time, and broadcasts the winner to the community.
- **Winning Time IST**: The bot broadcasts a reminder notifying users that dinner has started.

### 5. Security Protocols
- **Password Hashing**: Admin authentication uses Node.js `crypto.scryptSync` with a salt and 32-byte key length.
- **Constant-Time Comparison**: Password comparisons use `crypto.timingSafeEqual` to eliminate timing attacks.
- **NoSQL Injection Prevention**: Database query fields are sanitized and strictly validated against regex filters (`/^\d{4,8}$/`).
- **Path Traversal Protection**: Uploaded filenames use `path.basename` and regex stripping.
- **Eval Elimination**: `pdfjs-dist` is initialized with `isEvalSupported: false` to eliminate CVE-2024-4367 risks.

---

## 6. Development & Verification Workflows
- **Running Locally**: `npm run dev` starts the unified Express + Next.js + Telegram polling service on port 3000.
- **Running Tests**: `npm test` executes the complete Jest suite (`tests/api.test.js`, `tests/telemetry.test.js`, `tests/utils.test.js`).
- **Building Desktop**: `npm run desktop` launches the Electron container.
- **Building Mobile**: `npm run build` followed by `npx cap sync android` builds the Capacitor bundle.
