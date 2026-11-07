import type { Application, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getMenu, saveMenu, deleteMenu as removeMenu, getAvailableWeeks } from '../services/menu';
import { getDay, getWeekKey, getISTDate } from '../services/utils';
import { parseMenuWithGemini } from '../services/geminiParser';
import { generateMenuPDF } from '../services/pdfGenerator';
import { User, Announcement, Menu } from '../services/models';
import { getBot } from '../telegram/bot';
import logger from '../services/logger';
import { getRecentLogs } from '../services/telemetry';
import { AdminJwtPayload, WeeklyMenuData, IDayMeals } from '../../types/common';

// Cryptographically secure secret fallback if JWT_SECRET is unset in production
const JWT_SECRET = process.env['JWT_SECRET'] || (process.env['NODE_ENV'] === 'production'
  ? crypto.randomBytes(32).toString('hex')
  : 'masterchef-canteen-super-secret');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size limit
});

// Middleware to verify JWT
export const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export function setupApiRoutes(app: Application): void {
  app.get('/api/health', (_req: Request, res: Response) => {
    res.send('OK');
  });

  // API: Admin Authentication
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = req.body as { password?: unknown } | undefined;
    const password = body?.password;
    const adminPassword = process.env['ADMIN_PASSWORD'];

    if (!password || typeof password !== 'string' || !adminPassword) {
      logger.warn('auth.login_failed', 'Invalid admin password attempt', {
        ip: req.ip || req.socket.remoteAddress,
      });
      res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
      return;
    }

    const inputHash = crypto.scryptSync(password, 'masterchef-auth-salt', 32);
    const expectedHash = crypto.scryptSync(adminPassword, 'masterchef-auth-salt', 32);

    if (!crypto.timingSafeEqual(inputHash, expectedHash)) {
      logger.warn('auth.login_failed', 'Invalid admin password attempt', {
        ip: req.ip || req.socket.remoteAddress,
      });
      res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
      return;
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    logger.info('auth.login_success', 'Admin authenticated successfully', {
      ip: req.ip || req.socket.remoteAddress,
    });
    res.json({ success: true, token });
  });

  // API: Get List of Available Weeks
  app.get('/api/weeks', async (_req: Request, res: Response) => {
    try {
      const weeks = await getAvailableWeeks();
      res.json({ success: true, weeks });
    } catch {
      res.status(500).json({ error: 'Failed to fetch weeks' });
    }
  });

  // API: Get Today's Menu
  app.get('/api/today', async (req: Request, res: Response) => {
    try {
      const rawWeek = req.query['week'];
      const weekKey = typeof rawWeek === 'string' && /^\d{4,8}$/.test(rawWeek) ? rawWeek : getWeekKey();
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) {
        res.status(404).json({ error: 'Menu not found for current week' });
        return;
      }

      const day = getDay(0);
      const dayData: IDayMeals | undefined = menuDoc.data[day];

      if (!dayData) {
        res.status(404).json({ error: `Menu for ${day} not found` });
        return;
      }

      res.json({
        success: true,
        weekKey: menuDoc.weekKey,
        day: day,
        date: dayData.date || '',
        breakfast: dayData.breakfast || '—',
        lunch: dayData.lunch || '—',
        dinner: dayData.dinner || '—',
      });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API: Get Menu for a specific week
  app.get('/api/menu', async (req: Request, res: Response) => {
    try {
      const rawWeek = req.query['week'];
      const weekKey = typeof rawWeek === 'string' && /^\d{4,8}$/.test(rawWeek) ? rawWeek : null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) {
        res.status(404).json({ error: 'Menu not found' });
        return;
      }
      res.json({
        success: true,
        weekKey: menuDoc.weekKey,
        menu: menuDoc.data,
      });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API: Get Next Meal based on current time
  app.get('/api/next-meal', async (req: Request, res: Response) => {
    try {
      const rawChatId = req.query['chatId'];
      const chatId = typeof rawChatId === 'string' ? rawChatId : null;

      let cutoffBreakfast = 9.5;
      let cutoffLunch = 14;
      let cutoffRollover = 22;

      if (chatId) {
        const user = await User.findOne({ chatId: String(chatId) });
        if (user && user.timing) {
          const timeToFloat = (str?: string): number => {
            if (!str) return 0;
            const parts = str.split(':');
            const h = Number(parts[0]);
            const m = Number(parts[1]);
            return h + (m || 0) / 60;
          };

          const tLunch = timeToFloat(user.timing.lunch) || 11;
          const tDinner = timeToFloat(user.timing.dinner) || 20;

          cutoffBreakfast = tLunch;
          cutoffLunch = tDinner;
          cutoffRollover = tDinner + 2.5;
        }
      }

      const istDate = getISTDate();
      const hour = istDate.getHours();
      const min = istDate.getMinutes();
      const timeFloat = hour + min / 60;

      const targetOffset = timeFloat >= cutoffRollover ? 1 : 0;
      const targetDate = getISTDate(targetOffset);
      const targetWeekKey = getWeekKey(targetDate);

      const menuDoc = await getMenu(targetWeekKey);
      if (!menuDoc || !menuDoc.data) {
        res.status(404).json({ error: 'Menu not found for current week' });
        return;
      }

      const day = getDay(targetOffset);
      const dayData: IDayMeals | undefined = menuDoc.data[day];
      if (!dayData) {
        res.status(404).json({ error: `Menu for ${day} not found` });
        return;
      }

      let nextMeal = '';
      let menuText = '';

      if (targetOffset === 1 || timeFloat < cutoffBreakfast) {
        nextMeal = 'breakfast';
        menuText = dayData.breakfast;
      } else if (timeFloat < cutoffLunch) {
        nextMeal = 'lunch';
        menuText = dayData.lunch;
      } else {
        nextMeal = 'dinner';
        menuText = dayData.dinner;
      }

      res.json({
        success: true,
        day: day,
        meal: nextMeal,
        menu: menuText || '—',
      });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API: Get all weeks data as JSON
  app.get('/api/all-weeks-data', async (_req: Request, res: Response) => {
    try {
      const menus = await Menu.find({}, { pdfBuffer: 0 }).sort({ weekKey: -1 });
      res.json({ success: true, data: menus });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // API: Download PDF
  app.get('/api/download/pdf', async (req: Request, res: Response) => {
    try {
      const rawWeek = req.query['week'];
      const weekKey = typeof rawWeek === 'string' && /^\d{4,8}$/.test(rawWeek) ? rawWeek : null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.pdfBuffer) {
        res.status(404).send('PDF not found.');
        return;
      }

      const safeFileName = path.basename(menuDoc.fileName || 'menu.pdf').replace(/["\r\n\\]/g, '');
      res.setHeader('Content-Type', menuDoc.contentType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      res.send(menuDoc.pdfBuffer);
    } catch {
      res.status(500).send('Error downloading PDF');
    }
  });

  // API: Download JSON
  app.get('/api/download/json', async (req: Request, res: Response) => {
    try {
      const rawWeek = req.query['week'];
      const weekKey = typeof rawWeek === 'string' && /^\d{4,8}$/.test(rawWeek) ? rawWeek : null;
      const menuDoc = await getMenu(weekKey);
      if (!menuDoc || !menuDoc.data) {
        res.status(404).send('Menu data not found.');
        return;
      }

      const safeWeek = String(menuDoc.weekKey || 'latest').replace(/[^a-zA-Z0-9_-]/g, '');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="menu_${safeWeek}.json"`);
      res.send(JSON.stringify(menuDoc.data, null, 2));
    } catch {
      res.status(500).send('Error downloading JSON');
    }
  });

  // API: Upload Menu PDF or Image
  app.post('/api/upload', verifyJWT, (req: Request, res: Response, next: NextFunction) => {
    upload.any()(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: 'File upload error: ' + msg });
        return;
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    const uploadedFile = (files && Array.isArray(files) && files.length > 0 ? files[0] : req.file) as Express.Multer.File | undefined;
    if (!uploadedFile) {
      res.status(400).json({ error: 'No file uploaded. Please select a PDF or image.' });
      return;
    }

    const safeBaseName = path.basename(uploadedFile.originalname || 'menu.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    try {
      const mimeType = uploadedFile.mimetype || (safeBaseName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const { menu, weekKey } = await parseMenuWithGemini(uploadedFile.buffer, mimeType);

      if (!menu || Object.keys(menu).length === 0) {
        throw new Error('Could not parse menu structure from the provided file.');
      }

      await saveMenu(menu, {
        buffer: uploadedFile.buffer,
        fileName: safeBaseName,
        contentType: uploadedFile.mimetype,
      }, weekKey);

      logger.info('menu.uploaded', `Menu uploaded for Week ${weekKey}`, { weekKey, fileName: safeBaseName });
      res.json({
        success: true,
        message: `Menu for Week ${weekKey} uploaded and parsed successfully!`,
        weekKey,
        menu,
      });
    } catch (err: unknown) {
      const errObj = err as Error;
      logger.error('menu.upload_error', `Menu upload failed: ${errObj.message}`, { error: errObj });
      res.status(500).json({ error: 'Failed to process menu file. Please ensure the file is a valid canteen menu.' });
    }
  });

  // API: Create Menu Data (JSON)
  app.post('/api/menu', verifyJWT, async (req: Request, res: Response) => {
    try {
      const body = req.body as { weekKey?: string; menuData?: WeeklyMenuData } | undefined;
      const weekKey = body?.weekKey;
      const menuData = body?.menuData;
      if (!weekKey || !menuData || typeof weekKey !== 'string') {
        res.status(400).json({ error: 'Missing or invalid weekKey or menuData.' });
        return;
      }

      const safeWeekKey = weekKey.replace(/[^a-zA-Z0-9_-]/g, '');
      const pdfBuffer = await generateMenuPDF(menuData, safeWeekKey);

      await saveMenu(menuData, {
        buffer: pdfBuffer,
        fileName: `MasterChef_Menu_W${safeWeekKey}.pdf`,
        contentType: 'application/pdf',
      }, safeWeekKey);

      res.json({ success: true, message: `Menu for Week ${safeWeekKey} created and PDF synthesized successfully.` });
    } catch (err: unknown) {
      const errObj = err as Error;
      logger.error('menu.create_error', `Failed to create menu: ${errObj.message}`, { error: errObj });
      res.status(500).json({ error: 'Failed to create menu.' });
    }
  });

  // API: Update Menu Data (JSON)
  app.put('/api/menu/:weekKey', verifyJWT, async (req: Request, res: Response) => {
    try {
      const rawWeek = req.params['weekKey'];
      const weekKey = typeof rawWeek === 'string' ? rawWeek.replace(/[^a-zA-Z0-9_-]/g, '') : null;
      const body = req.body as { menuData?: WeeklyMenuData } | undefined;
      const menuData = body?.menuData;

      if (!weekKey || !menuData) {
        res.status(400).json({ error: 'Missing or invalid weekKey or menuData.' });
        return;
      }

      const pdfBuffer = await generateMenuPDF(menuData, weekKey);

      await saveMenu(menuData, {
        buffer: pdfBuffer,
        fileName: `MasterChef_Menu_W${weekKey}_Edited.pdf`,
        contentType: 'application/pdf',
      }, weekKey);

      res.json({ success: true, message: `Menu for Week ${weekKey} updated and PDF regenerated successfully.` });
    } catch (err: unknown) {
      const errObj = err as Error;
      logger.error('menu.update_error', `Failed to update menu: ${errObj.message}`, { error: errObj });
      res.status(500).json({ error: 'Failed to update menu.' });
    }
  });

  // API: Delete Menu
  app.delete('/api/menu/:weekKey', verifyJWT, async (req: Request, res: Response) => {
    try {
      const rawWeek = req.params['weekKey'];
      const weekKey = typeof rawWeek === 'string' ? rawWeek.replace(/[^a-zA-Z0-9_-]/g, '') : null;
      if (!weekKey) {
        res.status(400).json({ error: 'Missing or invalid weekKey.' });
        return;
      }
      await removeMenu(weekKey);
      res.json({ success: true, message: `Week ${weekKey} deleted successfully.` });
    } catch (err: unknown) {
      const errObj = err as Error;
      logger.error('menu.delete_error', `Failed to delete menu: ${errObj.message}`, { error: errObj });
      res.status(500).json({ error: 'Failed to delete menu.' });
    }
  });

  // API: Get Announcements
  app.get('/api/announcements', async (_req: Request, res: Response) => {
    try {
      const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, announcements });
    } catch {
      res.status(500).json({ error: 'Failed to fetch announcements.' });
    }
  });

  // API: Create Announcement & Broadcast (Admin)
  app.post('/api/announcements', verifyJWT, async (req: Request, res: Response) => {
    try {
      const body = req.body as { message?: string } | undefined;
      const message = body?.message;
      if (!message || typeof message !== 'string' || message.trim() === '') {
        res.status(400).json({ error: 'Announcement message cannot be empty.' });
        return;
      }

      const announcement = await Announcement.create({ message: message.trim() });
      const users = await User.find({ reminders: true });
      const bot = getBot();
      let broadcastCount = 0;

      const broadcastMsg = `📢 *Announcement:*\n\n${announcement.message}`;

      for (const user of users) {
        try {
          await bot.sendMessage(user.chatId, broadcastMsg, { parse_mode: 'Markdown' });
          broadcastCount++;
        } catch (err: unknown) {
          logger.warn('telegram.broadcast_failed', `Failed to broadcast to user ${user.chatId}`, { error: err as Error });
        }
      }

      res.json({
        success: true,
        message: `Announcement created and mapped to ${broadcastCount} users successfully!`,
        announcement,
      });
    } catch (err: unknown) {
      const errObj = err as Error;
      logger.error('announcement.create_error', `Failed to create announcement: ${errObj.message}`, { error: errObj });
      res.status(500).json({ error: 'Failed to create announcement.' });
    }
  });

  // API: System & Resource Insights
  app.get('/api/system/stats', async (_req: Request, res: Response) => {
    try {
      const memoryUsage = process.memoryUsage();
      const uptimeSec = Math.floor(process.uptime());
      const hours = Math.floor(uptimeSec / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      const seconds = uptimeSec % 60;

      const isDbConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
      const userCount = isDbConnected ? await User.countDocuments().catch(() => 0) : 0;
      const reminderCount = isDbConnected ? await User.countDocuments({ reminders: true }).catch(() => 0) : 0;
      const menuCount = isDbConnected ? await Menu.countDocuments().catch(() => 0) : 0;

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        uptimeSeconds: uptimeSec,
        memory: {
          rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
          heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
          externalMb: (memoryUsage.external / 1024 / 1024).toFixed(2),
        },
        cpu: process.cpuUsage(),
        environment: process.env['NODE_ENV'] || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        stats: {
          totalUsers: userCount,
          activeReminders: reminderCount,
          totalMenus: menuCount,
        },
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch system stats' });
    }
  });

  // API: Query Recent Telemetry & Action Logs
  app.get('/api/system/logs', (req: Request, res: Response) => {
    try {
      const rawSeverity = req.query['severity'];
      const rawAction = req.query['action'];
      const rawChatId = req.query['chatId'];
      const rawLimit = req.query['limit'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeSeverity = typeof rawSeverity === 'string' ? (rawSeverity as any) : undefined;
      const safeAction = typeof rawAction === 'string' ? rawAction : undefined;
      const safeChatId = typeof rawChatId === 'string' ? rawChatId : undefined;
      const limit = Math.min(Math.max(parseInt(typeof rawLimit === 'string' ? rawLimit : '50', 10) || 50, 1), 200);

      const logs = getRecentLogs({
        severity: safeSeverity,
        action: safeAction,
        chatId: safeChatId,
        limit,
      });
      res.json({
        success: true,
        count: logs.length,
        logs,
      });
    } catch {
      res.status(500).json({ error: 'Failed to retrieve telemetry logs' });
    }
  });

  console.log('🌐 API Routes initialized with History support & System Insights');
}
