import type { LexicalNode } from 'lexical';
import type { JSX } from 'react';
import type { ContextType } from '@/constants/ContextType';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  DATA = 'data',
  TOOL_CALL = 'tool-call',
}

export interface BaseMessage {
  role: MessageRole;
}

export interface TextMessage extends BaseMessage {
  content: string;
}

export interface ToolCallMessage extends BaseMessage {
  type: MessageRole.TOOL_CALL;
  content: ToolCallContent;
}

export interface ToolCallContent {
  toolName: string;
  args: string;
  result: string;
}

export interface ChatMixedMessage extends BaseMessage {
  content: string;
  nonTextMessages: NonTextMessage[];
}

// 非文本消息 比如 ToolCallMessage
export type NonTextMessage = ToolCallMessage;

export interface BubbleMessage {
  type: MessageType;
  content: string;
  nonTextMessages?: NonTextMessage[];
}

export interface ChatMessage {
  role: MessageRole;
  content: BubbleMessage;
}

export enum MessageType {
  TEXT_DELTA = 'text-delta',
  CONNECT = 'connect',
  MIXED = 'mixed',
}

export interface AiContextNodeInfo {
  displayText: string;
  value: string;
}

export interface AiContextNodeConfig {
  type: ContextType;
  matchRegex: RegExp;
  aiContextId: string;
  displayTextToValue: (text: string) => string;
  pickInfo: (regExpExecArray: RegExpExecArray) => AiContextNodeInfo;
  render: (info: AiContextNodeInfo, onClose?: () => void) => JSX.Element;
}

export interface AiContextCacheNode {
  type: ContextType;
  originalText: string;
  displayText: string;
  lexicalNode: LexicalNode;
}

export interface AppendedLexicalNode {
  lexicalNode: LexicalNode;
  type: string;
  length?: number;
}
