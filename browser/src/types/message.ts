import type {
  UIMessage as BaseUIMessage,
  FileUIPart,
  ReasoningUIPart,
  SourceUIPart,
  StepStartUIPart,
  ToolInvocationUIPart,
} from '@ai-sdk/ui-utils';

export enum UIMessageType {
  Text = 'text',
  Reasoning = 'reasoning',
  Source = 'source',
  File = 'file',
  ToolCall = 'tool_call',
  ToolCallResult = 'tool_result',
  Tool = 'tool',
  TextDelta = 'text_delta',
}

export type UIMessage = Omit<BaseUIMessage, 'annotations'> & {
  annotations: UIMessageAnnotation[];
};

export type UIMessageAnnotation =
  | TextDeltaMessage
  | TextMessage
  | ReasoningMessage
  | ToolCallMessage
  | ToolCallResultMessage
  | ToolMessage;

export interface ToolMessage {
  type: UIMessageType.Tool;
  toolCallId: string;
  toolName: string;
  // call 对应 tool_result result 对应 tool_result
  state: 'call' | 'result';
  // 0 是 call 1 是 result
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
