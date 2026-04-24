const PDFParser = require("pdf2json");
const { getWeekKey } = require("./utils");

function parseMenuFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", err => reject(err));

    pdfParser.on("pdfParser_dataReady", pdfData => {
      const items = [];
      pdfData.Pages.forEach(page => {
        page.Texts.forEach(t => {
          items.push({
            text: decodeURIComponent(t.R[0].T).trim(),
            x: t.x,
            y: t.y
          });
        });
      });

      const fullText = items.map(i => i.text).join(" ");
      // Handle 13/04/26 to 19/04/2026 or 13/04/2026 to 19/04/2026
      const weekRangeMatch = fullText.match(/(\d{2}\/\d{2}\/\d{2,4})\s+to\s+(\d{2}\/\d{2}\/\d{2,4})/i);

      let weekKey = null;
      if (weekRangeMatch) {
        const startDateStr = weekRangeMatch[1];
        const p = startDateStr.split("/");
        const d = p[0];
        const m = p[1];
        const y = p[2];
        const fullYear = y.length === 2 ? `20${y}` : y;
        const startDate = new Date(`${fullYear}-${m}-${d}`);
        weekKey = getWeekKey(startDate);
      }

      const menu = buildMenu(items);
      resolve({ menu, weekKey });
    });

    pdfParser.loadPDF(filePath);
  });
}

function buildMenu(items) {
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

  // 1. Detect Headers
  const headers = {};
  items.forEach(item => {
    const t = item.text.toUpperCase();
    if (t === "BREAKFAST") headers.breakfast = item.x;
    if (t === "LUNCH") headers.lunch = item.x;
    if (t === "DINNER") headers.dinner = item.x;
  });

  // 2. Detect Day Anchors
  const anchors = [];
  items.forEach(item => {
    const t = item.text.toUpperCase();
    const day = days.find(d => t === d || t.startsWith(d + " "));
    if (day) {
      anchors.push({ day: capitalize(day), y: item.y });
    }
  });

  if (anchors.length === 0) return {};

  // Sort anchors by Y
  anchors.sort((a, b) => a.y - b.y);

  // 3. Define Column Boundries
  // Breakfast usually around x=9, Lunch x=18, Dinner x=33
  // We use midpoints between headers
  const midBL = (headers.breakfast + headers.lunch) / 2 || 14;
  const midLD = (headers.lunch + headers.dinner) / 2 || 28;

  const menu = {};
  anchors.forEach((anchor, index) => {
    // Calculate true cell boundaries using geometric midpoints!
    // Since day labels (e.g. "MONDAY") are vertically centered, the actual cell divider
    // is exactly directly halfway between two adjacent day labels.
    const startY = index === 0
      ? anchor.y - ((anchors[1]?.y - anchor.y) / 2)
      : (anchors[index - 1].y + anchor.y) / 2;

    const nextY = index === anchors.length - 1
      ? anchor.y + ((anchor.y - anchors[index - 1].y) / 2)
      : (anchor.y + anchors[index + 1].y) / 2;

    const dayItems = items.filter(item => item.y >= startY && item.y < nextY);

    const dayData = { date: "", breakfast: [], lunch: [], dinner: [] };

    dayItems.forEach(item => {
      const t = item.text;
      const tUpper = t.toUpperCase();

      // Is this the date? (e.g. 13-04)
      if (/\b\d{2}-\d{2}\b/.test(t) && !dayData.date) {
        dayData.date = t;
        return;
      }

      // Ignore labels
      if (days.includes(tUpper) || ["BREAKFAST", "LUNCH", "DINNER", "TIME", "7:30AM", "11:00AM", "08:00PM"].some(lbl => tUpper.includes(lbl))) {
        return;
      }

      // Assign to column
      if (item.x < midBL) {
        dayData.breakfast.push(t);
      } else if (item.x < midLD) {
        dayData.lunch.push(t);
      } else {
        dayData.dinner.push(t);
      }
    });

    menu[anchor.day] = {
      date: dayData.date,
      breakfast: cleanArray(dayData.breakfast),
      lunch: cleanArray(dayData.lunch),
      dinner: cleanArray(dayData.dinner)
    };
  });

  return menu;
}

function cleanArray(arr) {
  if (!arr || arr.length === 0) return "";
  return arr.map(text => {
    return text
      .replace(/\b(BREAKFAST|LUNCH|DINNER|TIME|TO)\b/gi, "")
      // Strip redundant leading day names bleeding into meal boxes e.g., "MONDAY - POHA" -> "POHA"
      .replace(/\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b\s*[-–]?\s*/gi, "")
      .replace(/\s+/g, " ")
      .replace(/^OFF$/i, "❌ OFF")
      .trim();
  }).filter(t => t.length > 0).join(" ");
}

function capitalize(w) { return w.charAt(0) + w.slice(1).toLowerCase(); }

module.exports = { parseMenuFromPDF };
