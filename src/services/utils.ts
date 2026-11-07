import { WeeklyMenuData, IDayMeals } from '../../types/common';

export function getISTDate(offset: number = 0): Date {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  ist.setDate(ist.getDate() + offset);
  return ist;
}

export function getDay(offset: number = 0): string {
  const days: readonly string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = getISTDate(offset).getDay();
  return days[dayIndex] ?? 'Sunday';
}

export function getWeekKey(date: Date = getISTDate(0)): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}${weekNo.toString().padStart(2, '0')}`;
}

export function getWeekRange(weekKey: string): string[] {
  const year = parseInt(weekKey.substring(0, 4), 10);
  const week = parseInt(weekKey.substring(4), 10);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ISOweekStart);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d.toISOString().slice(5, 10).replace('-', '/')); // MM/DD for display
  }
  return days;
}

export function formatMenu(day: string, data?: WeeklyMenuData | null): string {
  if (!data) return '⚠️ No menu data available.';

  // Find key case-insensitively
  const dayKey = Object.keys(data).find(k => k.toUpperCase() === day.toUpperCase());
  if (!dayKey) return `⚠️ Menu not uploaded for ${day.toUpperCase()} yet.`;
  const record: IDayMeals | undefined = data[dayKey];
  if (!record) return `⚠️ Menu not uploaded for ${day.toUpperCase()} yet.`;

  const dateStr = record.date ? ` — ${record.date}` : '';
  return `📅 *${day.toUpperCase()}${dateStr}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🍳 *Breakfast*\n└─ ${record.breakfast || '—'}\n\n` +
    `🍛 *Lunch*\n└─ ${record.lunch || '—'}\n\n` +
    `🍽️ *Dinner*\n└─ ${record.dinner || '—'}`;
}

export function formatFullMenu(menu?: WeeklyMenuData | null): string {
  if (!menu) return '⚠️ No menu uploaded yet.';
  let text = '📅 *WEEKLY MENU*\n';
  const searchDays: readonly string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  searchDays.forEach(day => {
    // Find key case-insensitively
    const dayKey = Object.keys(menu).find(k => k.toUpperCase() === day.toUpperCase());
    if (dayKey) {
      const record: IDayMeals | undefined = menu[dayKey];
      if (record) {
        const dateStr = record.date ? ` — ${record.date}` : '';
        text += `\n✨ *${day.toUpperCase()}${dateStr}*\n`;
        text += `🍳 B: ${record.breakfast || '—'}\n`;
        text += `🍛 L: ${record.lunch || '—'}\n`;
        text += `🍽️ D: ${record.dinner || '—'}\n`;
        text += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      }
    }
  });
  return text;
}
