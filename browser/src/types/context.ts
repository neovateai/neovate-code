import type { ImageItem } from '@/api/model';
import type { ContextType } from '@/constants/context';
import type { FileItem, SlashCommand } from '@/types/chat';

export type ContextStoreValue = ImageItem | SlashCommand | FileItem;

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
