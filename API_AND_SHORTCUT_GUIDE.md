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
