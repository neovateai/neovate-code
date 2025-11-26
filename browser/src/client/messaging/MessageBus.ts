import type { TransportMessage } from '../transport/types';
import type { WebSocketTransport } from '../transport/WebSocketTransport';
import type {
  EventHandler,
  EventMessage,
  MessageHandler,
  PendingRequest,
  RequestMessage,
  ResponseMessage,
} from './types';

export class MessageBus {
  private transport: WebSocketTransport | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private messageHandlers = new Map<string, MessageHandler>();
  private eventHandlers = new Map<string, EventHandler[]>();

  setTransport(transport: WebSocketTransport): void {
    this.transport = transport;
    transport.onMessage((message) => {
      this.handleIncomingMessage(message);
    });
  }

  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async request<T = unknown, R = unknown>(
    method: string,
    params: T,
  ): Promise<R> {
    if (!this.transport || !this.transport.isConnected()) {
      throw new Error('Transport is not connected');
    }

    const id = this.generateId();
    const message: RequestMessage = {
      type: 'request',
      id,
      method,
      params,
      timestamp: Date.now(),
    };

    return new Promise<R>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.transport?.send(message as TransportMessage).catch((error) => {
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private handleIncomingMessage(message: TransportMessage): void {
    switch (message.type) {
      case 'response':
        this.handleResponse(message as ResponseMessage);
        break;
      case 'event':
        this.handleEvent(message as EventMessage);
        break;
      case 'request':
        this.handleRequest(message as RequestMessage);
        break;
    }
  }

  private handleResponse(message: ResponseMessage): void {
    const pending = this.pendingRequests.get(message.id);
    if (pending) {
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(
          new Error(message.error.message || String(message.error)),
        );
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private handleEvent(message: EventMessage): void {
    const handlers = this.eventHandlers.get(message.event);
    if (handlers) {
      handlers.map((handler) => handler(message.data));
    }
  }

  private handleRequest(message: RequestMessage): void {
    const handler = this.messageHandlers.get(message.method);
    if (handler) {
      handler(message.params)
        .then((result) => {
          const response: ResponseMessage = {
            type: 'response',
            id: message.id,
            result,
            timestamp: Date.now(),
          };
          this.transport?.send(response as TransportMessage);
        })
        .catch((error) => {
          const response: ResponseMessage = {
            type: 'response',
            id: message.id,
            error: { message: error.message },
            timestamp: Date.now(),
          };
          this.transport?.send(response as TransportMessage);
        });
    }
  }

  onEvent<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler as EventHandler);
  }

  registerHandler<T = unknown, R = unknown>(
    method: string,
    handler: MessageHandler<T, R>,
  ): void {
    this.messageHandlers.set(method, handler as MessageHandler);
  }

  removeEventHandler<T = unknown>(
    event: string,
    handler: EventHandler<T>,
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler as EventHandler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  removeMessageHandler(method: string): void {
    this.messageHandlers.delete(method);
  }

  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  cancelPendingRequests(): void {
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error('Request cancelled'));
    });
    this.pendingRequests.clear();
  }

  isTransportConnected(): boolean {
    return this.transport ? this.transport.isConnected() : false;
  }
}
