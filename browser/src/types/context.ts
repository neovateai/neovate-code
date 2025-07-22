import type { UploadFile } from 'antd';
import type { LexicalNode } from 'lexical';
import type { JSX } from 'react';
import type { FileItem, ImageItem } from '@/api/model';
import type { ContextType } from '@/constants/context';

type AttachmentItem = UploadFile;

export type ContextStoreValue = FileItem | ImageItem | AttachmentItem;

export interface ContextItem {
  type: ContextType;
  /**
   * Only when it's used in context popup menu, it woule be like \@Abc:[xyz]
   *
   * it should be unique
   */
  value: string;
  displayText: string;
  context?: ContextStoreValue;
  /**
   * If true, it will not be removed after send
   */
  remainAfterSend?: boolean;
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
  /** if don't used in context popup menu, it's not required */
  matchRegex: RegExp;
  aiContextId: string;
  valueFormatter?: (value: string) => string;
  /** if don't used in context popup menu, it's not required */
  pickInfo?: (regExpExecArray: RegExpExecArray) => AiContextNodeInfo;
  /** render function */
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
