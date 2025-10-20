export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export type EventHandler<T = unknown> = (data: T) => void;

export type MessageHandler<T = unknown, R = unknown> = (
  params: T,
) => Promise<R>;

export interface RequestMessage {
  type: 'request';
  id: string;
  method: string;
  params: unknown;
  timestamp: number;
}

export interface ResponseMessage {
  type: 'response';
  id: string;
  result?: unknown;
  error?: { message: string };
  timestamp: number;
}

export interface EventMessage {
  type: 'event';
  event: string;
  data: unknown;
  timestamp: number;
}

export type BusMessage = RequestMessage | ResponseMessage | EventMessage;
