# 🔭 MasterChef OpenTelemetry & Logging Guide

Because Render's free tier has short log retention and instances sleep, your app is now instrumented with a **production-grade OpenTelemetry (OTLP) pipeline** that logs every action, user interaction, and system event, and streams them to a free telemetry backend of your choice (like **Axiom** or **Grafana Cloud**).

---

## ⚡ What is Logged ("App Logs Everything")

Every event is recorded with rich, queryable metadata:

| Category | Action Name | Queryable Attributes |
| :--- | :--- | :--- |
| **Telegram Bot** | `telegram.message` | `chatId`, `username`, `text` |
| **Dinner Voting** | `dinner_poll.vote` | `chatId`, `votedTime`, `date` |
| **Dinner Poll Close** | `dinner_poll.closed` | `winner`, `totalVotes`, `counts`, `date` |
| **Automated Reminders** | `cron.meal_reminder_sent` | `chatId`, `mealType`, `scheduledTime` |
| **Dinner Broadcast** | `cron.poll_winner_broadcast` | `winner`, `totalVotes`, `sentCount` |
| **Gemini AI OCR** | `gemini.ocr_success` | `model`, `weekKey`, `bufferSize` |
| **Gemini Retries/Fallback**| `gemini.ocr_retry` | `model`, `attempt`, `error` |
| **Admin Authentication** | `auth.login_success`, `auth.login_failed` | `ip` |
| **Menu Uploads & Updates**| `menu.uploaded`, `menu.updated`, `menu.deleted` | `weekKey`, `fileName`, `mimeType`, `sizeBytes` |
| **HTTP Traffic & Latency** | `http.request`, `http.request_error` | `method`, `url`, `statusCode`, `durationMs`, `ip`, `userAgent` |
| **Database & System** | `db.connected`, `db.error`, `system.unhandled_rejection` | `host`, `error.message`, `error.stack` |

---

## 🖥️ In-App System Insights UI (`/insights`)

A visual telemetry explorer is built directly into the MasterChef web dashboard:
- Navigate to **System Insights** in the dashboard sidebar or visit `http://localhost:3000/insights`.
- **Live Hardware Gauges**: Visual RSS Memory, Heap Allocation, Uptime, Node version, and platform details.
- **Interactive Event Stream**: Real-time tabular audit logs filterable by severity (`INFO`, `WARN`, `ERROR`), action name, or Telegram `chatId`.
- **System Counters**: Active subscriber counts, reminder counts, and total registered weekly menus.

---

## 🚀 Recommended Free Backends

### 🥇 Option 1: Axiom (Recommended — 500 GB / month Free, 30 Days Retention)
Axiom offers the most generous free tier in the industry with blazing-fast search and Kusto/APL queries.

1. Create a free account at [axiom.co](https://axiom.co) (No credit card required).
2. Create a dataset named `masterchef`.
3. Go to **Settings** → **API Tokens** → Create an API token with `Ingest` permissions.
4. Set the following environment variables in your `.env` (or in Render's **Environment** tab):

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.axiom.co/v1/logs
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer YOUR_AXIOM_API_TOKEN,X-Axiom-Dataset=masterchef
```

#### How to Query in Axiom (APL):
Open Axiom's Stream/Query tab and run:

- **See all dinner poll votes today:**
  ```apl
  ['masterchef']
  | where action == "dinner_poll.vote"
  | project timestamp, chatId, votedTime, date
  ```

- **Query user actions for a specific Telegram user:**
  ```apl
  ['masterchef']
  | where chatId == "12345678"
  | order by timestamp desc
  ```

- **Find all errors across the application:**
  ```apl
  ['masterchef']
  | where severity == "ERROR"
  | project timestamp, action, message, error
  ```

- **Track Gemini AI OCR extraction performance:**
  ```apl
  ['masterchef']
  | where action startswith "gemini."
  | summarize count() by model, bin(timestamp, 1h)
  ```

- **Find slow API requests (> 500ms):**
  ```apl
  ['masterchef']
  | where action == "http.request" and durationMs > 500
  | project timestamp, method, url, durationMs, statusCode
  ```

---

### 🥈 Option 2: Grafana Cloud (Free Forever — 50 GB Logs + 10,000 Metrics)
If you prefer Grafana's UI for both metrics and logs:

1. Sign up for a free account at [grafana.com](https://grafana.com) (Forever Free tier).
2. Under **OpenTelemetry** in your Grafana portal, generate an OTLP token.
3. Configure your environment:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic YOUR_BASE64_GRAFANA_CREDENTIALS
```

#### How to Query in Grafana (LogQL in Explore tab):
- **All dinner votes:**
  ```logql
  {app="masterchef"} | json | action = "dinner_poll.vote"
  ```
- **All application errors:**
  ```logql
  {app="masterchef"} | json | severity = "ERROR"
  ```

---

### 🥉 Option 3: Local Prometheus + Grafana (via Docker Compose)
For local development or self-hosting on a VPS:

```bash
# 1. Start Prometheus and Grafana containers
npm run metrics:up

# 2. Open Grafana in your browser
http://localhost:3001
# Default login: admin / admin (or auto-logged in as viewer)
```
- Pre-provisioned Prometheus datasource at `http://prometheus:9090`
- Pre-built **MasterChef Resource & Insights Dashboard** already loaded (`monitoring/masterchef-dashboard.json`).

---

## 🔍 In-App Querying & REST APIs (No external setup required)

Even before connecting an external OTLP backend, you can query recent actions and system resource stats directly via REST:

- **Query recent actions:**
  `GET /api/system/logs?limit=50`
- **Filter by action:**
  `GET /api/system/logs?action=dinner_poll.vote`
- **Filter by severity:**
  `GET /api/system/logs?severity=ERROR`
- **Filter by user:**
  `GET /api/system/logs?chatId=12345`
- **Resource insights (CPU, Memory in MB, Uptime, DB stats):**
  `GET /api/system/stats`
- **Prometheus Scrape Endpoint:**
  `GET /metrics`
