import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { getWeekKey } from './utils';
import { parseMenuFromPDF } from './parser';
import logger from './logger';
import { WeeklyMenuData, IDayMeals } from '../../types/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsInstance: any = null;
async function getPdfJs(): Promise<any> {
  if (pdfjsInstance) return pdfjsInstance;
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    pdfjsInstance = await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs');
    return pdfjsInstance;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      pdfjsInstance = require('pdfjs-dist');
      return pdfjsInstance;
    } catch {
      return null;
    }
  }
}

export const CANDIDATE_GEMINI_MODELS: readonly string[] = [
  ...(process.env['GEMINI_MODEL'] ? [process.env['GEMINI_MODEL']] : []),
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-latest',
  'gemini-2.5-pro',
  'gemini-1.5-pro',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
];

export const CANDIDATE_GROQ_MODELS: readonly string[] = [
  'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview',
  'qwen/qwen3.8-27b',
];

export const CANDIDATE_OPENAI_MODELS: readonly string[] = [
  'gpt-4o',
  'gpt-4o-mini',
];

export const MENU_EXTRACTION_PROMPT = `You are an expert OCR and canteen menu extractor.
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

export interface ParsedOcrResult {
  menu: WeeklyMenuData;
  weekKey: string;
}

export function hasValidMealData(menu?: WeeklyMenuData | null): boolean {
  if (!menu || typeof menu !== 'object') return false;
  let count = 0;
  for (const day of Object.values(menu)) {
    if (!day || typeof day !== 'object') continue;
    const meals = [day.breakfast, day.lunch, day.dinner];
    for (const meal of meals) {
      const val = (meal || '').trim();
      if (val && val !== '—' && val !== '--' && val !== '-') {
        count++;
      }
    }
  }
  return count >= 3;
}

async function callGeminiRest(apiKey: string, modelName: string, fileBuffer: Buffer, mimeType: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'application/pdf',
              data: fileBuffer.toString('base64'),
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json() as { error?: { message?: string }; candidates?: { content?: { parts?: { text?: string }[] } }[] };
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function parseMenuWithOpenAI(fileBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<ParsedOcrResult | null> {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const isImage = mimeType.startsWith('image/');
  
  if (!isImage) {
    return null;
  }

  const base64Data = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  for (const modelName of CANDIDATE_OPENAI_MODELS) {
    try {
      console.log(`🤖 Attempting menu extraction with OpenAI (${modelName})...`);
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: MENU_EXTRACTION_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices?.[0]?.message?.content || '';
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as { weekKey?: string; menu?: WeeklyMenuData };

      if (parsed && parsed.menu && hasValidMealData(parsed.menu)) {
        let finalWeekKey = parsed.weekKey;
        if (!finalWeekKey || !/^\d{6}$/.test(String(finalWeekKey))) {
          finalWeekKey = getWeekKey();
        }
        logger.info('openai.ocr_success', `Extracted menu for Week ${finalWeekKey} using ${modelName}`, {
          action: 'openai.ocr_success',
          model: modelName,
          weekKey: String(finalWeekKey),
        });
        return {
          menu: parsed.menu,
          weekKey: String(finalWeekKey),
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ OpenAI model (${modelName}) error:`, msg);
    }
  }

  return null;
}

