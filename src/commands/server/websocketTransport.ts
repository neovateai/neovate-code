import EventEmitter from 'events';
import WebSocket from 'ws';
import type {
  ConnectionState,
  Message,
  MessageTransport,
} from '../../messageBus';

const MAX_BUFFER_SIZE = 1000;
const RECONNECT_INTERVAL = 1000;
const MAX_RECONNECT_INTERVAL = 30000;

export class WebSocketTransport
  extends EventEmitter
  implements MessageTransport
{
  private ws?: WebSocket | globalThis.WebSocket;
  private state: ConnectionState = 'disconnected';
  private messageBuffer: Message[] = [];
  private url?: string;
  private reconnectInterval = RECONNECT_INTERVAL;
  private reconnectTimer?: NodeJS.Timeout;
  private shouldReconnect = true;
  private isNode: boolean;

  constructor(urlOrSocket?: string | WebSocket | globalThis.WebSocket) {
    super();
    this.isNode = typeof window === 'undefined';

    if (typeof urlOrSocket === 'string') {
      this.url = urlOrSocket;
      this.connect();
    } else if (urlOrSocket) {
      // When WebSocket is passed directly (from server), just store it
      this.ws = urlOrSocket;
      this.state = 'connected';
      this.setupWebSocketForServer();
    }
  }

  private connect() {
    if (!this.url) return;

    this.state = 'connecting';

    try {
      if (this.isNode) {
        // Node.js environment
        this.ws = new WebSocket(this.url);
      } else {
        // Browser environment
        this.ws = new (globalThis as any).WebSocket(this.url);
      }

      this.setupWebSocket();
    } catch (error) {
      this.state = 'error';
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  private setupWebSocket() {
    if (!this.ws) return;

    const ws = this.ws as any;

    ws.onopen = () => {
      this.state = 'connected';
      this.reconnectInterval = RECONNECT_INTERVAL;
      this.flushBuffer();
      this.emit('open');
    };

    ws.onmessage = (event: any) => {
      try {
        const data = this.isNode ? event.data : event.data;
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        this.emit('message', message);
      } catch (error) {
        this.emit('error', new Error(`Failed to parse message: ${error}`));
      }
    };

    ws.onerror = (error: any) => {
      this.state = 'error';
      this.emit('error', new Error(error.message || 'WebSocket error'));
    };

    ws.onclose = () => {
      this.state = 'disconnected';
      this.emit('close');

      if (this.shouldReconnect && this.url) {
        this.scheduleReconnect();
      }
    };

    // For Node.js WebSocket client connections (not server-provided)
    if (this.isNode && this.url && ws.on) {
      ws.on('open', ws.onopen);
      ws.on('message', (data: any) => ws.onmessage(data));
      ws.on('error', ws.onerror);
      ws.on('close', ws.onclose);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.state = 'reconnecting';
    this.reconnectTimer = setTimeout(() => {
      this.connect();
      this.reconnectInterval = Math.min(
        this.reconnectInterval * 2,
        MAX_RECONNECT_INTERVAL,
      );
    }, this.reconnectInterval);
  }

  private flushBuffer() {
    if (!this.isConnected() || this.messageBuffer.length === 0) {
      return;
    }

    if (this.messageBuffer.length > MAX_BUFFER_SIZE) {
      this.emit('error', new Error('Message buffer overflow'));
      this.messageBuffer = [];
      return;
    }

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    for (const message of messages) {
      this.sendImmediate(message).catch((error) => {
        this.emit('error', error);
      });
    }
  }

  private async sendImmediate(message: Message): Promise<void> {
    if (!this.ws) {
      throw new Error('WebSocket is not initialized');
    }

    const data = JSON.stringify(message);

    if (this.isNode) {
      const ws = this.ws as WebSocket;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      } else {
        throw new Error('WebSocket is not connected');
      }
    } else {
      const ws = this.ws as globalThis.WebSocket;
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      } else {
        throw new Error('WebSocket is not connected');
      }
    }
  }

  isConnected(): boolean {
    return this.state === 'connected' && this.ws !== undefined;
  }

  onMessage(handler: (message: Message) => void): void {
    this.on('message', handler);
  }

  onError(handler: (error: Error) => void): void {
    this.on('error', handler);
  }

  onClose(handler: () => void): void {
    this.on('close', handler);
  }

  async send(message: Message): Promise<void> {
    if (this.isConnected()) {
      try {
        await this.sendImmediate(message);
      } catch (error) {
        this.messageBuffer.push(message);
        throw error;
      }
    } else {
      // Buffer message for later delivery
      this.messageBuffer.push(message);

      if (this.state === 'disconnected' && this.url) {
        this.connect();
      }
    }
  }

  async close(): Promise<void> {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      if (this.isNode) {
        (this.ws as WebSocket).close();
      } else {
        (this.ws as globalThis.WebSocket).close();
      }
      this.ws = undefined;
    }

    this.state = 'closed';
    this.messageBuffer = [];
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setupWebSocketForServer() {
    if (!this.ws) return;

    const ws = this.ws as WebSocket;

    // For server-provided WebSocket, only listen to native events
    ws.on('message', (data: any) => {
      try {
        const message =
          typeof data === 'string'
            ? JSON.parse(data)
            : JSON.parse(data.toString());
        this.emit('message', message);
      } catch (error) {
        this.emit('error', new Error(`Failed to parse message: ${error}`));
      }
    });

    ws.on('error', (error: any) => {
      this.state = 'error';
      this.emit('error', new Error(error.message || 'WebSocket error'));
    });

    ws.on('close', () => {
      this.state = 'disconnected';
      this.emit('close');
    });
  }
}
