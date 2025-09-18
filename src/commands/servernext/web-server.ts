import express from 'express';
import { createServer } from 'http';
import path from 'pathe';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { NodeBridge } from '../../nodeBridge';
import { WebSocketTransport } from './websocketTransport';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WebServerOptions {
  port?: number;
  host?: string;
  contextCreateOpts?: any;
}

class WebServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients = new Map<
    string,
    { transport: WebSocketTransport; bridge: NodeBridge }
  >();
  private port: number;
  private host: string;
  private contextCreateOpts: any;

  constructor(options: WebServerOptions = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.contextCreateOpts = options.contextCreateOpts || {};

    // Initialize Express app
    this.app = express();
    this.server = createServer(this.app);

    // Initialize WebSocket server
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/ws',
    });

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes() {
    // Serve static files
    this.app.use(express.static(__dirname));

    // Serve the web client HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'web-client.html'));
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        clients: this.clients.size,
        timestamp: new Date().toISOString(),
      });
    });

    // Client info endpoint
    this.app.get('/clients', (req, res) => {
      const clientInfo = Array.from(this.clients.entries()).map(
        ([id, client]) => ({
          id,
          connected: client.transport.isConnected(),
          state: client.transport.getState(),
        }),
      );
      res.json(clientInfo);
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      console.log(`[WebServer] New client connected: ${clientId}`);

      // Create WebSocket transport
      const transport = new WebSocketTransport(ws);

      // Create NodeBridge instance for this client
      const bridge = new NodeBridge({
        contextCreateOpts: this.contextCreateOpts,
      });

      // Connect transport to bridge's message bus
      bridge.messageBus.setTransport(transport);

      // Store client
      this.clients.set(clientId, { transport, bridge });

      // Handle transport events
      transport.onError((error) => {
        console.error(`[WebServer] Client ${clientId} error:`, error);
      });

      transport.onClose(() => {
        console.log(`[WebServer] Client ${clientId} disconnected`);
        this.clients.delete(clientId);
      });

      // Send welcome message
      bridge.messageBus
        .emitEvent('connected', {
          clientId,
          timestamp: new Date().toISOString(),
          message: 'Welcome to Neovate WebSocket Server',
        })
        .catch(console.error);
    });

    this.wss.on('error', (error) => {
      console.error('[WebServer] WebSocket server error:', error);
    });
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.log(
          `[WebServer] Server running at http://${this.host}:${this.port}`,
        );
        console.log(
          `[WebServer] WebSocket endpoint: ws://${this.host}:${this.port}/ws`,
        );
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Close all client connections
    for (const [clientId, { transport }] of this.clients) {
      console.log(`[WebServer] Closing client ${clientId}`);
      await transport.close();
    }
    this.clients.clear();

    // Close WebSocket server
    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        // Close HTTP server
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('[WebServer] Server stopped');
            resolve();
          }
        });
      });
    });
  }

  getClients() {
    return this.clients;
  }
}

// Export the WebServer class
export { WebServer };
