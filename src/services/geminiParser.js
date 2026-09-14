const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const pdfjs = require("pdfjs-dist");
const { getWeekKey } = require("./utils");
const { parseMenuFromPDF } = require("./parser");

// Candidate models in prioritized order:
// Latest requested models first (3.8, 3.7), followed by Google's recommended 3.6-flash,
// followed by stable GA 2.0-flash series and 1.5-flash-latest
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest"
];

/**
 * Validates that a parsed menu object contains real dish names and not empty placeholders.
 */
function hasValidMealData(menu) {
  if (!menu || typeof menu !== "object") return false;
  let count = 0;
  for (const day of Object.values(menu)) {
    if (!day || typeof day !== "object") continue;
    for (const meal of ["breakfast", "lunch", "dinner"]) {
      const val = (day[meal] || "").trim();
      if (val && val !== "—" && val !== "--" && val !== "-") {
        count++;
      }
    }
  }
  return count >= 3;
}

/**
 * Direct REST API fallback for Gemini if SDK fails or experiences version mismatches.
 */
async function callGeminiRest(apiKey, modelName, fileBuffer, mimeType, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "application/pdf",
              data: fileBuffer.toString("base64")
            }
          },
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Extracts weekly menu from PDF using pdfjs-dist coordinate analysis.
 * Immune to XRef stream errors that crash legacy parsers like pdf2json.
 */
async function parseWithPdfJs(fileBuffer) {
  try {
    const data = new Uint8Array(fileBuffer);
    const doc = await pdfjs.getDocument({ data });

    let allItems = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const tc = await page.getTextContent();
      const pageItems = tc.items.map(i => ({
        text: (i.str || "").trim(),
        y: Math.round(i.transform[4]),
        x: Math.round(i.transform[5])
      })).filter(i => i.text.length > 0);
      allItems = allItems.concat(pageItems);
    }

    if (allItems.length === 0) return null;

    const fullText = allItems.map(i => i.text).join(" ");
    const weekRangeMatch = fullText.match(/(\d{2}[-/]\d{2}[-/]\d{2,4})\s+to\s+(\d{2}[-/]\d{2}[-/]\d{2,4})/i);
    let weekKey = null;
    if (weekRangeMatch) {
      const p = weekRangeMatch[1].split(/[-/]/);
      const d = p[0];
      const m = p[1];
      const y = p[2].length === 2 ? "20" + p[2] : p[2];
      const startDate = new Date(`${y}-${m}-${d}`);
      if (!isNaN(startDate.getTime())) {
        weekKey = getWeekKey(startDate);
      }
    }
    if (!weekKey) weekKey = getWeekKey();

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayAnchors = [];
    days.forEach(d => {
      const upper = d.toUpperCase();
      const found = allItems.find(i => i.text.toUpperCase().includes(upper));
      if (found) {
        dayAnchors.push({ day: d, y: found.y, x: found.x });
      }
    });

    if (dayAnchors.length === 0) return null;

    dayAnchors.sort((a, b) => a.y - b.y);

    let bX = 157, lX = 295, dX = 536;
    allItems.forEach(item => {
      const u = item.text.toUpperCase();
      if (u === "BREAKFAST") bX = item.x;
      if (u === "LUNCH") lX = item.x;
      if (u === "DINNER") dX = item.x;
    });

    const midBL = (bX + lX) / 2 || 230;
    const midLD = (lX + dX) / 2 || 450;

    function cleanMeal(arr) {
      const text = arr.join(" ")
        .replace(/\b(BREAKFAST|LUNCH|DINNER|TIME|TO)\b/gi, "")
        .replace(/\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b\s*[-–]?\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) return "—";
      if (/^OFF$/i.test(text)) return "❌ OFF";
      return text;
    }

    const menu = {};
    for (let i = 0; i < dayAnchors.length; i++) {
      const curr = dayAnchors[i];
      const prev = dayAnchors[i - 1];
      const next = dayAnchors[i + 1];

      const minY = prev ? (prev.y + curr.y) / 2 : curr.y - 15;
      const maxY = next ? (curr.y + next.y) / 2 : curr.y + 35;

      const rowItems = allItems.filter(it => it.y >= minY && it.y < maxY);

      let date = "";
      const dateItem = rowItems.find(it => /^\d{2}[-/]\d{2}$/.test(it.text));
      if (dateItem) date = dateItem.text;

      const mealItems = rowItems.filter(it => {
        const u = it.text.toUpperCase();
        return !days.some(d => u.includes(d.toUpperCase())) && !/^\d{2}[-/]\d{2}$/.test(u) && !u.includes("TIME");
      });

      const bItems = mealItems.filter(it => it.x < midBL).map(it => it.text);
      const lItems = mealItems.filter(it => it.x >= midBL && it.x < midLD).map(it => it.text);
      const dItems = mealItems.filter(it => it.x >= midLD).map(it => it.text);

      menu[curr.day] = {
        date,
        breakfast: cleanMeal(bItems),
        lunch: cleanMeal(lItems),
        dinner: cleanMeal(dItems)
      };
    }

    return { menu, weekKey: String(weekKey) };
  } catch (err) {
    console.warn("⚠️ pdfjs-dist extraction issue:", err.message);
    return null;
  }
}

/**
 * Parses menu from PDF or Image buffer using Gemini AI (Multimodal),
 * with retry logic, rate-limit tolerance, and reliable fallback.
 *
 * @param {Buffer} fileBuffer - The binary buffer of the PDF or image.
 * @param {string} mimeType - The mime type (e.g. application/pdf, image/png, image/jpeg)
 * @param {string} [filePath] - Optional fallback local file path
 * @returns {Promise<{ menu: Object, weekKey: string }>}
 */
