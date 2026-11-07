# Apple Shortcuts Integration Guide 🍎

Use the MasterChefInd Bot API to check today's menu directly from your iPhone Home Screen, Siri, or Apple Watch.

## API Endpoint
`GET https://[YOUR-BOT-URL]/api/today`

## Setup Guide

1.  **Open Shortcuts App**: Create a new shortcut.
2.  **Add Action**: "Get Contents of URL".
    -   Address: `https://[YOUR-BOT-URL]/api/today`
3.  **Add Action**: "Get Dictionary from Input".
4.  **Add Action**: "Get Value for `formatted` in Dictionary".
5.  **Add Action**: "Show Result".

## Features
-   **Siri**: Say "Hey Siri, Today's Menu" to have the menu read or displayed.
-   **Widget**: Add the shortcut to your Home Screen widget for a one-tap menu check.
-   **Watch**: Run the shortcut from your Apple Watch.

## Response Structure
The API returns a JSON object:
```json
{
  "success": true,
  "day": "MONDAY",
  "date": "06-04",
  "breakfast": "...",
  "lunch": "...",
  "dinner": "...",
  "formatted": "..."
}
```
> [!TIP]
> Use the `formatted` field for a quick summary, or parse the individual meal fields for a custom display!
