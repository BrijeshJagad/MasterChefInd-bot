import { Menu } from './models';
import { getWeekKey } from './utils';
import { WeeklyMenuData, MenuDocument, IMenu } from '../../types/common';

export interface SaveMenuPdfData {
  buffer?: Buffer;
  fileName?: string;
  contentType?: string;
}

export async function saveMenu(
  menu: WeeklyMenuData,
  pdfData: SaveMenuPdfData | null = null,
  customWeekKey: string | null = null
): Promise<string> {
  const safeWeekKey = typeof customWeekKey === 'string' ? customWeekKey : getWeekKey();
  const setData: Partial<IMenu> = {
    data: menu,
    weekKey: String(safeWeekKey),
  };
  if (pdfData) {
    if (pdfData.buffer) setData.pdfBuffer = pdfData.buffer;
    if (pdfData.fileName) setData.fileName = String(pdfData.fileName);
    if (pdfData.contentType) setData.contentType = String(pdfData.contentType);
  }

  await Menu.findOneAndUpdate(
    { weekKey: { $eq: String(safeWeekKey) } },
    { $set: setData },
    { upsert: true }
  );
  return safeWeekKey;
}

export async function getMenu(weekKey: string | null = null): Promise<MenuDocument | null> {
  if (typeof weekKey === 'string' && weekKey.trim() !== '') {
    return await Menu.findOne({ weekKey: { $eq: weekKey.trim() } });
  }
  return await Menu.findOne({}).sort({ weekKey: -1 });
}

export async function deleteMenu(weekKey: string): Promise<MenuDocument | null> {
  if (!weekKey || typeof weekKey !== 'string') {
    throw new Error('A valid string weekKey is required for deletion');
  }
  return await Menu.findOneAndDelete({ weekKey: { $eq: String(weekKey) } });
}

export async function getAvailableWeeks(): Promise<string[]> {
  const weeks = await Menu.find({}, { weekKey: 1 }).sort({ weekKey: -1 });
  return weeks.map(w => w.weekKey);
}
