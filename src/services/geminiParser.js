const { GoogleGenAI } = require("@google/genai");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

let pdfjsInstance = null;
async function getPdfJs() {
  if (pdfjsInstance) return pdfjsInstance;
  try {
    pdfjsInstance = await import("pdfjs-dist/legacy/build/pdf.mjs");
    return pdfjsInstance;
  } catch (e1) {
    try {
      pdfjsInstance = require("pdfjs-dist");
      return pdfjsInstance;
    } catch (e2) {
      return null;
    }
  }
}

const { getWeekKey } = require("./utils");
const { parseMenuFromPDF } = require("./parser");
const logger = require("./logger");

// Prioritized Gemini AI models supporting multimodal OCR & JSON extraction on the Free Tier:
// 1. gemini-2.5-flash: Latest premier production model (multimodal PDF/image, JSON mode, Free Tier)
// 2. gemini-2.0-flash: Stable GA workhorse (multimodal PDF/image, 15 RPM / 1,500 RPD, Free Tier)
// 3. gemini-2.0-flash-lite: Ultra-fast low latency multimodal model on Free Tier
// 4. gemini-1.5-flash & gemini-1.5-flash-8b: Proven production multimodal models on Free Tier
// 5. gemini-2.5-pro & gemini-1.5-pro: Deep reasoning multimodal models on Free Tier (lower RPM limits)
// 6. Next-gen experimental/preview candidates
const CANDIDATE_GEMINI_MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-latest",
  "gemini-2.5-pro",
  "gemini-1.5-pro",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash"
];

// High-speed Groq LPU Vision Models (Free Tier, ultra-low latency ~1s)
const CANDIDATE_GROQ_MODELS = [
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
  "qwen/qwen3.8-27b"
];

// OpenAI Multimodal Models for Vision OCR fallback
const CANDIDATE_OPENAI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini"
];

