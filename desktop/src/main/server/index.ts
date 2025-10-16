import { WebServer } from '../../../../src/commands/servernext/web-server';

let server: WebServer | null = null;

const DEFAULT_PORT = 7001;
const DEFAULT_HOST = '127.0.0.1';

export async function startNeovateServer(opts?: {
  port?: number;
  host?: string;
}) {
  if (server) {
    console.log('[Server] Server already running');
    return;
  }

  try {
    server = new WebServer({
      port: opts?.port || DEFAULT_PORT,
      host: opts?.host || DEFAULT_HOST,
      contextCreateOpts: {
        // Add any context options needed
      },
    });

    await server.start();
    console.log(
      `[Server] Neovate WebSocket server started on ${opts?.host || DEFAULT_HOST}:${opts?.port || DEFAULT_PORT}`,
    );
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    server = null;
    throw error;
  }
}

export async function stopNeovateServer() {
  if (!server) {
    console.log('[Server] No server to stop');
    return;
  }

  try {
    await server.stop();
    console.log('[Server] Neovate server stopped');
    server = null;
  } catch (error) {
    console.error('[Server] Failed to stop:', error);
    throw error;
  }
}

export function getServer(): WebServer | null {
  return server;
}
