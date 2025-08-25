import type { UploadFile } from 'antd';
import type { FileItem, ImageItem } from '@/api/model';
import type { ContextType } from '@/constants/context';

type AttachmentItem = UploadFile;

export type ContextStoreValue = FileItem | ImageItem | AttachmentItem;

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
