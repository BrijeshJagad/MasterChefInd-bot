# MasterChef REST API Reference Manual

Base URL: `http://localhost:3000` (or `https://your-domain.com`)

---

## 1. Authentication

### Admin Login
Authenticates an administrator using the configured `ADMIN_PASSWORD` and returns a signed JWT bearer token.

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "password": "your_admin_password"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Error Response (401 Unauthorized)**:
  ```json
  {
    "error": "Unauthorized: Invalid Admin Password"
  }
  ```

---

## 2. Menu Discovery & Retrieval

### Available Weeks
Lists all registered week keys stored in the database.

- **URL**: `/api/weeks`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "weeks": ["202619", "202618", "202617"]
  }
  ```

---

### Today's Menu
Returns the menu items for the current day in Indian Standard Time (IST).

- **URL**: `/api/today`
- **Method**: `GET`
- **Query Parameters**:
  - `week` *(optional)*: Specific week key (e.g., `?week=202619`). Defaults to the current week.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "weekKey": "202619",
    "day": "MONDAY",
    "date": "06/04",
    "breakfast": "Poha, Tea, Milk",
    "lunch": "Paneer Butter Masala, Roti, Dal, Rice, Salad",
    "dinner": "Khichdi Kadhi, Papad, Chhach"
  }
  ```

---

### Specific Week Menu
Returns the entire weekly menu breakdown (Monday through Sunday).

- **URL**: `/api/menu`
- **Method**: `GET`
- **Query Parameters**:
  - `week` *(optional)*: Specific week key (e.g., `?week=202619`). Defaults to the latest registered week.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "weekKey": "202619",
    "menu": {
      "MONDAY": { "date": "06/04", "breakfast": "...", "lunch": "...", "dinner": "..." },
      "TUESDAY": { "date": "07/04", "breakfast": "...", "lunch": "...", "dinner": "..." },
      "WEDNESDAY": { "date": "08/04", "breakfast": "...", "lunch": "...", "dinner": "..." },
      "THURSDAY": { "date": "09/04", "breakfast": "...", "lunch": "...", "dinner": "..." },
      "FRIDAY": { "date": "10/04", "breakfast": "...", "lunch": "...", "dinner": "..." },
      "SATURDAY": { "date": "11/04", "breakfast": "...", "lunch": "...", "dinner": "..." },
      "SUNDAY": { "date": "12/04", "breakfast": "...", "lunch": "...", "dinner": "..." }
    }
  }
  ```

---

### Next Upcoming Meal (Siri & Shortcuts Ready)
Dynamically calculates and returns the next upcoming meal based on current IST time and optional user-specific notification preferences.

- **URL**: `/api/next-meal`
- **Method**: `GET`
- **Query Parameters**:
  - `chatId` *(optional)*: Telegram chat ID to factor in individual meal timing preferences.
- **Time Cutoffs (Default)**:
  - Before 10:00 AM: Today's Breakfast
  - 10:00 AM – 3:00 PM: Today's Lunch
  - 3:00 PM – 10:30 PM: Today's Dinner
  - After 10:30 PM: Tomorrow's Breakfast
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "day": "Wednesday",
    "meal": "lunch",
    "menu": "Chole Bhature, Jeera Rice, Boondi Raita"
  }
  ```

---

### All Weeks Menu Data
Returns a lightweight list of all stored menus across history (excluding binary PDF buffers).

- **URL**: `/api/all-weeks-data`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "weekKey": "202619",
        "fileName": "CANTEEN_MENU.pdf",
        "data": { ... }
      }
    ]
  }
  ```

---

## 3. Downloads & Exports

### Download Menu as PDF
Downloads the uploaded or synthesized PDF document for a specified week.

- **URL**: `/api/download/pdf`
- **Method**: `GET`
- **Query Parameters**:
  - `week` *(optional)*: Target week key.
- **Response**: Binary stream with headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="MasterChef_Menu_W202619.pdf"`

---

### Download Menu as JSON
Downloads raw weekly menu data as an exportable JSON file.

