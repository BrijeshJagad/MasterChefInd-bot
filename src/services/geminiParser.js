const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const { getWeekKey } = require("./utils");
const { parseMenuFromPDF } = require("./parser");

/**
 * Parses menu from PDF or Image buffer using Gemini AI (Multimodal),
 * with graceful fallback to heuristic pdf2json parser.
 *
 * @param {Buffer} fileBuffer - The binary buffer of the PDF or image.
 * @param {string} mimeType - The mime type (e.g. application/pdf, image/png, image/jpeg)
 * @param {string} [filePath] - Optional fallback local file path for pdf2json parser
 * @returns {Promise<{ menu: Object, weekKey: string }>}
 */
async function parseMenuWithGemini(fileBuffer, mimeType = "application/pdf", filePath = null) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      console.log("🤖 Parsing menu using Gemini AI...");
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
        model: "gemini-2.5-flash",
        contents
      });

      const responseText = response.text || "";
      console.log("Gemini Raw Response Length:", responseText.length);

      // Clean markdown formatting if present
      const cleaned = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.menu && typeof parsed.menu === "object") {
        let finalWeekKey = parsed.weekKey;
        if (!finalWeekKey || !/^\d{6}$/.test(String(finalWeekKey))) {
          finalWeekKey = getWeekKey();
        }
        return {
          menu: parsed.menu,
          weekKey: String(finalWeekKey)
        };
      }
    } catch (aiErr) {
      console.warn("⚠️ Gemini parser error, falling back to local PDF parser:", aiErr.message);
    }
  } else {
    console.log("ℹ️ No GEMINI_API_KEY detected, using built-in heuristic PDF parser.");
  }

  // Fallback to heuristic parser
  if (filePath && fs.existsSync(filePath)) {
    return await parseMenuFromPDF(filePath);
  }

  // If only buffer is provided, create a temporary file to run parseMenuFromPDF
  const path = require("path");
  const tempPath = path.join(__dirname, `../../temp_gemini_fallback_${Date.now()}.pdf`);
  try {
    fs.writeFileSync(tempPath, fileBuffer);
    const result = await parseMenuFromPDF(tempPath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return result;
  } catch (fallbackErr) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw fallbackErr;
  }
}

module.exports = { parseMenuWithGemini };
