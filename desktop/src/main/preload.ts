import { contextBridge, ipcRenderer } from 'electron';

// Expose minimal API to renderer (can extend later)
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  getPlatform: () => process.platform,

  // Placeholder for future IPC methods
  onMessage: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('message', handler);
    return () => ipcRenderer.removeListener('message', handler);
  },
});
