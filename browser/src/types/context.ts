import type { LexicalNode } from 'lexical';
import type { JSX } from 'react';
import type { FileItem, ImageItem } from '@/api/model';
import type { ContextType } from '@/constants/context';

export type ContextStoreValue = FileItem | ImageItem;

export interface ContextItem {
  type: ContextType;
  value: string;
  displayText: string;
  context?: ContextStoreValue;
  [key: string]: any;
}

export interface ContextFileType {
  extName: string;
  mime: string;
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
  render: (args: {
    info: AiContextNodeInfo;
    onClose?: () => void;
    context?: ContextStoreValue;
  }) => JSX.Element;
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
