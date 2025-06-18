import type { ContextType } from '@/constants/ContextType';

export interface ContextItem {
  type: ContextType;
  value: string;
  displayText: string;
  context?: any;
}
