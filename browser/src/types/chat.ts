import { LexicalNode } from 'lexical';

export type BubbleDataType = {
  role: string;
  content: string | MixedMessage | ToolCallMessage | NonTextMessage;
};

// 混合消息类型
export interface MixedMessage {
  type: 'mixed';
  textContent: string;
  nonTextMessages: NonTextMessage[];
}

// 工具调用消息类型
export interface ToolCallMessage {
  type: 'tool-call';
  id?: string;
  content: {
    toolName: string;
    args?: any;
    result?: any;
  };
}

// 其他非文本消息类型
export interface NonTextMessage {
  type: string;
  id?: string;
  content?: any;
  // 调试和管理相关的属性
  _messageKey?: string;
  _timestamp?: number;
}

export interface AiContextNodeInfo {
  displayText: string;
  value: string;
}

export interface AiContextNodeConfig {
  matchRegex: RegExp;
  aiContextId: string;
  pickInfo: (regExpExecArray: RegExpExecArray) => AiContextNodeInfo;
  render: (info: AiContextNodeInfo) => JSX.Element;
}

export interface AiContextCacheNode {
  type: string;
  originalText: string;
  displayText: string;
  lexicalNode: LexicalNode;
}

export interface AppendedLexicalNode {
  lexicalNode: LexicalNode;
  type: string;
  length?: number;
}
