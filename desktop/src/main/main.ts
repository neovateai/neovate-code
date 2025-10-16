import { app } from 'electron';
import { createMainWindow } from './app/window';
import { registerAppLifecycle } from './app/lifecycle';
import { startNeovateServer, stopNeovateServer } from './server';

// macOS PATH fix for accessing system tools
if (process.platform === 'darwin') {
  const extras = ['/opt/homebrew/bin', '/usr/local/bin'];
  const cur = process.env.PATH || '';
  const parts = cur.split(':').filter(Boolean);
  for (const p of extras) {
    if (!parts.includes(p)) parts.unshift(p);
  }
  process.env.PATH = parts.join(':');
}

app.whenReady().then(async () => {
  try {
    // Start Neovate WebSocket server
    await startNeovateServer();
    console.log('[Main] Neovate server started successfully');

    // Create desktop window
    createMainWindow();
  } catch (error) {
    console.error('[Main] Failed to initialize:', error);
    app.quit();
  }
});

registerAppLifecycle();

// Cleanup on quit
app.on('before-quit', async () => {
  console.log('[Main] Shutting down Neovate server...');
  await stopNeovateServer();
});