export async function parseMenuWithGroq(fileBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<ParsedOcrResult | null> {
  const apiKey = process.env['GROQ_API_KEY'];
  if (!apiKey) return null;

  const isImage = mimeType && mimeType.startsWith('image/');
  if (!isImage) return null;

  const groq = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const base64Data = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  for (const modelName of CANDIDATE_GROQ_MODELS) {
    try {
      console.log(`⚡ Attempting ultra-fast menu extraction with Groq (${modelName})...`);
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: MENU_EXTRACTION_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices?.[0]?.message?.content || '';
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as { weekKey?: string; menu?: WeeklyMenuData };

      if (parsed && parsed.menu && hasValidMealData(parsed.menu)) {
        let finalWeekKey = parsed.weekKey;
        if (!finalWeekKey || !/^\d{6}$/.test(String(finalWeekKey))) {
          finalWeekKey = getWeekKey();
        }
        logger.info('groq.ocr_success', `Extracted menu for Week ${finalWeekKey} using Groq ${modelName}`, {
          action: 'groq.ocr_success',
          model: modelName,
          weekKey: String(finalWeekKey),
        });
        return {
          menu: parsed.menu,
          weekKey: String(finalWeekKey),
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ Groq model (${modelName}) error:`, msg);
    }
  }

  return null;
}

export async function parseWithPdfJs(fileBuffer: Buffer): Promise<ParsedOcrResult | null> {
  const pdfLib = await getPdfJs();
  if (!pdfLib) {
    console.warn('⚠️ pdfjs-dist is not installed, skipping pdfjs extraction.');
    return null;
  }
  try {
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfLib.getDocument({ data, isEvalSupported: false, useSystemFonts: true, disableFontFace: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await loadingTask.promise as any;

    let allItems: { text: string; y: number; x: number }[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const tc = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageItems = tc.items.map((i: any) => ({
        text: (i.str || '').trim(),
        y: Math.round(i.transform[4]),
        x: Math.round(i.transform[5]),
      })).filter((i: { text: string }) => i.text.length > 0);
      allItems = allItems.concat(pageItems);
    }

    if (allItems.length === 0) return null;

    const fullText = allItems.map(i => i.text).join(' ');
    const weekRangeMatch = fullText.match(/(\d{2}[-/]\d{2}[-/]\d{2,4})\s+to\s+(\d{2}[-/]\d{2}[-/]\d{2,4})/i);
    let weekKey: string | null = null;
    if (weekRangeMatch && weekRangeMatch[1]) {
      const p = weekRangeMatch[1].split(/[-/]/);
      const d = p[0] ?? '01';
      const m = p[1] ?? '01';
      const yStr = p[2] ?? '2026';
      const y = yStr.length === 2 ? '20' + yStr : yStr;
      const startDate = new Date(`${y}-${m}-${d}`);
      if (!isNaN(startDate.getTime())) {
        weekKey = getWeekKey(startDate);
      }
    }
    if (!weekKey) weekKey = getWeekKey();

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayAnchors: { day: string; y: number; x: number }[] = [];
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
      if (u === 'BREAKFAST') bX = item.x;
      if (u === 'LUNCH') lX = item.x;
      if (u === 'DINNER') dX = item.x;
    });

    const midBL = (bX + lX) / 2 || 289;
    const midLD = (lX + dX) / 2 || 512;

    function cleanMeal(arr: string[]): string {
      const text = arr.join(' ')
        .replace(/\b(BREAKFAST|LUNCH|DINNER|TIME|TO)\b/gi, '')
        .replace(/\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b\s*[-–]?\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) return '—';
      if (/^OFF$/i.test(text)) return '❌ OFF';
      return text;
    }

    const menu: WeeklyMenuData = {};
    for (let i = 0; i < dayAnchors.length; i++) {
      const curr = dayAnchors[i];
      if (!curr) continue;
      const prev = dayAnchors[i - 1];
      const next = dayAnchors[i + 1];

      const minY = prev ? (prev.y + curr.y) / 2 : curr.y - 25;
      const maxY = next ? (curr.y + next.y) / 2 : curr.y + 25;

      const rowItems = allItems.filter(it => it.y >= minY && it.y < maxY);

      let date = '';
      const dateItem = rowItems.find(it => /^\d{2}[-/]\d{2}$/.test(it.text));
      if (dateItem) date = dateItem.text;

      const mealItems = rowItems.filter(it => {
        const u = it.text.toUpperCase();
        return !days.some(d => u.includes(d.toUpperCase())) && !/^\d{2}[-/]\d{2}$/.test(u) && !u.includes('TIME');
      });

      const bItems = mealItems.filter(it => it.x < midBL).map(it => it.text);
      const lItems = mealItems.filter(it => it.x >= midBL && it.x < midLD).map(it => it.text);
      const dItems = mealItems.filter(it => it.x >= midLD).map(it => it.text);

      const meals: IDayMeals = {
        date,
        breakfast: cleanMeal(bItems),
        lunch: cleanMeal(lItems),
        dinner: cleanMeal(dItems),
      };

      menu[curr.day] = meals;
    }

    return { menu, weekKey: String(weekKey) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ pdfjs-dist extraction issue:', msg);
    return null;
  }
}

export async function parseMenuWithGemini(fileBuffer: Buffer, mimeType: string = 'application/pdf'): Promise<ParsedOcrResult> {
  // Strategy 1: Instant Local Parser for PDFs
  if (!mimeType || mimeType === 'application/pdf') {
    console.log('⚡ Checking local coordinate parser first for instant PDF extraction...');
    try {
      const pdfJsResult = await parseWithPdfJs(fileBuffer);
      if (pdfJsResult && hasValidMealData(pdfJsResult.menu)) {
        console.log(`✅ Instant local extraction succeeded for Week ${pdfJsResult.weekKey} (<100ms)!`);
        return pdfJsResult;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Local PDF parser skipped:', msg);
    }
  }

  // Strategy 2: Ultra-Fast Groq LPU Vision (<1.5s, Free Tier)
  if (process.env['GROQ_API_KEY'] && mimeType && mimeType.startsWith('image/')) {
    const groqResult = await parseMenuWithGroq(fileBuffer, mimeType);
    if (groqResult && hasValidMealData(groqResult.menu)) {
      console.log(`✅ Groq ultra-fast extraction succeeded for Week ${groqResult.weekKey}`);
      return groqResult;
    }
  }

  // Strategy 3: Google Gemini API (Multimodal Free Tier)
  const geminiApiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];

  if (geminiApiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const contents = [
      {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileBuffer.toString('base64'),
        },
      },
      MENU_EXTRACTION_PROMPT,
    ];

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`🤖 Attempting menu extraction with Gemini (${modelName}) [attempt ${attempt}]...`);
          
          let responseText = '';
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                responseMimeType: 'application/json',
              },
            });
            responseText = response.text || '';
          } catch (sdkErr: unknown) {
            const msg = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
            console.warn(`⚠️ SDK call failed for ${modelName}, trying direct REST fallback:`, msg);
            responseText = await callGeminiRest(geminiApiKey, modelName, fileBuffer, mimeType, MENU_EXTRACTION_PROMPT);
          }

          console.log(`Gemini (${modelName}) Raw Response Length:`, responseText.length);

          const cleaned = responseText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

          const parsed = JSON.parse(cleaned) as { weekKey?: string; menu?: WeeklyMenuData };
          if (parsed && parsed.menu && hasValidMealData(parsed.menu)) {
            let finalWeekKey = parsed.weekKey;
            if (!finalWeekKey || !/^\d{6}$/.test(String(finalWeekKey))) {
              finalWeekKey = getWeekKey();
            }
            logger.info('gemini.ocr_success', `Extracted menu for Week ${finalWeekKey} using ${modelName}`, {
              action: 'gemini.ocr_success',
              model: modelName,
              weekKey: String(finalWeekKey),
              bufferSize: fileBuffer.length,
            });
            return {
              menu: parsed.menu,
              weekKey: String(finalWeekKey),
            };
          }
        } catch (aiErr: unknown) {
          const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          const isBusy = msg.includes('503') || msg.includes('high demand') || msg.includes('429');
          console.warn(`⚠️ Gemini model (${modelName}) [attempt ${attempt}] error:`, msg);
          if (isBusy && attempt === 1) {
            await new Promise(res => setTimeout(res, 1500));
            continue;
          }
          break; // Move to next candidate model
        }
      }
    }
  } else {
    console.log('ℹ️ No GEMINI_API_KEY detected, checking alternative AI models or built-in fallback parser.');
  }

  // Strategy 4: OpenAI Vision if configured
  if (process.env['OPENAI_API_KEY'] && mimeType && mimeType.startsWith('image/')) {
    const openAiResult = await parseMenuWithOpenAI(fileBuffer, mimeType);
    if (openAiResult && hasValidMealData(openAiResult.menu)) {
      console.log(`✅ Successfully extracted menu using OpenAI for Week ${openAiResult.weekKey}`);
      return openAiResult;
    }
  }

  // Strategy 5: Secondary check on local pdfjs parser (if not attempted earlier)
  if (mimeType && mimeType.startsWith('application/pdf')) {
    console.log('📄 Attempting local pdfjs-dist extraction...');
    const pdfJsResult = await parseWithPdfJs(fileBuffer);
    if (pdfJsResult && hasValidMealData(pdfJsResult.menu)) {
      console.log(`✅ Successfully extracted menu using local pdfjs parser for Week ${pdfJsResult.weekKey}`);
      return pdfJsResult;
    }
  }

  // Strategy 6: Legacy pdf2json parser using a randomized isolated temp file
  const safeTempFile = path.join(os.tmpdir(), `masterchef_${Date.now()}_${crypto.randomBytes(16).toString('hex')}.pdf`);
  try {
    fs.writeFileSync(safeTempFile, fileBuffer);
    const result = await parseMenuFromPDF(safeTempFile);
    if (result && hasValidMealData(result.menu)) {
      console.log(`✅ Successfully extracted menu using pdf2json parser for Week ${result.weekKey}`);
      return {
        menu: result.menu,
        weekKey: result.weekKey ?? getWeekKey(),
      };
    }
  } catch (pdf2jsonErr: unknown) {
    const errObj = pdf2jsonErr as { message?: string; parserError?: string };
    console.warn('⚠️ pdf2json parser failed:', errObj.message || errObj.parserError);
  } finally {
    try {
      if (fs.existsSync(safeTempFile)) {
        fs.unlinkSync(safeTempFile);
      }
    } catch {
      // Ignored
    }
  }

  throw new Error('Could not extract meal items from the document. Please ensure the file is a clear, valid weekly canteen menu (PDF or image).');
}
