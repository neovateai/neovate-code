export type TransportState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'closed';

export interface TransportMessage {
  type: 'request' | 'response' | 'event';
  id?: string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message: string };
  event?: string;
  data?: unknown;
  timestamp: number;
}

export type TransportHandler = (message: TransportMessage) => void;

export type ErrorHandler = (error: Error) => void;

export type CloseHandler = () => void;

export interface TransportConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  shouldReconnect?: boolean;
}