async function parseMenuWithGemini(fileBuffer, mimeType = "application/pdf", filePath = null) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert OCR and canteen menu extractor.
Analyze this canteen menu document/image and extract the full weekly meal schedule.

Return a STRICT, RAW JSON object (no markdown formatting, no code blocks, no backticks, just pure valid JSON).

The JSON structure MUST strictly be:
{
  "weekKey": "YYYYWW", // e.g. "202616" representing the ISO 4-digit Year and 2-digit Week Number based on the dates in the menu. If uncertain, calculate from the starting date.
  "menu": {
    "Monday": {
      "date": "DD-MM", // e.g. "13-04"
      "breakfast": "Meal items for breakfast",
      "lunch": "Meal items for lunch",
      "dinner": "Meal items for dinner"
    },
    "Tuesday": {
      "date": "DD-MM",
      "breakfast": "...",
      "lunch": "...",
      "dinner": "..."
    },
    "Wednesday": {
      "date": "DD-MM",
      "breakfast": "...",
      "lunch": "...",
      "dinner": "..."
    },
    "Thursday": {
      "date": "DD-MM",
      "breakfast": "...",
      "lunch": "...",
      "dinner": "..."
    },
    "Friday": {
      "date": "DD-MM",
      "breakfast": "...",
      "lunch": "...",
      "dinner": "..."
    },
    "Saturday": {
      "date": "DD-MM",
      "breakfast": "...",
      "lunch": "...",
      "dinner": "..."
    },
    "Sunday": {
      "date": "DD-MM",
      "breakfast": "...",
      "lunch": "...",
      "dinner": "..."
    }
  }
}

Rules:
1. Always include all 7 days (Monday through Sunday).
2. If a day or meal is marked OFF/CLOSED/HOLIDAY, set the value to "❌ OFF".
3. Clean up dish names and separate multiple items with appropriate spacing or hyphens.
4. Extract the actual dish names shown in the menu. Do NOT return empty dashes ("—" or "--") if dishes are visible in the document.
5. If no date is found for a day, format as empty string "".`;

    const contents = [
      {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: fileBuffer.toString("base64")
        }
      },
      prompt
    ];

    for (const modelName of CANDIDATE_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`🤖 Attempting menu extraction with Gemini (${modelName}) [attempt ${attempt}]...`);
          
          let responseText = "";
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                responseMimeType: "application/json"
              }
            });
            responseText = response.text || "";
          } catch (sdkErr) {
            console.warn(`⚠️ SDK call failed for ${modelName}, trying direct REST fallback:`, sdkErr.message);
            responseText = await callGeminiRest(apiKey, modelName, fileBuffer, mimeType, prompt);
          }

          console.log(`Gemini (${modelName}) Raw Response Length:`, responseText.length);

          const cleaned = responseText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

          const parsed = JSON.parse(cleaned);
          if (parsed && parsed.menu && hasValidMealData(parsed.menu)) {
            let finalWeekKey = parsed.weekKey;
            if (!finalWeekKey || !/^\d{6}$/.test(String(finalWeekKey))) {
              finalWeekKey = getWeekKey();
            }
            console.log(`✅ Successfully extracted menu using Gemini (${modelName}) for Week ${finalWeekKey}`);
            return {
              menu: parsed.menu,
              weekKey: String(finalWeekKey)
            };
          }
        } catch (aiErr) {
          const isBusy = aiErr.message && (aiErr.message.includes("503") || aiErr.message.includes("high demand") || aiErr.message.includes("429"));
          console.warn(`⚠️ Gemini model (${modelName}) [attempt ${attempt}] error:`, aiErr.message);
          if (isBusy && attempt === 1) {
            await new Promise(res => setTimeout(res, 1500));
            continue;
          }
          break; // Move to next candidate model
        }
      }
    }
  } else {
    console.log("ℹ️ No GEMINI_API_KEY detected, using built-in fallback parser.");
  }

  // Fallback 1: High-precision coordinate & text parser via pdfjs-dist
  console.log("📄 Attempting local pdfjs-dist extraction...");
  const pdfJsResult = await parseWithPdfJs(fileBuffer);
  if (pdfJsResult && hasValidMealData(pdfJsResult.menu)) {
    console.log(`✅ Successfully extracted menu using local pdfjs parser for Week ${pdfJsResult.weekKey}`);
    return pdfJsResult;
  }

  // Fallback 2: Try legacy pdf2json parser
  let localPdfPath = filePath;
  let tempCreated = false;
  if (!localPdfPath || !fs.existsSync(localPdfPath)) {
    localPdfPath = path.join(__dirname, `../../temp_fallback_${Date.now()}.pdf`);
    fs.writeFileSync(localPdfPath, fileBuffer);
    tempCreated = true;
  }

  try {
    const result = await parseMenuFromPDF(localPdfPath);
    if (tempCreated && fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);
    if (result && hasValidMealData(result.menu)) {
      console.log(`✅ Successfully extracted menu using pdf2json parser for Week ${result.weekKey}`);
      return result;
    }
  } catch (pdf2jsonErr) {
    console.warn("⚠️ pdf2json parser failed:", pdf2jsonErr.message || pdf2jsonErr.parserError);
    if (tempCreated && fs.existsSync(localPdfPath)) {
      try { fs.unlinkSync(localPdfPath); } catch (_) {}
    }
  }

  // If all strategies fail, throw error rather than returning empty dashes
  throw new Error("Could not extract meal items from the document. Please ensure the file is a clear, valid weekly canteen menu (PDF or image).");
}

module.exports = { parseMenuWithGemini, parseWithPdfJs };