const MENU_EXTRACTION_PROMPT = `You are an expert OCR and canteen menu extractor.
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
 * Direct REST API fallback for Gemini if SDK experiences version mismatches or connection issues.
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
 * Multimodal extraction via OpenAI (gpt-4o / gpt-4o-mini)
 */
async function parseMenuWithOpenAI(fileBuffer, mimeType = "image/jpeg") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const isImage = mimeType.startsWith("image/");
  
  if (!isImage) {
    // OpenAI vision accepts image formats (JPEG, PNG, WEBP, GIF)
    return null;
  }

  const base64Data = fileBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  for (const modelName of CANDIDATE_OPENAI_MODELS) {
    try {
      console.log(`🤖 Attempting menu extraction with OpenAI (${modelName})...`);
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: MENU_EXTRACTION_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const responseText = response.choices?.[0]?.message?.content || "";
      const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.menu && hasValidMealData(parsed.menu)) {
        let finalWeekKey = parsed.weekKey;
        if (!finalWeekKey || !/^\d{6}$/.test(String(finalWeekKey))) {
          finalWeekKey = getWeekKey();
        }
        logger.info("openai.ocr_success", `Extracted menu for Week ${finalWeekKey} using ${modelName}`, {
          action: "openai.ocr_success",
          model: modelName,
          weekKey: String(finalWeekKey)
        });
        return {
          menu: parsed.menu,
          weekKey: String(finalWeekKey)
        };
      }
    } catch (err) {
      console.warn(`⚠️ OpenAI model (${modelName}) error:`, err.message);
    }
  }

  return null;
}

/**
 * Ultra-fast Multimodal vision extraction via Groq (Free Tier, LPU accelerated, <1.5s latency)
 */
async function parseMenuWithGroq(fileBuffer, mimeType = "image/jpeg") {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const isImage = mimeType && mimeType.startsWith("image/");
  if (!isImage) return null;

  const groq = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1"
  });

  const base64Data = fileBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  for (const modelName of CANDIDATE_GROQ_MODELS) {
    try {
      console.log(`⚡ Attempting ultra-fast menu extraction with Groq (${modelName})...`);
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: MENU_EXTRACTION_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const responseText = response.choices?.[0]?.message?.content || "";
      const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.menu && hasValidMealData(parsed.menu)) {
        let finalWeekKey = parsed.weekKey;
        if (!finalWeekKey || !/^\d{6}$/.test(String(finalWeekKey))) {
          finalWeekKey = getWeekKey();
        }
        logger.info("groq.ocr_success", `Extracted menu for Week ${finalWeekKey} using Groq ${modelName}`, {
          action: "groq.ocr_success",
          model: modelName,
          weekKey: String(finalWeekKey)
        });
        return {
          menu: parsed.menu,
          weekKey: String(finalWeekKey)
        };
      }
    } catch (err) {
      console.warn(`⚠️ Groq model (${modelName}) error:`, err.message);
    }
  }

  return null;
}

/**
 * Extracts weekly menu from PDF using pdfjs-dist coordinate analysis.
 * Immune to XRef stream errors that crash legacy parsers like pdf2json.
 */
async function parseWithPdfJs(fileBuffer) {
  const pdfLib = await getPdfJs();
  if (!pdfLib) {
    console.warn("⚠️ pdfjs-dist is not installed, skipping pdfjs extraction.");
    return null;
  }
  try {
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfLib.getDocument({ data, isEvalSupported: false, useSystemFonts: true, disableFontFace: true });
    const doc = await loadingTask.promise;

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

    let bX = 187, lX = 391, dX = 633;
    allItems.forEach(item => {
      const u = item.text.toUpperCase();
      if (u === "BREAKFAST") bX = item.x;
      if (u === "LUNCH") lX = item.x;
      if (u === "DINNER") dX = item.x;
    });

    const midBL = (bX + lX) / 2 || 289;
    const midLD = (lX + dX) / 2 || 512;

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

      const minY = prev ? (prev.y + curr.y) / 2 : curr.y - 25;
      const maxY = next ? (curr.y + next.y) / 2 : curr.y + 25;

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
 * Parses menu from PDF or Image buffer using Gemini AI (Multimodal) and OpenAI fallback,
 * with retry logic, rate-limit tolerance, and reliable local parser fallback.
 *
 * @param {Buffer} fileBuffer - The binary buffer of the PDF or image.
 * @param {string} mimeType - The mime type (e.g. application/pdf, image/png, image/jpeg)
 * @param {string} [filePath] - Optional fallback local file path
 * @returns {Promise<{ menu: Object, weekKey: string }>}
 */
async function parseMenuWithGemini(fileBuffer, mimeType = "application/pdf") {
  // Strategy 1: Instant Local Parser for PDFs (0s Latency, 100% Free & Offline)
  if (!mimeType || mimeType === "application/pdf") {
    console.log("⚡ Checking local coordinate parser first for instant PDF extraction...");
    try {
      const pdfJsResult = await parseWithPdfJs(fileBuffer);
      if (pdfJsResult && hasValidMealData(pdfJsResult.menu)) {
        console.log(`✅ Instant local extraction succeeded for Week ${pdfJsResult.weekKey} (<100ms)!`);
        return pdfJsResult;
      }
    } catch (e) {
      console.warn("Local PDF parser skipped:", e.message);
    }
  }

  // Strategy 2: Ultra-Fast Groq LPU Vision (<1.5s, Free Tier)
  if (process.env.GROQ_API_KEY && mimeType && mimeType.startsWith("image/")) {
    const groqResult = await parseMenuWithGroq(fileBuffer, mimeType);
    if (groqResult && hasValidMealData(groqResult.menu)) {
      console.log(`✅ Groq ultra-fast extraction succeeded for Week ${groqResult.weekKey}`);
      return groqResult;
    }
  }

  // Strategy 3: Google Gemini API (Multimodal Free Tier)
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (geminiApiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const contents = [
      {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: fileBuffer.toString("base64")
        }
      },
      MENU_EXTRACTION_PROMPT
    ];

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
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
            responseText = await callGeminiRest(geminiApiKey, modelName, fileBuffer, mimeType, MENU_EXTRACTION_PROMPT);
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
            logger.info("gemini.ocr_success", `Extracted menu for Week ${finalWeekKey} using ${modelName}`, {
              action: "gemini.ocr_success",
              model: modelName,
              weekKey: String(finalWeekKey),
              bufferSize: fileBuffer.length
            });
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
    console.log("ℹ️ No GEMINI_API_KEY detected, checking alternative AI models or built-in fallback parser.");
  }

  // Strategy 4: OpenAI Vision if configured
  if (process.env.OPENAI_API_KEY && mimeType && mimeType.startsWith("image/")) {
    const openAiResult = await parseMenuWithOpenAI(fileBuffer, mimeType);
    if (openAiResult && hasValidMealData(openAiResult.menu)) {
      console.log(`✅ Successfully extracted menu using OpenAI for Week ${openAiResult.weekKey}`);
      return openAiResult;
    }
  }

  // Strategy 5: Secondary check on local pdfjs parser (if not attempted earlier)
  if (mimeType && mimeType.startsWith("application/pdf")) {
    console.log("📄 Attempting local pdfjs-dist extraction...");
    const pdfJsResult = await parseWithPdfJs(fileBuffer);
    if (pdfJsResult && hasValidMealData(pdfJsResult.menu)) {
      console.log(`✅ Successfully extracted menu using local pdfjs parser for Week ${pdfJsResult.weekKey}`);
      return pdfJsResult;
    }
  }

  // Strategy 6: Legacy pdf2json parser using a randomized isolated temp file
  const safeTempFile = path.join(os.tmpdir(), `masterchef_${Date.now()}_${crypto.randomBytes(16).toString("hex")}.pdf`);
  try {
    fs.writeFileSync(safeTempFile, fileBuffer);
    const result = await parseMenuFromPDF(safeTempFile);
    if (result && hasValidMealData(result.menu)) {
      console.log(`✅ Successfully extracted menu using pdf2json parser for Week ${result.weekKey}`);
      return result;
    }
  } catch (pdf2jsonErr) {
    console.warn("⚠️ pdf2json parser failed:", pdf2jsonErr.message || pdf2jsonErr.parserError);
  } finally {
    try {
      if (fs.existsSync(safeTempFile)) {
        fs.unlinkSync(safeTempFile);
      }
    } catch (_) {}
  }

  // If all strategies fail, throw error rather than returning empty dashes
  throw new Error("Could not extract meal items from the document. Please ensure the file is a clear, valid weekly canteen menu (PDF or image).");
}

module.exports = { parseMenuWithGemini, parseMenuWithGroq, parseMenuWithOpenAI, parseWithPdfJs, CANDIDATE_GEMINI_MODELS, CANDIDATE_GROQ_MODELS, CANDIDATE_OPENAI_MODELS };
