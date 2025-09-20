import type {
  CloseHandler,
  ErrorHandler,
  TransportConfig,
  TransportHandler,
  TransportMessage,
  TransportState,
} from './types';

export class WebSocketTransport {
  private url: string;
  private ws: WebSocket | null = null;
  private state: TransportState = 'disconnected';
  private messageHandlers: TransportHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private closeHandlers: CloseHandler[] = [];
  private messageBuffer: TransportMessage[] = [];
  private reconnectInterval: number;
  private maxReconnectInterval: number;
  private shouldReconnect: boolean;

  constructor(config: TransportConfig) {
    this.url = config.url;
    this.reconnectInterval = config.reconnectInterval || 1000;
    this.maxReconnectInterval = config.maxReconnectInterval || 30000;
    this.shouldReconnect = config.shouldReconnect ?? true;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.state = 'connecting';
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.state = 'connected';
          this.reconnectInterval = 1000;
          this.flushBuffer();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as TransportMessage;
            this.messageHandlers.map((handler) => handler(message));
          } catch (error) {
            console.error('Failed to parse message:', error);
            this.errorHandlers.map((handler) =>
              handler(
                error instanceof Error ? error : new Error(String(error)),
              ),
            );
          }
        };

        this.ws.onerror = (_event) => {
          this.state = 'error';
          const error = new Error('WebSocket error');
          this.errorHandlers.map((handler) => handler(error));
        };

        this.ws.onclose = () => {
          this.state = 'disconnected';
          this.closeHandlers.map((handler) => handler());

          if (this.shouldReconnect) {
            setTimeout(() => {
              this.connect().catch(console.error);
              this.reconnectInterval = Math.min(
                this.reconnectInterval * 2,
                this.maxReconnectInterval,
              );
            }, this.reconnectInterval);
          }
        };
      } catch (error) {
        this.state = 'error';
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private flushBuffer(): void {
    const messages = [...this.messageBuffer];
    this.messageBuffer = [];
    messages.forEach((message) => {
      this.send(message).catch(console.error);
    });
  }

  isConnected(): boolean {
    return (
      this.state === 'connected' &&
      this.ws !== null &&
      this.ws !== undefined &&
      this.ws.readyState === WebSocket.OPEN
    );
  }

  onMessage(handler: TransportHandler): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  onClose(handler: CloseHandler): void {
    this.closeHandlers.push(handler);
  }

  async send(message: TransportMessage): Promise<void> {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify(message));
    } else {
      this.messageBuffer.push(message);
      throw new Error('WebSocket is not connected');
    }
  }

  async close(): Promise<void> {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state = 'closed';
  }

  getState(): TransportState {
    return this.state;
  }

  getUrl(): string {
    return this.url;
  }

  removeHandler(
    type: 'message' | 'error' | 'close',
    handler: TransportHandler | ErrorHandler | CloseHandler,
  ): void {
    switch (type) {
      case 'message':
        this.messageHandlers = this.messageHandlers.filter(
          (h) => h !== handler,
        );
        break;
      case 'error':
        this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
        break;
      case 'close':
        this.closeHandlers = this.closeHandlers.filter((h) => h !== handler);
        break;
    }
  }
}
