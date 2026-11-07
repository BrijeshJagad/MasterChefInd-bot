# 📜 Changelog - MasterChef Canteen System

All notable changes to this project are documented in this file.

---

## [v1.2.0] - 2026-11-07

### 🏛️ BMAD Method Framework Restoration
- **Restored BMAD System Manifests**: Recovered full `_bmad/` structure with `_bmad/_config/` (agent, skill, and file manifests, `manifest.yaml`), `_bmad/bmm/`, and `_bmad/core/`.
- **BMAD Artifact Pipeline**: Initialized `_bmad-output/planning-artifacts/` and `_bmad-output/implementation-artifacts/` for structured AI-driven sprint execution.
- **Dedicated BMAD Guide**: Added comprehensive methodology documentation in [`docs/bmad-methodology.md`](docs/bmad-methodology.md) and refreshed [`project-context.md`](project-context.md).

### 🔭 Observability & In-App System Insights
- **System Insights Dashboard**: Added `/insights` telemetry explorer in Next.js front-end featuring live visual resource gauges (RSS, Heap, CPU, Uptime) and tabular event streams.
- **OpenTelemetry (OTLP) Pipeline**: Integrated asynchronous streaming exporter supporting Axiom and Grafana Cloud with local ring buffer fallback.
- **System Endpoints**: Added `GET /api/system/stats` and `GET /api/system/logs` with query filtering by severity, action, and user ID.

### 🤖 Telegram Bot Modernization & Groq Vision LPU
- **Modern Telegram Adapter**: Implemented custom adapter pattern in `src/telegram/bot.js` supporting `node-telegram-bot-api` v2.3.0 while retaining v0.67.0 fallback.
- **Groq Vision LPU OCR Fallback**: Added high-speed LPU vision inference (`llama-3.2-11b-vision-preview`) via OpenAI SDK as Tier 3 fallback behind Google Gemini.
- **Instant Local-First Parsing**: Enhanced `pdfjs-dist` coordinate cell parser to parse structured canteen PDF tables in <50ms without API tokens.

### 🛡️ Security Hardening & Vulnerability Remediation
- **Scrypt Password Key Derivation**: Replaced legacy plaintext/hash checks with cryptographically secure `crypto.scryptSync` (CWE-916 compliant).
- **Constant-Time Verification**: Migrated password comparison to `crypto.timingSafeEqual` to eliminate side-channel timing analysis attacks.
- **NoSQL Injection Guard**: Sanitized all week key and user parameters against strict regular expression boundaries (`/^\d{4,8}$/`).
- **CVE-2024-4367 Safety**: Configured `pdfjs-dist` with `isEvalSupported: false` to prohibit arbitrary code execution within parsed PDF files.

### 📚 Comprehensive Documentation Overhaul
- Created [`docs/architecture.md`](docs/architecture.md) with system component and sequence diagrams.
- Created [`docs/api-reference.md`](docs/api-reference.md) detailing all REST endpoints and schemas.
- Updated [`docs/product-brief.md`](docs/product-brief.md) and [`docs/parser-validation-report.md`](docs/parser-validation-report.md).
- Updated [`API_AND_SHORTCUT_GUIDE.md`](API_AND_SHORTCUT_GUIDE.md), [`README.md`](README.md), and [`SECURITY.md`](SECURITY.md).

---

## [v1.1.0] - 2026-09-14

### 🤖 Multimodal Gemini AI OCR & Parsing
- **Multi-Model Failover Cascade**: Added support for Google-recommended models (`gemini-3.6-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.0-flash-exp`) alongside latest preview models (`gemini-3.8-flash`, `gemini-3.7-flash`).
- **Resilient 503 & Rate-Limit Handling**: Automatic backoff retry to transparently absorb temporary Google AI Studio traffic surges.
- **Direct REST API Fallback**: Direct HTTP `fetch` to Google's v1beta endpoint if SDK transport errors occur.
- **Strict JSON Enforcement**: Enforced `responseMimeType: "application/json"` for clean, deterministic JSON extraction without markdown artifacts.

### 📄 Coordinate-Based PDF Extraction (No More Empty `--` Menus)
- **Mozilla PDF.js (`pdfjs-dist`) Engine**: Integrated coordinate-based cell extraction that is immune to corrupt XRef stream headers.
- **Removed Dummy `--` Fallbacks**: Removed silent empty dash fallbacks that previously hid parsing errors. Only verified, real meal names are accepted.

### 🗳️ Granular Reminders Configuration
- **Dinner Vote Isolation**: `ENABLE_REMINDERS` specifically toggles the 6:30 PM & 7:30 PM dinner voting poll without silencing daily personal meal notifications.

### 📱 Multi-Platform Releases & CI/CD Pipeline
- **GitHub Actions (`build-apps.yml`)**:
  - Automated builds for **Android APK** (Capacitor), **Windows executable (.exe)** (Electron), and **iOS** simulator archives.
  - Resolved `npm ci` lockfile mismatch by synchronizing `package-lock.json` and using `--legacy-peer-deps`.
  - Added executable permissions (`chmod +x gradlew`) on Linux runners for Gradle builds.
  - Upgraded GitHub Action dependencies to latest: `setup-node@v7`, `setup-java@v5`, `upload-artifact@v7`, `download-artifact@v8`, `action-gh-release@v3`.
  - Resilient multi-artifact release step publishing assets even if single platform runners experience transient toolchain delays.
- **PWA & Offline Mode**: Configured Service Worker (`sw.js`) and manifest for standalone installation on mobile and desktop.

### 🛡️ Dependency & Security Audit
- **0 Vulnerabilities**: Cleaned up legacy/unused packages (`pdf-parse`, `pdf-table-extractor`, dummy `fs`).
- **Modern Package Bump**: Bumped `node-telegram-bot-api` to `^2.1.0` and `body-parser` to `^2.3.0`.
- **Closed 14 Dependabot Alerts**: Fully superseded Dependabot PRs #2, #3, #4, #5, #6, #7, #8, #9, #14, #15, #18, #20, #25, #26 with a clean audit lockfile.
