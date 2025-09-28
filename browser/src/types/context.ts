import type { FileItem, ImageItem, SlashCommandItem } from '@/api/model';
import type { ContextType } from '@/constants/context';

export type ContextStoreValue = FileItem | ImageItem | SlashCommandItem;

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
