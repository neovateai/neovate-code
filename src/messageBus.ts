import EventEmitter from 'events';
import { randomUUID } from './utils/randomUUID';

export type MessageId = string;
export type BaseMessage = {
  id: MessageId;
  timestamp: number;
};
export type RequestMessage = BaseMessage & {
  type: 'request';
  method: string;
  params: any;
};
export type ResponseMessage = BaseMessage & {
  type: 'response';
  result?: any;
  error?: any;
};
export type EventMessage = BaseMessage & {
  type: 'event';
  event: string;
  data: any;
};
export type Message = RequestMessage | ResponseMessage | EventMessage;
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';
export interface MessageTransport {
  send: (message: Message) => Promise<void>;
  onMessage: (handler: (message: Message) => void) => void;
  onError: (handler: (error: Error) => void) => void;
  onClose: (handler: () => void) => void;
  close: () => Promise<void>;
  isConnected: () => boolean;
}

function createRequest(
  id: MessageId,
  method: string,
  params: any,
): RequestMessage {
  return {
    type: 'request',
    id,
    method,
    params,
    timestamp: Date.now(),
  };
}

function createResponse(
  id: MessageId,
  result: any,
  error?: any,
): ResponseMessage {
  return {
    type: 'response',
    id,
    result,
    error,
    timestamp: Date.now(),
  };
}
function createErrorResponse(id: MessageId, error: any): ResponseMessage {
  return {
    type: 'response',
    id,
    error,
    timestamp: Date.now(),
  };
}
function createEvent(id: MessageId, event: string, data: any): EventMessage {
  return {
    type: 'event',
    id,
    event,
    data,
    timestamp: Date.now(),
  };
}

const MAX_BUFFER_SIZE = 1000;

