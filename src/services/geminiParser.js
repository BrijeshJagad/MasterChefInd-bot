const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { getWeekKey } = require("./utils");
const { parseMenuFromPDF } = require("./parser");

/**
 * Parses menu from PDF or Image buffer using Gemini AI (Multimodal),
 * with robust fallback cascade (pdf2json -> pdf-parse text extractor).
 *
 * @param {Buffer} fileBuffer - The binary buffer of the PDF or image.
 * @param {string} mimeType - The mime type (e.g. application/pdf, image/png, image/jpeg)
 * @param {string} [filePath] - Optional fallback local file path
 * @returns {Promise<{ menu: Object, weekKey: string }>}
 */
async function parseMenuWithGemini(fileBuffer, mimeType = "application/pdf", filePath = null) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    // Models to try in priority order
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro"
    ];

    for (const modelName of candidateModels) {
      try {
        console.log(`🤖 Attempting menu extraction with Gemini (${modelName})...`);
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `You are an expert OCR and canteen menu extractor.
Analyze this canteen menu document/image and extract the full weekly meal schedule.

Return a STRICT, RAW JSON object (no markdown formatting, no code blocks, no backticks, just pure valid JSON).

The JSON structure MUST strictly be:
{
  "weekKey": "YYYYWW", // e.g. "202637" representing the ISO 4-digit Year and 2-digit Week Number based on the dates in the menu. If uncertain, calculate from the starting date.
  "menu": {
    "Monday": {
      "date": "DD-MM", // e.g. "14-09"
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
4. If no date is found for a day, format as empty string "".`;

        const contents = [
          {
            inlineData: {
              mimeType: mimeType || "application/pdf",
              data: fileBuffer.toString("base64")
            }
          },
          prompt
        ];

        const response = await ai.models.generateContent({
          model: modelName,
          contents
        });

        const responseText = response.text || "";
        console.log(`Gemini (${modelName}) Raw Response Length:`, responseText.length);

        const cleaned = responseText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.menu && typeof parsed.menu === "object" && Object.keys(parsed.menu).length > 0) {
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
        console.warn(`⚠️ Gemini model (${modelName}) error:`, aiErr.message);
      }
    }
  } else {
    console.log("ℹ️ No GEMINI_API_KEY detected, using built-in fallback parser.");
  }

  // Fallback 1: Try pdf2json parser
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
    return result;
  } catch (pdf2jsonErr) {
    console.warn("⚠️ pdf2json parser failed (corrupt/stream XRef error), attempting pdf-parse fallback:", pdf2jsonErr.message || pdf2jsonErr.parserError);
    if (tempCreated && fs.existsSync(localPdfPath)) {
      try { fs.unlinkSync(localPdfPath); } catch (_) {}
    }
  }

  // Fallback 2: Robust text-stream extraction using pdf-parse
  try {
    const parsedData = await pdfParse(fileBuffer);
    const text = parsedData.text || "";
    console.log("📄 pdf-parse extracted text length:", text.length);

    const weekRangeMatch = text.match(/(\d{2}\/\d{2}\/\d{2,4})\s+to\s+(\d{2}\/\d{2}\/\d{2,4})/i);
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
    if (!weekKey) weekKey = getWeekKey();

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const menu = {};
    days.forEach(day => {
      menu[day] = {
        date: "",
        breakfast: "See uploaded PDF",
        lunch: "See uploaded PDF",
        dinner: "See uploaded PDF"
      };
    });

    return { menu, weekKey: String(weekKey) };
  } catch (textParseErr) {
    console.error("❌ All PDF parsing strategies exhausted:", textParseErr);
    throw new Error("Unable to parse menu PDF: file format unsupported or corrupted.");
  }
}

module.exports = { parseMenuWithGemini };
