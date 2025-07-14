import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import * as tools from './tools';
import { findFreePort } from './utils';

const toolHandlers: { [key: string]: (params: any) => Promise<any> | any } = {
  openDiff: tools.openDiff,
  openFile: tools.openFile,
  getDiagnostics: tools.getDiagnostics,
  getOpenEditors: tools.getOpenEditors,
  getWorkspaceFolders: tools.getWorkspaceFolders,
  getCurrentSelection: tools.getCurrentSelection,
  getLatestSelection: tools.getLatestSelection,
  close_tab: tools.closeTab,
  closeAllDiffTabs: tools.closeAllDiffTabs,
};

export class McpServer {
  private wss: WebSocketServer | null = null;
  private httpServer: http.Server;
  public port: number = 0;
  private clientCount: number = 0;

  constructor() {
    console.log('[MCP] Creating MCP server instance...');
    this.httpServer = http.createServer();

    this.httpServer.on('error', (error) => {
      console.error('[MCP] HTTP server error:', error);
    });

    this.httpServer.on('listening', () => {
      console.log('[MCP] HTTP server listening event fired');
    });

    console.log('[MCP] MCP server instance created');
  }

  public async start(): Promise<number> {
    console.log('[MCP] Starting MCP server...');
    console.log('[MCP] Finding free port starting from 10000...');

    this.port = await findFreePort(10000);
    console.log('[MCP] Found free port:', this.port);

    console.log('[MCP] Creating WebSocket server...');
    this.wss = new WebSocketServer({ server: this.httpServer });
    console.log('[MCP] WebSocket server created');

    console.log('[MCP] Setting up WebSocket connection handler...');
    this.wss.on('connection', this.handleConnection.bind(this));

    this.wss.on('error', (error) => {
      console.error('[MCP] WebSocket server error:', error);
    });

    console.log('[MCP] Available tool handlers:', Object.keys(toolHandlers));

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '127.0.0.1', () => {
        console.log(`[MCP] Server listening on ws://127.0.0.1:${this.port}`);
        console.log('[MCP] Server start completed successfully');
        resolve(this.port);
      });

      this.httpServer.on('error', (error) => {
        console.error('[MCP] Failed to start server:', error);
        reject(error);
      });
    });
  }

  private handleConnection(ws: WebSocket) {
    this.clientCount++;
    const clientId = this.clientCount;
    console.log(
      `[MCP] Client #${clientId} connected (total clients: ${this.clientCount})`,
    );

    ws.on('message', async (message) => {
      const messageStr = message.toString();
      console.log(`[MCP] Client #${clientId} sent message:`, messageStr);

      try {
        const request = JSON.parse(messageStr);
        console.log(`[MCP] Client #${clientId} parsed request:`, {
          id: request.id,
          method: request.method,
          params: request.params,
        });

        const handler = toolHandlers[request.method];
        if (handler) {
          console.log(
            `[MCP] Client #${clientId} calling handler for method:`,
            request.method,
          );
          const startTime = Date.now();

          const result = await handler(request.params);

          const endTime = Date.now();
          console.log(
            `[MCP] Client #${clientId} handler completed in ${endTime - startTime}ms with result:`,
            result,
          );

          const response = JSON.stringify({ id: request.id, result });
          console.log(`[MCP] Client #${clientId} sending response:`, response);
          ws.send(response);
        } else {
          console.error(
            `[MCP] Client #${clientId} method not found:`,
            request.method,
          );
          console.error(`[MCP] Available methods:`, Object.keys(toolHandlers));
          throw new Error(`Method not found: ${request.method}`);
        }
      } catch (error: any) {
        console.error(
          `[MCP] Client #${clientId} error processing request:`,
          error,
        );
        console.error(`[MCP] Client #${clientId} error stack:`, error.stack);

        try {
          const request = JSON.parse(messageStr);
          const errorResponse = JSON.stringify({
            id: request.id,
            error: {
              message: error.message,
              stack: error.stack,
            },
          });
          console.log(
            `[MCP] Client #${clientId} sending error response:`,
            errorResponse,
          );
          ws.send(errorResponse);
        } catch (parseError) {
          console.error(
            `[MCP] Client #${clientId} failed to parse message for error response:`,
            parseError,
          );
          const fallbackResponse = JSON.stringify({
            id: null,
            error: {
              message: 'Failed to parse request and process error',
              originalError: error.message,
            },
          });
          console.log(
            `[MCP] Client #${clientId} sending fallback error response:`,
            fallbackResponse,
          );
          ws.send(fallbackResponse);
        }
      }
    });

    ws.on('close', (code, reason) => {
      console.log(
        `[MCP] Client #${clientId} disconnected with code:`,
        code,
        'reason:',
        reason.toString(),
      );
      this.clientCount--;
      console.log(`[MCP] Remaining clients: ${this.clientCount}`);
    });

    ws.on('error', (error) => {
      console.error(`[MCP] Client #${clientId} WebSocket error:`, error);
    });
  }

  public dispose() {
    console.log('[MCP] Disposing MCP server...');

    if (this.wss) {
      console.log('[MCP] Closing WebSocket server...');
      this.wss.close();
      console.log('[MCP] WebSocket server closed');
    }

    console.log('[MCP] Closing HTTP server...');
    this.httpServer.close();
    console.log('[MCP] HTTP server closed');

    console.log('[MCP] Server disposal completed');
  }
}
