import type { Message } from 'ai';
import type { FileItem } from './files';

export interface ImageItem {
  /** URL or base64 string */
  src: string;
  mime: string;
}

export interface AttachmentItem {
  uid: string;
  size?: number;
  name: string;
  fileName?: string;
  url?: string;
}

export enum ContextType {
  FILE = '__file',
  ATTACHMENT = '__attachment',
  IMAGE = '__image',
  UNKNOWN = '__unknown',
}

export interface ContextItem {
  type: ContextType;
  /**
   * Only when it's used in context popup menu, it woule be like \@Abc:[xyz]
   *
   * it should be unique
   */
  value: string;
  displayText: string;
  context?: FileItem | ImageItem | AttachmentItem;
  [key: string]: any;
}

export interface UserMessage extends Message {
  role: 'user';
  attachedContexts: ContextItem[];
  /**
   * Original content input by the user, including context markers
   */
  contextContent: string;
  planContent?: string;
}

export interface CompletionRequest {
  messages: Array<UserMessage>;
  /**
   * The mode of the completion, can be 'agent', 'ask', 'plan'
   */
  mode: string;
}

export interface CompletionTextContent {
  type: 'text';
  content: string;
  /**
   * The reason why the completion was finished.
   */
  finishReason?: 'stop' | 'length' | 'content_filter';
}
