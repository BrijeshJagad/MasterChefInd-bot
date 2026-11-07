# Product Brief: MasterChef Logistics & Canteen Management Ecosystem

## 1. Executive Summary & Vision
**MasterChefInd-bot** is an integrated canteen logistics ecosystem engineered to streamline food service operations in university campuses, hostels, and corporate cafeterias. By bridging modern web interfaces, automated Telegram bot workflows, and multi-tier AI vision OCR, the system eliminates paper menu confusion, reduces meal wait times, and provides seamless real-time dining intelligence.

---

## 2. Target Personas & User Stories

### Persona 1: Canteen Diners (Students & Employees)
- **Need**: Fast, frictionless access to today's and upcoming meal schedules without installing bloated third-party apps.
- **Pain Points**: Outdated paper schedules, unannounced menu substitutions, missing breakfast or dinner windows.
- **User Stories**:
  - *As a diner*, I want to ask Telegram or Siri *"What's for lunch?"* and get an instant answer in seconds.
  - *As a diner*, I want automated daily reminders before breakfast (07:30), lunch (11:00), and dinner (20:00) with custom timing overrides.
  - *As a diner*, I want to participate in a daily 6:30 PM dinner timing poll to coordinate dining times with peers.

### Persona 2: Canteen Administrators & Chefs
- **Need**: Effortless menu updates without requiring technical knowledge or manual data entry.
- **Pain Points**: Weekly menus arrive as poorly formatted physical paper printouts or mobile photo snapshots.
- **User Stories**:
  - *As an administrator*, I want to drop a PDF or snap a smartphone photo of the printed menu and have AI parse it into structured days and meals instantly.
  - *As an administrator*, I want a secure web dashboard to edit individual meal items and broadcast instant announcements to all diners.
  - *As an administrator*, I want one-click exports to regenerate clean PDF posters and download raw JSON.

### Persona 3: Systems & DevOps Engineers
- **Need**: High availability, minimal operational cost, zero maintenance overhead, and clear system observability.
- **User Stories**:
  - *As an engineer*, I want an integrated telemetry pipeline (OpenTelemetry / Prometheus) with an in-app insights explorer to monitor memory, uptime, and parser failovers.
  - *As an engineer*, I want local-first OCR fallback so the bot keeps functioning even during external AI API downtime or rate-limiting.

---

## 3. Core Feature Pillars

### A. Next.js 16 Web Dashboard (Ultimate Dashboard V8)
- **Glassmorphism 3.0 Aesthetics**: High-fidelity dark and light themes, smooth transitions, mobile-responsive layout.
- **Interactive History Navigation**: Persistent weekly sidebar to navigate all historical menus with week key indexing (`YYYYWW`).
- **Offline PWA Support**: Dual-layer caching with Service Workers (`sw.js`) and LocalStorage persistence.
- **In-App System Insights**: Real-time telemetry monitoring (`/insights`), live memory metrics, process uptime, and audit logs.
- **Admin Management Suite**: JWT-authenticated management portal (`/admin`) for manual edits, JSON import/export, and announcements.

### B. Telegram Automation Bot (V2.3 Modern Adapter)
- **Conversational Slash Commands**: `/start`, `/today`, `/tomorrow`, `/all`, `/timing`, `/on`, `/off`, `/help`.
- **Interactive Keyboards**: Dynamic inline buttons for switching days and voting.
- **Automated Dinner Polling**: Scheduled 6:30 PM community voting and 7:30 PM winner announcements.
- **Multimodal Document Upload**: Direct photo or PDF document drop inside Telegram with administrative password validation.

### C. Triple-Tier Ingestion & OCR Engine
- **Tier 1 (Instant Local)**: Mozilla PDF.js coordinate cell extraction (<50ms, zero tokens, immune to CVE-2024-4367).
- **Tier 2 (Gemini Multimodal AI)**: Google Gen AI SDK (`@google/genai`) parsing scanned PDFs and smartphone snapshots into strict JSON.
- **Tier 3 (Groq LPU Vision Fallback)**: Ultra-low latency vision inference via Groq's LPU (`llama-3.2-11b-vision-preview`).
- **Tier 4 (Heuristic Parser)**: Coordinate-based `pdf2json` fallback.

### D. Native Multi-Platform Applications
- **Android**: Native APK compiled via Capacitor and Android Studio.
- **Windows**: Desktop executable package compiled via Electron.
- **iOS**: Xcode project workspace and simulator builds via Capacitor.
- **Continuous Delivery**: Automated GitHub Actions workflow (`.github/workflows/build-apps.yml`).

---

## 4. Non-Functional Requirements & Guardrails

| Requirement | Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Timezone Precision** | Indian Standard Time (`Asia/Kolkata`, UTC+5:30) | Strict `getISTDate()` offsets; independent of hosting server locale. |
| **Parsing Reliability** | 99.9% ingestion success across messy scans | 4-level fallback cascade (Local PDF.js → Gemini → Groq → Heuristic). |
| **Security & Auth** | Scrypt KDF + Constant-time equality | Timing attack mitigation (`crypto.timingSafeEqual`), NoSQL query sanitization. |
| **Performance** | < 200ms API response time | Lightweight query projection (`pdfBuffer: 0`), local memory caching. |
| **Offline Resilience** | Full menu browsing while disconnected | PWA Service Worker + LocalStorage dual cache. |

---

## 5. BMAD Method Alignment
This product adheres to the **BMAD Method** (Breakthrough Method for Agile AI Development). Development sprints, stories, and solution architectures are maintained under `_bmad/` configuration and tracked via `_bmad-output/`.
