# MasterChef Canteen API & Mobile Shortcut Guide

This guide details the integration endpoints and setup instructions for building 1-tap mobile shortcuts and live widgets on **iOS (Apple Shortcuts & Siri)** and **Android (HTTP Shortcuts & KWGT)**.

For full REST API schemas, headers, and admin endpoints, refer to the [REST API Reference](docs/api-reference.md).

---

## 1. Core Integration Endpoints

### A. Next Meal Endpoint (Siri & Widget Optimized)
- **Endpoint**: `GET /api/next-meal`
- **Description**: Dynamically calculates and returns the *upcoming* meal based on Indian Standard Time (IST):
  - **Before 10:00 AM**: Today's Breakfast
  - **10:00 AM – 3:00 PM**: Today's Lunch
  - **3:00 PM – 10:30 PM**: Today's Dinner
  - **After 10:30 PM**: Tomorrow's Breakfast
- **Optional Query**: `?chatId=12345678` (factors in individual user reminder timing preferences)
- **Response Format**:
  ```json
  {
    "success": true,
    "day": "Wednesday",
    "meal": "lunch",
    "menu": "Paneer Butter Masala, Roti, Rice, Dal, Salad"
  }
  ```

---

### B. Today's Full Menu Endpoint
- **Endpoint**: `GET /api/today`
- **Description**: Returns all meals (Breakfast, Lunch, Dinner) for the current day in IST.
- **Response Format**:
  ```json
  {
    "success": true,
    "weekKey": "202619",
    "day": "WEDNESDAY",
    "date": "08/04",
    "breakfast": "Poha, Tea, Milk",
    "lunch": "Paneer Butter Masala, Roti, Dal, Rice, Salad",
    "dinner": "Khichdi Kadhi, Papad"
  }
  ```

---

### C. All Weeks Historical Data
- **Endpoint**: `GET /api/all-weeks-data`
- **Description**: Returns complete JSON history across all weekly menus stored in the database without binary PDF overhead.

---

### D. System Telemetry & Health Probe
- **Endpoint**: `GET /api/system/stats`
- **Description**: Returns real-time server metrics (memory RSS/heap, CPU, uptime, database count).
- **Endpoint**: `GET /api/health`
- **Description**: Lightweight health probe (returns `OK`).

---

## 2. Setting Up an iPhone Shortcut for "Next Meal" (iOS & Siri)

Create an iOS Shortcut to display what's cooking next directly from your Home Screen, Lock Screen widget, Apple Watch, or by asking Siri (*"Hey Siri, Canteen Menu"*).

### Prerequisites
Ensure your application is live and note your base URL (e.g., `https://masterchefind-bot.onrender.com`).

### Step-by-Step iOS Guide

1. **Open the Shortcuts App** on your iPhone or iPad.
2. Tap the **+** button in the top right corner to create a new Shortcut.
3. **Fetch Menu Data**:
   - Tap **Add Action**.
   - Search for **"Get Contents of URL"** and select it.
   - Enter your live URL: `https://YOUR_DOMAIN.com/api/next-meal`
4. **Extract the Meal Name**:
   - Add action: **"Get Dictionary Value"**.
   - Configure: Get `Value` for key `meal` in `Contents of URL`.
5. **Extract the Food Description**:
   - Add action: **"Get Dictionary Value"**.
   - Clear the input variable, select **Choose Magic Variable**, and select the original `Contents of URL`.
   - Configure: Get `Value` for key `menu` in `Contents of URL`.
6. **Extract the Day**:
   - Add action: **"Get Dictionary Value"**.
   - Select `Contents of URL` via Magic Variable.
   - Configure: Get `Value` for key `day` in `Contents of URL`.
7. **Display Result Alert**:
   - Add action: **"Show Result"** (or **"Show Notification"**).
   - Format the alert:
     ```
     📅 Day: [Dictionary Value (day)]
     🍽️ Upcoming: [Dictionary Value (meal)]
     
     Menu:
     [Dictionary Value (menu)]
     ```
8. **Save & Configure**:
   - Tap the name at the top to rename the shortcut to **"Canteen Menu"**.
   - Choose a custom icon (e.g., fork & knife) and theme color.
   - Tap Share and select **"Add to Home Screen"**.

Now you can say:
> *"Hey Siri, Canteen Menu"*  
and Siri will read your upcoming meal aloud!

---

## 3. Setting Up an Android Home Screen Shortcut

On Android, you can create a 1-tap Home Screen shortcut using the trusted, free **"HTTP Request Shortcuts"** app.

### Prerequisites
Install **"HTTP Request Shortcuts"** by Wako from Google Play Store.

### Step-by-Step Android Shortcut Guide

1. **Create a New Shortcut**:
   - Open the app and tap the **+** button.
   - Select **New regular Shortcut**.
   - Name: `Canteen Menu`
   - Description: `Fetches upcoming meal`
2. **Configure HTTP Request**:
   - Method: `GET`
   - URL: `https://YOUR_DOMAIN.com/api/next-meal`
3. **Configure Response Handling**:
   - Switch to the **Response Handling** tab at the top.
   - Change **Show response in:** to **Dialog**.
   - Tap **Run Script (On Success)** and paste the following snippet:
     ```javascript
     const res = JSON.parse(response.body);
     if (res.success) {
         const msg = "📅 Day: " + res.day + "\n🍽️ Next: " + res.meal.toUpperCase() + "\n\nMenu:\n" + res.menu;
         showDialog(msg, "MasterChef Canteen");
     } else {
         showToast("Failed to fetch menu.");
     }
     ```
4. **Place on Home Screen**:
   - Save the shortcut by tapping the checkmark.
   - In the shortcut list, long-press **Canteen Menu** and select **Place on Home Screen**.

---

## 4. Setting Up an Always-On Android Widget (KWGT)

To permanently display the upcoming meal on your Android home screen without tapping anything, use **KWGT (Kustom Widget Maker)**.

### Step-by-Step Live Widget Setup

1. **Install KWGT**: Download **KWGT Kustom Widget Maker** from the Play Store.
2. **Add Widget to Home Screen**:
   - Long-press your home screen, select **Widgets**, and drag a KWGT widget (e.g., `4x2`).
   - Tap the empty widget to enter the KWGT editor.
3. **Add Layout & Formula**:
   - Tap **+** to add a **Text** element.
   - Tap the Text element and edit its formula.
   - Use KWGT's Web Get (`wg`) function:
     ```text
     🍽️ Next: $wg("https://YOUR_DOMAIN.com/api/next-meal", json, ".meal")$ ($wg("https://YOUR_DOMAIN.com/api/next-meal", json, ".day")$)
     
     $wg("https://YOUR_DOMAIN.com/api/next-meal", json, ".menu")$
     ```
4. **Save**:
   - Customize font size and color under the *Paint* tab.
   - Tap the **Save** icon at the top right.

The widget automatically synchronizes and updates throughout the day!
