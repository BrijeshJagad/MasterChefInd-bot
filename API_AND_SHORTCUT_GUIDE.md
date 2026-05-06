# MasterChef Canteen API & iOS Shortcut Guide

## 1. New API Endpoints

### A. Next Meal Endpoint
**Endpoint:** `GET /api/next-meal`  
**Description:** Dynamically fetches the *upcoming* meal based on the current Indian Standard Time (IST). 
- **Before 10:00 AM**: Returns Today's Breakfast
- **10:00 AM – 3:00 PM**: Returns Today's Lunch
- **3:00 PM – 10:30 PM**: Returns Today's Dinner
- **After 10:30 PM**: Automatically rolls over to Tomorrow's Breakfast.

**Response Format:**
```json
{
  "success": true,
  "day": "Wednesday",
  "meal": "lunch",
  "menu": "Paneer Butter Masala, Roti, Rice, Dal, Salad"
}
```

### B. All Weeks Data Endpoint
**Endpoint:** `GET /api/all-weeks-data`  
**Description:** Returns the complete JSON history of all weekly menus stored in the database. It excludes the bulky PDF binary data, making the payload lightweight and fast.

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "weekKey": "202619",
      "data": {
        "MONDAY": { "date": "05/04", "breakfast": "...", "lunch": "...", "dinner": "..." },
        "TUESDAY": { ... }
      }
    }
  ]
}
```

---

## 2. Setting Up an iPhone Shortcut for "Next Meal"

You can create an iOS Shortcut to quickly show you what's cooking next directly from your home screen, Lock Screen widget, or via Siri (e.g., by saying, *"Hey Siri, Canteen Menu"*).

### Prerequisites
Make sure your app is hosted and you have your live URL (e.g., `https://masterchefind-bot.onrender.com`).

### Step-by-step Guide

1. **Open the Shortcuts App** on your iPhone.
2. Tap the **+** button in the top right corner to create a new Shortcut.
3. **Fetch the Data:**
   - Tap **Add Action**.
   - Search for **"Get Contents of URL"** and tap it.
   - In the URL field, type your live endpoint: `https://YOUR_DOMAIN.com/api/next-meal` (Replace `YOUR_DOMAIN` with your Render URL).
4. **Extract the Meal Name:**
   - Tap the Search bar at the bottom and search for **"Get Dictionary Value"**.
   - Configure it to: Get `Value` for key `meal` in `Contents of URL`.
   - *Optional:* Tap the magic wand to rename this variable to "MealName".
5. **Extract the Menu:**
   - Add another **"Get Dictionary Value"** action.
   - Tap the default variable it selected, clear it, choose **Select Magic Variable**, and tap the original `Contents of URL` output.
   - Configure it to: Get `Value` for key `menu` in `Contents of URL`.
   - *Optional:* Rename this variable to "MealMenu".
6. **Extract the Day (Optional):**
   - Add one more **"Get Dictionary Value"**.
   - Use Magic Variable again to select `Contents of URL`.
   - Configure it to: Get `Value` for key `day` in `Contents of URL`.
7. **Display the Result:**
   - Tap the Search bar and search for **"Show Result"** (or "Show Alert").
   - In the text box, format your alert using the variables you extracted. It should look something like this:
     ```
     📅 Day: [Dictionary Value (day)]
     🍽️ Next: [Dictionary Value (meal)]
     
     Menu:
     [Dictionary Value (menu)]
     ```
8. **Finalize the Shortcut:**
   - Tap the name at the very top to rename it (e.g., *"Canteen Menu"*). 
   - Choose a custom icon and color if you wish.
   - Tap the Share icon at the bottom and select **"Add to Home Screen"** for quick access!

Now, whenever you tap the Shortcut icon on your home screen or say your Shortcut's name to Siri, it will instantly fetch and display the upcoming meal!

---

## 3. Setting Up an Android Home Screen Shortcut

Unlike iOS, Android doesn't have a native "Shortcuts" app that easily parses JSON out-of-the-box, but you can achieve the exact same 1-tap Home Screen functionality using a highly trusted, free app.

### Prerequisites
Download the free **"HTTP Request Shortcuts"** app from the Google Play Store (by Wako).

### Step-by-step Guide

1. **Create a New Shortcut:**
   - Open the app and tap the **+** button.
   - Choose **New regular Shortcut**.
   - **Name:** "Canteen Menu" (or whatever you prefer).
   - **Description:** "Fetches the next meal."
2. **Basic Request Settings:**
   - **Method:** `GET`
   - **URL:** `https://YOUR_DOMAIN.com/api/next-meal` (Replace `YOUR_DOMAIN` with your Render URL).
3. **Response Handling (The Magic):**
   - Tap on the **Response Handling** tab at the top.
   - Under "Success Handling", change **"Show response in:"** from "Window" to **"Toast"** or **"Dialog"** (Dialog is better for longer menus).
   - Scroll down to **"Run Script (On Success)"** and tap it.
4. **Add the Formatting Script:**
   - Paste the following simple JavaScript to parse the JSON and show a clean alert:
     ```javascript
     const res = JSON.parse(response.body);
     if (res.success) {
         const msg = "📅 Day: " + res.day + "\n🍽️ Next: " + res.meal.toUpperCase() + "\n\nMenu:\n" + res.menu;
         showDialog(msg, "What's Cooking?");
     } else {
         showToast("Failed to fetch menu.");
     }
     ```
   - Tap the checkmark to save the script.
5. **Finalize and Add to Home Screen:**
   - Go back to the main Shortcut creation screen.
   - Tap the checkmark at the top right to save the Shortcut entirely.
   - You will now see it in your list. **Long-press** the shortcut in the list and select **"Place on Home Screen"**.

Now, you have a beautiful 1-tap widget on your Android home screen! Tapping it runs the request in the background and instantly pops up a clean dialog box with your next meal.

---

## 4. Setting Up a "Live" Android Widget (No Tapping Required)

If you want the menu to just be visible on your home screen at all times without tapping anything, you need a custom widget app that can read APIs. **KWGT (Kustom Widget Maker)** is the most popular free app for this.

### Step-by-step Guide for a Live Widget:

1. **Install KWGT:** Download **KWGT Kustom Widget Maker** from the Play Store.
2. **Add a Widget to Home Screen:**
   - Long-press on your Android home screen.
   - Select **Widgets**, scroll to KWGT, and drag a standard size (e.g., `2x2` or `4x2`) onto your screen.
   - Tap the empty widget to open the KWGT editor.
3. **Create the Layout:**
   - Tap **Create** or choose a blank preset.
   - Tap the **+** icon in the top right to add a new **Text** element.
4. **Fetch the API Data (The Formula):**
   - Tap on the Text element you just added, then tap the **Text** field to edit its formula.
   - Erase the default time text and use KWGT's Web Get (`wg`) formula to fetch and parse the JSON directly:
     ```text
     Next: $wg("https://YOUR_DOMAIN.com/api/next-meal", json, ".meal")$
     
     $wg("https://YOUR_DOMAIN.com/api/next-meal", json, ".menu")$
     ```
   - *(Replace `YOUR_DOMAIN` with your live Render URL).*
5. **Customize & Save:**
   - Change the font, size, and color to your liking under the *Paint* and *Font* tabs.
   - Tap the **Save (Floppy Disk)** icon at the top right.
   - Go back to your home screen!

Your Android home screen now permanently displays the upcoming meal, and KWGT will automatically refresh it in the background!
