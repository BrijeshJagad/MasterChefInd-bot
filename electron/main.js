const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');

// Custom user data directory to bypass permission locks on Windows cache
app.setPath('userData', path.join(os.tmpdir(), 'masterchef-electron-cache'));

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'MasterChef Canteen Management System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Load local build file or server
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../frontend/out/index.html')}`;
  
  win.loadFile(path.join(__dirname, '../frontend/out/index.html')).catch((err) => {
    console.log('Error loading local out/index.html:', err);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
