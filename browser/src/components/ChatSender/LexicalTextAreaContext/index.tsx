import { createContext } from 'react';
import type { AiContextCacheNode, AiContextNodeConfig } from '@/types/context';

/** Inject Editor Contexts into LexicalTextArea */
export const LexicalTextAreaContext = createContext<{
  onEnterPress?: (e: KeyboardEvent) => void;
  onChangeNodes?: (
    prevNodes: AiContextCacheNode[],
    nextNodes: AiContextCacheNode[],
  ) => void;
  value?: string;
  onChange?: (markedText: string, plainText: string) => void;
  onPastingImage?: (loading: boolean) => void;
  aiContextNodeConfigs: AiContextNodeConfig[];
  namespace: string;
}>({ aiContextNodeConfigs: [], namespace: '' });
