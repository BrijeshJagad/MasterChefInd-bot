import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';

// User data directory override to bypass Windows file locks
app.setPath('userData', path.join(os.tmpdir(), 'masterchef-electron-cache'));

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'MasterChef Canteen Management System',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Correctly resolve static HTML whether in development or packaged NSIS archive
  const staticIndexPath = app.isPackaged
    ? path.join(app.getAppPath(), 'frontend/out/index.html')
    : path.resolve(__dirname, '../../frontend/out/index.html');

  win.loadFile(staticIndexPath).catch((err: unknown) => {
    console.error('Error loading frontend index.html:', err);
  });
}

ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
