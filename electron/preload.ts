import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../types/electron';

const electronAPI: ElectronAPI = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  minimizeWindow: (): void => ipcRenderer.send('window:minimize'),
  maximizeWindow: (): void => ipcRenderer.send('window:maximize'),
  closeWindow: (): void => ipcRenderer.send('window:close'),
  platform: process.platform as 'win32' | 'darwin' | 'linux',
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
