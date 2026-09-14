# 📜 Changelog - MasterChef Canteen System

All notable changes to this project are documented in this file.

---

## [v1.1.0] - 2026-09-14

### 🤖 Multimodal Gemini AI OCR & Parsing
- **Multi-Model Failover Cascade**: Added support for Google-recommended models (gemini-3.6-flash, gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.0-flash-exp) alongside latest preview models (gemini-3.8-flash, gemini-3.7-flash).
- **Resilient 503 & Rate-Limit Handling**: Automatic backoff retry to transparently absorb temporary Google AI Studio traffic surges.
- **Direct REST API Fallback**: Direct HTTP etch to Google's v1beta endpoint if SDK transport errors occur.
- **Strict JSON Enforcement**: Enforced esponseMimeType: application/json for clean, deterministic JSON extraction without markdown artifacts.

### 📄 Coordinate-Based PDF Extraction (No More Empty -- Menus)
- **Mozilla PDF.js (pdfjs-dist) Engine**: Integrated coordinate-based cell extraction that is immune to corrupt XRef stream headers.
- **Removed Dummy -- Fallbacks**: Removed silent empty dash fallbacks that previously hid parsing errors. Only verified, real meal names are accepted.

### 🗳️ Granular Reminders Configuration
- **Dinner Vote Isolation**: ENABLE_REMINDERS specifically toggles the 6:30 PM & 7:30 PM dinner voting poll without silencing daily personal meal notifications.

### 📱 Multi-Platform Releases & CI/CD Pipeline
- **GitHub Actions (uild-apps.yml)**:
  - Automated builds for **Android APK** (Capacitor), **Windows executable (.exe)** (Electron), and **iOS** simulator archives.
  - Resolved 
pm ci lockfile mismatch by synchronizing package-lock.json and using --legacy-peer-deps.
  - Added executable permissions (chmod +x gradlew) on Linux runners for Gradle builds.
  - Resilient multi-artifact release step publishing assets even if single platform runners experience transient toolchain delays.
- **PWA & Offline Mode**: Configured Service Worker (sw.js) and manifest for standalone installation on mobile and desktop.