export class DirectTransport extends EventEmitter implements MessageTransport {
  private peer?: DirectTransport;
  private state: ConnectionState = 'connected';
  private messageBuffer: Message[] = [];
  constructor() {
    super();
  }
  static createPair(): [DirectTransport, DirectTransport] {
    const transport1 = new DirectTransport();
    const transport2 = new DirectTransport();
    transport1.setPeer(transport2);
    transport2.setPeer(transport1);
    return [transport1, transport2];
  }
  setPeer(peer: DirectTransport) {
    this.peer = peer;
    this.flushBuffer();
  }
  isConnected() {
    return this.state === 'connected';
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
  async send(message: Message) {
    try {
      if (this.peer && this.peer.isConnected()) {
        setImmediate(() => {
          this.peer!.receive(message);
        });
      } else {
        this.messageBuffer.push(message);
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  async close() {
    this.state = 'closed';
  }
  private flushBuffer() {
    if (
      !this.peer ||
      !this.peer.isConnected() ||
      this.messageBuffer.length === 0
    ) {
      return;
    }
    if (this.messageBuffer.length > MAX_BUFFER_SIZE) {
      this.emit('error', new Error('Message buffer overflow'));
      return;
    }
    const messages = [...this.messageBuffer];
    this.messageBuffer.length = 0;
    for (const message of messages) {
      setImmediate(() => {
        this.peer!.receive(message);
      });
    }
  }
  private receive(message: Message) {
    if (this.state !== 'connected') {
      return;
    }
    try {
      this.emit('message', message);
    } catch (error) {
      this.emit('error', error);
    }
  }
}

type PendingRequest = {
  id: MessageId;
  method: string;
  timestamp: number;
  timeout?: NodeJS.Timeout;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
};
export type MessageHandler = (data: any) => Promise<any>;
export type EventHandler = (data: any) => void;

export class MessageBus extends EventEmitter {
  private transport?: MessageTransport;
  private pendingRequests = new Map<MessageId, PendingRequest>();
  private messageHandlers = new Map<string, MessageHandler>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  constructor() {
    super();
  }
  setTransport(transport: MessageTransport) {
    this.transport = transport;
    transport.onMessage((message) => {
      this.handleIncomingMessage(message);
    });
    transport.onError((error) => {
      this.emit('error', error);
    });
    transport.onClose(() => {
      this.emit('close');
    });
    this.emit('transportReady');
  }
  isConnected() {
    return this.transport?.isConnected() ?? false;
  }
  async request(
    method: string,
    params: any,
    options: { timeout?: number } = {},
  ) {
    if (!this.transport) {
      throw new Error('No transport available');
    }
    if (!this.transport.isConnected()) {
      throw new Error('Transport is not connected');
    }
    const id = randomUUID();
    const timeout = options.timeout ?? 0;
    const requestMessage = createRequest(id, method, params);
    const promise = new Promise<any>((resolve, reject) => {
      const pendingRequest: PendingRequest = {
        id,
        method,
        timestamp: Date.now(),
        resolve,
        reject,
      };
      if (timeout > 0) {
        pendingRequest.timeout = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout after ${timeout}ms: ${method}`));
        }, timeout);
      }
      this.pendingRequests.set(id, pendingRequest);
    });
    try {
      await this.transport.send(requestMessage);
      return await promise;
    } catch (error) {
      // Clean up pending request if send fails or promise rejects
      const pending = this.pendingRequests.get(id);
      if (pending) {
        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }
        this.pendingRequests.delete(id);
      }
      throw error;
    }
  }
  registerHandler(method: string, handler: MessageHandler) {
    this.messageHandlers.set(method, handler);
  }
  unregisterHandler(method: string) {
    if (this.messageHandlers.has(method)) {
      this.messageHandlers.delete(method);
    }
  }
  async emitEvent(event: string, data: any) {
    if (!this.transport) {
      return;
    }
    if (!this.transport.isConnected()) {
      return;
    }
    const id = randomUUID();
    const message = createEvent(id, event, data);
    try {
      await this.transport.send(message);
    } catch (error) {
      throw error;
    }
  }
  onEvent(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  offEvent(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }
  private async handleIncomingMessage(message: Message) {
    try {
      if (!message.id || !message.timestamp || !message.type) {
        throw new Error('Invalid message format');
      }
      switch (message.type) {
        case 'request':
          await this.handleRequest(message as RequestMessage);
          break;
        case 'response':
          this.handleResponse(message as ResponseMessage);
          break;
        case 'event':
          this.handleEvent(message as EventMessage);
          break;
        default:
          break;
      }
    } catch (error) {
      this.emit('messageError', error, message);
    }
  }
  private async handleRequest(message: RequestMessage) {
    const { id, method, params } = message;
    const handler = this.messageHandlers.get(method);
    if (!handler) {
      await this.sendResponse(
        createErrorResponse(id, {
          message: `No handler registered for method: ${method}`,
          code: 'METHOD_NOT_FOUND',
        }),
      );
      return;
    }
    try {
      const result = await handler(params);
      const response = createResponse(id, result);
      await this.sendResponse(response);
    } catch (error) {
      await this.sendResponse(
        createErrorResponse(id, {
          message: error instanceof Error ? error.message : String(error),
          code: 'HANDLER_ERROR',
          details: error instanceof Error ? { stack: error.stack } : undefined,
        }),
      );
    }
  }
  private async handleResponse(message: ResponseMessage) {
    const { id, result, error } = message;
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }
    this.pendingRequests.delete(id);
    if (error) {
      // Create a more informative error
      const errorMessage =
        typeof error === 'object' && error.message
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Request failed';

      const err = new Error(errorMessage);
      // Attach the full error details
      (err as any).details = error.details
        ? Array.isArray(error.details)
          ? error.details.join('\n')
          : JSON.stringify(error.details)
        : error;
      (err as any).method = pending.method;

      pending.reject(err);
    } else {
      pending.resolve(result);
    }
  }
  private async handleEvent(message: EventMessage) {
    const { event, data } = message;
    const handlers = this.eventHandlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        this.emit('eventHandlerError', error, event, data);
      }
    }
  }
  private async sendResponse(response: ResponseMessage) {
    if (!this.transport) {
      return;
    }
    try {
      await this.transport.send(response);
    } catch (error) {
      throw error;
    }
  }
}
