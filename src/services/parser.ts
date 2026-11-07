import { getWeekKey } from './utils';
import { WeeklyMenuData, IDayMeals } from '../../types/common';

interface TextItem {
  text: string;
  x: number;
  y: number;
}

interface PdfTextRun {
  T: string;
}

interface PdfText {
  R: PdfTextRun[];
  x: number;
  y: number;
}

interface PdfPage {
  Texts: PdfText[];
}

interface PdfData {
  Pages: PdfPage[];
}

export function parseMenuFromPDF(filePath: string): Promise<{ menu: WeeklyMenuData; weekKey: string | null }> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFParser = require('pdf2json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParser = new (PDFParser as any)();

    pdfParser.on('pdfParser_dataError', (err: unknown) => reject(err));

    pdfParser.on('pdfParser_dataReady', (pdfData: PdfData) => {
      const items: TextItem[] = [];
      pdfData.Pages.forEach(page => {
        page.Texts.forEach(t => {
          const firstRun = t.R[0];
          if (firstRun) {
            items.push({
              text: decodeURIComponent(firstRun.T).trim(),
              x: t.x,
              y: t.y,
            });
          }
        });
      });

      const fullText = items.map(i => i.text).join(' ');
      // Handle 13/04/26 to 19/04/2026 or 13/04/2026 to 19/04/2026
      const weekRangeMatch = fullText.match(/(\d{2}\/\d{2}\/\d{2,4})\s+to\s+(\d{2}\/\d{2}\/\d{2,4})/i);

      let weekKey: string | null = null;
      if (weekRangeMatch && weekRangeMatch[1]) {
        const startDateStr = weekRangeMatch[1];
        const p = startDateStr.split('/');
        const d = p[0] ?? '01';
        const m = p[1] ?? '01';
        const y = p[2] ?? '2026';
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

function buildMenu(items: TextItem[]): WeeklyMenuData {
  const days: readonly string[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // 1. Detect Headers
  const headers: { breakfast?: number; lunch?: number; dinner?: number } = {};
  items.forEach(item => {
    const t = item.text.toUpperCase();
    if (t === 'BREAKFAST') headers.breakfast = item.x;
    if (t === 'LUNCH') headers.lunch = item.x;
    if (t === 'DINNER') headers.dinner = item.x;
  });

  // 2. Detect Day Anchors
  const anchors: { day: string; y: number }[] = [];
  items.forEach(item => {
    const t = item.text.toUpperCase();
    const day = days.find(d => t === d || t.startsWith(d + ' '));
    if (day) {
      anchors.push({ day: capitalize(day), y: item.y });
    }
  });

  if (anchors.length === 0) return {};

  // Sort anchors by Y
  anchors.sort((a, b) => a.y - b.y);

  // 3. Define Column Boundaries
  const breakfastX = headers.breakfast ?? 9;
  const lunchX = headers.lunch ?? 18;
  const dinnerX = headers.dinner ?? 33;

  const midBL = (breakfastX + lunchX) / 2 || 14;
  const midLD = (lunchX + dinnerX) / 2 || 28;

  const menu: WeeklyMenuData = {};
  anchors.forEach((anchor, index) => {
    const prevAnchor = anchors[index - 1];
    const nextAnchor = anchors[index + 1];

    const startY = index === 0
      ? anchor.y - (((nextAnchor?.y ?? anchor.y + 20) - anchor.y) / 2)
      : ((prevAnchor?.y ?? anchor.y) + anchor.y) / 2;

    const nextY = index === anchors.length - 1
      ? anchor.y + ((anchor.y - (prevAnchor?.y ?? anchor.y - 20)) / 2)
      : (anchor.y + (nextAnchor?.y ?? anchor.y + 20)) / 2;

    const dayItems = items.filter(item => item.y >= startY && item.y < nextY);

    const dayData: { date: string; breakfast: string[]; lunch: string[]; dinner: string[] } = {
      date: '',
      breakfast: [],
      lunch: [],
      dinner: [],
    };

    dayItems.forEach(item => {
      const t = item.text;
      const tUpper = t.toUpperCase();

      // Is this the date? (e.g. 13-04)
      if (/\b\d{2}-\d{2}\b/.test(t) && !dayData.date) {
        dayData.date = t;
        return;
      }

      // Ignore labels
      if (days.includes(tUpper) || ['BREAKFAST', 'LUNCH', 'DINNER', 'TIME', '7:30AM', '11:00AM', '08:00PM'].some(lbl => tUpper.includes(lbl))) {
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

    const meals: IDayMeals = {
      date: dayData.date,
      breakfast: cleanArray(dayData.breakfast),
      lunch: cleanArray(dayData.lunch),
      dinner: cleanArray(dayData.dinner),
    };

    menu[anchor.day] = meals;
  });

  return menu;
}

function cleanArray(arr: string[]): string {
  if (!arr || arr.length === 0) return '';
  return arr.map(text => {
    return text
      .replace(/\b(BREAKFAST|LUNCH|DINNER|TIME|TO)\b/gi, '')
      .replace(/\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b\s*[-–]?\s*/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/^OFF$/i, '❌ OFF')
      .trim();
  }).filter(t => t.length > 0).join(' ');
}

function capitalize(w: string): string {
  return w.charAt(0) + w.slice(1).toLowerCase();
}
