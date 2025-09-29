import type { FileItem, ImageItem } from '@/api/model';
import type { ContextType } from '@/constants/context';
import type { SlashCommand } from '@/types/chat';

export type ContextStoreValue = FileItem | ImageItem | SlashCommand;

export interface ContextItem {
  type: ContextType;
  value: string;
  displayText: string;
  context?: ContextStoreValue;
}

export interface ContextFileType {
  extName: string;
  mime: string;
}
