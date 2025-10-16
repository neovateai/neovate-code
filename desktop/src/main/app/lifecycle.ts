import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';

export function registerAppLifecycle() {
  // Quit when all windows closed (except macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // macOS: Recreate window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}
