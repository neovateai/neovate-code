import type { ApprovalMode } from './chat';

export interface ClientConfig {
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  defaultTimeout?: number;
  shouldReconnect?: boolean;
}

export interface ClientSession {
  sessionId?: string;
  cwd: string;
  planMode?: boolean;
}

export interface InitializeParams {
  cwd: string;
  sessionId?: string;
}

export interface InitializeResult {
  success: boolean;
  data: {
    productName: string;
    version: string;
    sessionId: string;
    model: string;
    approvalMode: ApprovalMode;
    sessionSummary: string;
    pastedTextMap: Record<string, string>;
    pastedImageMap: Record<string, string>;
  };
  error?: {
    message: string;
  };
}

export interface SendMessageParams {
  message: string;
  cwd: string;
  sessionId?: string;
  planMode?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  sessionId: string;
}

export interface CancelParams {
  cwd: string;
  sessionId: string;
}

export interface CancelResult {
  success: boolean;
  message: string;
}

export interface GetStatusParams {
  cwd: string;
  sessionId: string;
}

export interface GetStatusResult {
  status: string;
  sessionId: string;
  [key: string]: unknown;
}

export interface ToolApprovalParams {
  toolUse: {
    name: string;
    args: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ToolApprovalResult {
  approved: boolean;
  option?: 'once' | 'always' | 'always_tool';
}

export type ClientEventType =
  | 'connected'
  | 'disconnected'
  | 'message'
  | 'textDelta'
  | 'chunk'
  | 'error';

export interface ClientEventData {
  [key: string]: unknown;
}

export * from './chat';
