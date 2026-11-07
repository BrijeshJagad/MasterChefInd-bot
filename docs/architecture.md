# MasterChef System Architecture Blueprint

## 1. High-Level Architecture Overview

MasterChef is structured as a unified full-stack application that simultaneously hosts an Express REST API, a Next.js App Router front-end, an active Telegram bot polling process, and a resilient background cron scheduler within a single coordinated Node.js process.

```mermaid
flowchart TD
    subgraph Clients["Client Access Layers"]
        TG["Telegram Bot App\n(Mobile / Desktop / Web)"]
        WEB["Next.js Web Dashboard\n(PWA / Desktop Browser)"]
        MOBILE["Mobile Apps\n(Android APK / iOS Capacitor)"]
        DESKTOP["Windows Desktop App\n(Electron)"]
        SHORTCUTS["Siri & iOS Shortcuts\n(REST /api/next-meal)"]
    end

    subgraph Server["Unified Application Server (Node.js)"]
        EXPRESS["Express 5.3 Web Server\n(Port 3000)"]
        NEXT["Next.js 16 App Router\n(Static & SSR Routes)"]
        BOT["Telegram Bot Service\n(Modern v2.3 Adapter)"]
        CRON["node-cron Scheduler\n(IST Reminders & Polls)"]
        AUTH["Scrypt Auth & JWT Engine"]
    end

    subgraph Ingestion["Triple-Tier Menu Ingestion Engine"]
        PDFJS["Mozilla PDF.js\n(Instant Local Coordinate Parser)"]
        GEMINI["Google Gemini AI\n(@google/genai Multimodal Vision)"]
        GROQ["Groq LPU Vision\n(Ultra-low Latency Fallback)"]
        HEURISTIC["Coordinate Parser\n(pdf2json Fallback)"]
    end

    subgraph Data["Persistence & Observability Layer"]
        MONGO[("MongoDB Atlas\n(Mongoose ORM)")]
        OTEL["OpenTelemetry Pipeline\n(Axiom / Grafana Cloud / In-Memory Buffer)"]
    end

    TG <--> BOT
    WEB <--> EXPRESS
    MOBILE <--> EXPRESS
    DESKTOP <--> EXPRESS
    SHORTCUTS <--> EXPRESS

    EXPRESS --- NEXT
    EXPRESS --- BOT
    EXPRESS --- CRON
    EXPRESS --- AUTH

    EXPRESS --> Ingestion
    BOT --> Ingestion
    Ingestion --> MONGO

    EXPRESS --> MONGO
    BOT --> MONGO
    CRON --> MONGO
    Server -.-> OTEL
```

---

## 2. Ingestion & Multi-Tier OCR Pipeline

The ingestion engine accepts canteen weekly schedules in PDF or image format (PNG, JPEG, WEBP) from the Web Dashboard or Telegram bot.

```mermaid
flowchart TD
    START["Menu File Uploaded\n(PDF / Image)"] --> CHECK_TYPE{"File Type?"}

    CHECK_TYPE -->|"PDF File"| LOCAL_TRY["Attempt Local Coordinate Parsing\n(Mozilla PDF.js - 0 API tokens, <50ms)"]
    CHECK_TYPE -->|"Image File"| GEMINI_TRY

    LOCAL_TRY --> LOCAL_CHECK{"Extraction Complete\n& Valid Meals Found?"}
    LOCAL_CHECK -->|"Yes"| PERSIST["Sanitize & Save Menu to MongoDB\nIndex by Week Key (YYYYWW)"]
    LOCAL_CHECK -->|"No / Scanned PDF"| GEMINI_TRY["Invoke Gemini Multimodal Vision AI\n(@google/genai Cascade)"]

    GEMINI_TRY --> GEMINI_CHECK{"Gemini Success\n& Valid JSON?"}
    GEMINI_CHECK -->|"Yes"| PERSIST
    GEMINI_CHECK -->|"Rate-Limit / 503 / Network"| GROQ_TRY["Invoke Groq LPU Vision Fallback\n(llama-3.2-11b-vision-preview)"]

    GROQ_TRY --> GROQ_CHECK{"Groq Success?"}
    GROQ_CHECK -->|"Yes"| PERSIST
    GROQ_CHECK -->|"No"| HEURISTIC_TRY["Invoke Legacy Coordinate Fallback\n(pdf2json Parser)"]

    HEURISTIC_TRY --> PERSIST
```

