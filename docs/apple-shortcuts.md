# Apple Shortcuts & Siri Integration Guide 🍎

Integrate MasterChef directly into iOS, iPadOS, watchOS, and macOS to query upcoming meals using Siri, interactive Lock Screen widgets, or Action Button triggers.

---

## 1. Endpoints for iOS Shortcuts

### Option A: Next Upcoming Meal (Recommended)
Automatically calculates whether you need Breakfast, Lunch, or Dinner based on current Indian Standard Time (IST):
```
GET https://[YOUR-BOT-URL]/api/next-meal
```

**JSON Response Schema**:
```json
{
  "success": true,
  "day": "Wednesday",
  "meal": "lunch",
  "menu": "Paneer Butter Masala, Roti, Rice, Dal, Salad"
}
```

### Option B: Complete Today's Menu
Fetches all meals for the day:
```
GET https://[YOUR-BOT-URL]/api/today
```

**JSON Response Schema**:
```json
{
  "success": true,
  "weekKey": "202619",
  "day": "WEDNESDAY",
  "date": "08/04",
  "breakfast": "...",
  "lunch": "...",
  "dinner": "..."
}
```

---

## 2. Step-by-Step Setup in Apple Shortcuts

### Building the "Next Meal" Shortcut

1. **Open Shortcuts App**: Tap the **+** button in the top right to create a new shortcut.
2. **Action 1 — Get URL**:
   - Add action: **URL**
   - Value: `https://your-bot-domain.com/api/next-meal` *(replace with your production URL)*.
3. **Action 2 — Fetch JSON**:
   - Add action: **Get Contents of URL**
   - Method: `GET`
4. **Action 3 — Extract Meal**:
   - Add action: **Get Dictionary Value**
   - Key: `meal`
   - In: `Contents of URL`
5. **Action 4 — Extract Menu Description**:
   - Add action: **Get Dictionary Value**
   - Key: `menu`
   - In: `Contents of URL`
6. **Action 5 — Display Alert**:
   - Add action: **Show Result** (or **Show Notification**)
   - Text:
     ```
     🍽️ Upcoming: [Dictionary Value (meal)]
     
     Menu:
     [Dictionary Value (menu)]
     ```
7. **Name Your Shortcut**: Rename it to **"Canteen Menu"** or **"Next Meal"**.

---

## 3. Siri & Hands-Free Interaction

Once named **"Canteen Menu"**:
- **Siri Voice Command**: Say *"Hey Siri, Canteen Menu"*. Siri fetches the endpoint and reads your upcoming meal aloud.
- **iPhone Action Button (iPhone 15 Pro & newer)**: In iOS Settings → Action Button → Shortcut → select **"Canteen Menu"** for instant 1-press menu preview.
- **Apple Watch**: The shortcut appears automatically in the Apple Watch Shortcuts app and can be placed as a Smart Stack complication.
- **Home Screen & Lock Screen Widget**: Add a 1x1 Shortcuts widget directly to your Home Screen or Lock Screen for instant one-tap access.
