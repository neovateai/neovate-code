import type {
  UIMessage as BaseUIMessage,
  FileUIPart,
  ReasoningUIPart,
  SourceUIPart,
  StepStartUIPart,
  ToolInvocationUIPart,
} from '@ai-sdk/ui-utils';
import type { Delta } from 'quill';
import type { ContextItem } from './context';

export enum UIMessageType {
  Text = 'text',
  Reasoning = 'reasoning',
  Source = 'source',
  File = 'file',
  ToolCall = 'tool_call',
  ToolCallResult = 'tool_result',
  Tool = 'tool',
  TextDelta = 'text_delta',
  ToolApprovalRequest = 'tool_approval_request',
  ToolApprovalResult = 'tool_approval_result',
  ToolApprovalError = 'tool_approval_error',
}

export type UIMessage = Omit<BaseUIMessage, 'annotations'> & {
  annotations: UIMessageAnnotation[];
};

export type UIUserMessage = Omit<UIMessage, 'role'> & {
  role: 'user';
  attachedContexts: ContextItem[];
  delta: Delta;
};

export type UIMessageAnnotation =
  | TextDeltaMessage
  | TextMessage
  | ReasoningMessage
  | ToolCallMessage
  | ToolCallResultMessage
  | ToolMessage
  | ToolApprovalRequestMessage
  | ToolApprovalResultMessage
  | ToolApprovalErrorMessage;

export interface ToolMessage {
  type: UIMessageType.Tool;
  toolCallId: string;
  toolName: string;
  // call corresponds to tool_call, result corresponds to tool_result
  state: 'call' | 'result';
  // 0 is call, 1 is result
  step: number;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface TextDeltaMessage {
  type: UIMessageType.TextDelta;
  text: string;
}

export interface ToolCallMessage {
  type: UIMessageType.ToolCall;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolCallResultMessage {
  type: UIMessageType.ToolCallResult;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export type TextMessage = {
  type: UIMessageType.Text;
  text: string;
  state?: UIMessageType.TextDelta | UIMessageType.Text;
  mode?: string;
};

export type ReasoningMessage = ReasoningUIPart & {
  text?: string;
};

export type ToolInvocationMessage = ToolInvocationUIPart;

export type SourceMessage = SourceUIPart;

export type FileMessage = FileUIPart;

export type StepStartMessage = StepStartUIPart;

export type MessageAnnotation =
  | TextMessage
  | ReasoningMessage
  | ToolInvocationMessage
  | SourceMessage
  | FileMessage
  | StepStartMessage;

export interface ToolApprovalRequestMessage {
  type: UIMessageType.ToolApprovalRequest;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ToolApprovalResultMessage {
  type: UIMessageType.ToolApprovalResult;
  toolCallId: string;
  toolName: string;
  approved: boolean;
  option?: 'once' | 'always' | 'always_tool';
  timestamp: number;
  [key: string]: unknown;
}

export interface ToolApprovalErrorMessage {
  type: UIMessageType.ToolApprovalError;
  toolCallId: string;
  toolName: string;
  error: string;
  timestamp: number;
  [key: string]: unknown;
}