- **URL**: `/api/download/json`
- **Method**: `GET`
- **Query Parameters**:
  - `week` *(optional)*: Target week key.
- **Response**: Formatted JSON file attachment (`menu_202619.json`).

---

## 4. Menu Management (Admin Only)

All endpoints in this section require the header:
```
Authorization: Bearer <TOKEN>
```

### Upload Menu File (PDF or Image)
Uploads and parses a new menu file using the multi-tier OCR engine.

- **URL**: `/api/upload`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <TOKEN>`
  - `Content-Type: multipart/form-data`
- **Body**: Form-data with file field `file` (Max 15 MB; accepts PDF, PNG, JPG, WEBP).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Menu for Week 202619 uploaded and parsed successfully!",
    "weekKey": "202619",
    "menu": { ... }
  }
  ```

---

### Create Menu Directly (JSON)
Creates a new week's menu and synthesizes a corresponding PDF document using PDFKit.

- **URL**: `/api/menu`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <TOKEN>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "weekKey": "202620",
    "menuData": {
      "MONDAY": { "date": "13/04", "breakfast": "Poha", "lunch": "Thali", "dinner": "Khichdi" }
    }
  }
  ```

---

### Update Menu
Edits menu records for an existing week and regenerates the PDF poster.

- **URL**: `/api/menu/:weekKey`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "menuData": { ... }
  }
  ```

---

### Delete Menu
Deletes all records and attached PDFs for a specific week key.

- **URL**: `/api/menu/:weekKey`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Week 202619 deleted successfully."
  }
  ```

---

## 5. Announcements & Community Broadcast

### Get Announcements
Fetches the 50 most recent announcements.

- **URL**: `/api/announcements`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "announcements": [
      {
        "_id": "66123abc...",
        "message": "Special dinner feast this Friday evening!",
        "createdAt": "2026-04-10T12:00:00.000Z"
      }
    ]
  }
  ```

---

### Post & Broadcast Announcement (Admin)
Publishes an announcement and immediately broadcasts it to all Telegram subscribers with active reminders.

- **URL**: `/api/announcements`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "message": "Canteen will remain closed on Sunday evening for deep cleaning."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Announcement created and mapped to 42 users successfully!",
    "announcement": { ... }
  }
  ```

---

## 6. System & Observability

### Health Check
- **URL**: `/api/health`
- **Method**: `GET`
- **Response**: `OK` (200)

---

### System Stats
Returns live runtime resource metrics, memory consumption, uptime, and database counts.

- **URL**: `/api/system/stats`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "timestamp": "2026-11-07T15:46:00.000Z",
    "uptime": "14h 22m 10s",
    "uptimeSeconds": 51730,
    "memory": {
      "rssMb": "84.32",
      "heapUsedMb": "42.10",
      "heapTotalMb": "65.50",
      "externalMb": "12.80"
    },
    "cpu": { "user": 1200000, "system": 340000 },
    "environment": "production",
    "nodeVersion": "v22.x",
    "platform": "win32",
    "stats": {
      "totalUsers": 128,
      "activeReminders": 114,
      "totalMenus": 26
    }
  }
  ```

---

### Telemetry Logs
Queries recent structured events from the in-memory ring buffer.

- **URL**: `/api/system/logs`
- **Method**: `GET`
- **Query Parameters**:
  - `severity` *(optional)*: Filter by `INFO`, `WARN`, or `ERROR`.
  - `action` *(optional)*: Filter by event action (e.g., `dinner_poll.vote`).
  - `chatId` *(optional)*: Filter events for a specific Telegram user.
  - `limit` *(optional)*: Number of logs to return (1-200, default 50).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 2,
    "logs": [
      {
        "timestamp": "2026-11-07T15:45:00.000Z",
        "severity": "INFO",
        "action": "dinner_poll.vote",
        "message": "Vote recorded for 12345678 -> 20:00",
        "chatId": "12345678",
        "votedTime": "20:00",
        "date": "2026-11-07"
      }
    ]
  }
  ```