---

## 3. Scheduled Cron & Dinner Polling Lifecycle

The system runs a resilient background scheduler strictly calibrated to Indian Standard Time (`Asia/Kolkata`, UTC+5:30).

```mermaid
sequenceDiagram
    autonumber
    participant C as node-cron (Scheduler)
    participant U as MongoDB (User / DinnerPoll)
    participant B as Telegram Bot Service
    participant D as Diners (Telegram Users)

    Note over C,D: Every Minute Check (IST)
    C->>U: Query users where reminders = true
    C->>U: Compare current HH:MM with user timing (07:30, 11:00, 20:00)
    C->>B: Dispatch personalized Breakfast/Lunch/Dinner alert
    B->>D: Send formatted meal summary

    Note over C,D: 6:30 PM IST (Daily Dinner Poll)
    C->>U: Create or get today's DinnerPoll record (status: open)
    C->>B: Build interactive inline vote keyboard
    B->>D: Broadcast voting poll (19:00, 19:30, 20:00, 20:30, 21:00)
    D->>B: Tap preferred dining time button
    B->>U: Atomically record vote & update message vote counts

    Note over C,D: 7:30 PM IST (Poll Closure & Winner Announcement)
    C->>U: Close DinnerPoll & compute winning time (most votes)
    C->>B: Broadcast winner announcement
    B->>D: "Tonight's dinner time decided: [HH:MM]!"

    Note over C,D: At Winning Time IST
    C->>B: Broadcast final call
    B->>D: "Dinner is served! Head to the canteen."
```

---

## 4. Telemetry & Observability Pipeline

Telemetry is designed for high-resolution event logging with zero-downtime streaming:
1. **Application Events**: All bot messages, votes, uploads, logins, and errors trigger `logger[severity](action, message, metadata)`.
2. **Telemetry Ingestion**: Events are dispatched to `telemetry.recordEvent()`.
3. **Dual Routing**:
   - **Local In-Memory Ring Buffer**: Retains the last 100 structured events for querying via the web dashboard at `/insights` and `/api/system/logs`.
   - **OpenTelemetry (OTLP) Exporter**: When `OTEL_EXPORTER_OTLP_ENDPOINT` is configured, batches are transmitted via HTTP POST in standard OTLP JSON format to Axiom, Grafana Cloud, or Datadog.
4. **System Metrics**: `/api/system/stats` collects real-time process memory (RSS, Heap, External), CPU utilization, uptime, and database connection metrics.

---

## 5. Security & Defense-in-Depth Architecture

- **Password Verification**: Uses Node.js native `crypto.scryptSync` with a salt and 32-byte key length.
- **Timing Attack Mitigation**: Verifies credentials using `crypto.timingSafeEqual` to prevent side-channel timing analysis.
- **Session Tokens**: Administrative sessions are issued signed JSON Web Tokens (JWT) with a 2-hour expiration window.
- **NoSQL Injection Resistance**: All week keys and user IDs passed to queries are sanitized via strict regular expressions (`/^\d{4,8}$/`).
- **HTTP Header Hardening**: Express utilizes `helmet` to set CSP, HSTS, X-Frame-Options, and X-Content-Type-Options headers.
- **Rate Limiting**: `express-rate-limit` throttles API access to protect against brute-force and DDoS attempts.
- **PDF Execution Mitigation**: `pdfjs-dist` is initialized with `isEvalSupported: false` to eliminate CVE-2024-4367 code execution risks.
