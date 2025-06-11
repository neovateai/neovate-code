import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import picocolors from 'picocolors';
import type { WebSocket, Server as WsServer } from 'ws';

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
}

const CHECK_SOCKETS_INTERVAL = 30000;

type SockWriteType =
  | 'connected'
  | 'action'
  | 'event'
  | 'file_op'
  | 'task_status'
  | 'chat';

interface SocketMessage {
  type: SockWriteType;
  sessionId: string;
  data?: Record<string, any> | string | boolean;
}

interface SocketServerOptions {
  prompt: string;
  sessionId: string;
}

export class SocketServer {
  private wsServer!: WsServer;

  private readonly sockets: WebSocket[] = [];

  private readonly options: SocketServerOptions;

  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(options: SocketServerOptions) {
    this.options = options;
  }

  public upgrade = (req: IncomingMessage, sock: Socket, head: any): void => {
    // subscribe upgrade event to handle socket

    if (!this.wsServer.shouldHandle(req)) {
      return;
    }

    this.wsServer.handleUpgrade(req, sock, head, (connection) => {
      this.wsServer.emit('connection', connection, req);
    });
  };

  // detect and close broken connections
  // https://github.com/websockets/ws/blob/8.18.0/README.md#how-to-detect-and-close-broken-connections
  private checkSockets = () => {
    for (const socket of this.wsServer.clients) {
      const extWs = socket as unknown as ExtWebSocket;
      if (!extWs.isAlive) {
        extWs.terminate();
      } else {
        extWs.isAlive = false;
        extWs.ping(() => {
          // empty
        });
      }
    }

    // Schedule next check only if timer hasn't been cleared
    if (this.heartbeatTimer !== null) {
      this.heartbeatTimer = setTimeout(
        this.checkSockets,
        CHECK_SOCKETS_INTERVAL,
      ).unref();
    }
  };

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // create socket, install socket handler, bind socket event
  public async prepare(): Promise<void> {
    this.clearHeartbeatTimer();

    const { WebSocketServer } = await import('ws');

    this.wsServer = new WebSocketServer({
      noServer: true,
    });

    this.wsServer.on('error', (err: Error & { code: string }) => {
      if (err.code !== 'EADDRINUSE') {
        console.error(
          picocolors.red(
            `WebSocket server error:\n${err.stack || err.message}`,
          ),
        );
      }
    });

    this.heartbeatTimer = setTimeout(
      this.checkSockets,
      CHECK_SOCKETS_INTERVAL,
    ).unref();

    this.wsServer.on('connection', (socket, req) => {
      const queryStr = req.url ? req.url.split('?')[1] : '';

      this.onConnect(
        socket,
        queryStr ? Object.fromEntries(new URLSearchParams(queryStr)) : {},
      );
    });
  }

  // write message to each socket
  public sockWrite({ type, data }: SocketMessage): void {
    for (const socket of this.sockets) {
      this.send(
        socket,
        JSON.stringify({ type, data, sessionId: this.options.sessionId }),
      );
    }
  }

  private singleWrite(
    socket: WebSocket,
    { type, data }: Omit<SocketMessage, 'sessionId'>,
  ) {
    this.send(
      socket,
      JSON.stringify({ type, data, sessionId: this.options.sessionId }),
    );
  }

  public async close(): Promise<void> {
    this.clearHeartbeatTimer();

    // Remove all event listeners
    this.wsServer.removeAllListeners();

    // Close all client sockets
    for (const socket of this.wsServer.clients) {
      socket.terminate();
    }
    // Close all tracked sockets
    for (const socket of this.sockets) {
      socket.close();
    }

    // Reset all properties
    this.sockets.length = 0;

    return new Promise<void>((resolve, reject) => {
      this.wsServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private onConnect(socket: WebSocket, params: Record<string, string>) {
    const connection = socket as ExtWebSocket;

    connection.isAlive = true;

    // heartbeat
    connection.on('pong', () => {
      connection.isAlive = true;
    });

    this.sockets.push(connection);

    connection.on('close', () => {
      const index = this.sockets.indexOf(connection);
      if (index >= 0) {
        this.sockets.splice(index, 1);
      }
    });

    this.singleWrite(connection, {
      type: 'chat',
      data: {
        message: this.options.prompt,
      },
    });
  }

  // send message to connecting socket
  private send(connection: WebSocket, message: string) {
    if (connection.readyState !== 1) {
      return;
    }
    connection.send(message);
  }
}
