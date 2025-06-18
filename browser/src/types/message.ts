import type {
  UIMessage as BaseUIMessage,
  FileUIPart,
  ReasoningUIPart,
  SourceUIPart,
  StepStartUIPart,
  TextUIPart,
  ToolInvocationUIPart,
} from '@ai-sdk/ui-utils';

export type UIMessage = BaseUIMessage;

export type TextMessage = TextUIPart;

export type ReasoningMessage = ReasoningUIPart;

export type ToolInvocationMessage = ToolInvocationUIPart;

export type SourceMessage = SourceUIPart;

export type FileMessage = FileUIPart;

export type StepStartMessage = StepStartUIPart;
