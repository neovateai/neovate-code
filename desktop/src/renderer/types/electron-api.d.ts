export interface ElectronAPI {
  getPlatform: () => string;
  onMessage: (callback: (data: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
