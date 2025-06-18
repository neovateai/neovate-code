import type { Message } from 'ai';
import type { FileItem } from './files';

interface CompletionContext {
  files: FileItem[];
}

export interface CompletionRequest {
  messages: Array<Message>;
  contexts?: CompletionContext;
  plan?: boolean;
}

export interface CompletionTextContent {
  type: 'text';
  content: string;
  /**
   * The reason why the completion was finished.
   */
  finishReason?: 'stop' | 'length' | 'content_filter';
}

export interface AssistantContent {}
