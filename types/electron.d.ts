export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  platform: 'win32' | 'darwin' | 'linux';
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
