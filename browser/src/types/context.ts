import type { ContextType } from '@/constants/context';

export interface ContextItem {
  type: ContextType;
  value: string;
  displayText: string;
  context?: any;
}

export interface ContextFileType {
  extName: string;
  mime: string;
}
