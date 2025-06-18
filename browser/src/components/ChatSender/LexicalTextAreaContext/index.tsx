import { createContext } from 'react';
import type { AiContextCacheNode, AiContextNodeConfig } from '@/types/chat';

/** Inject Editor Contexts into LexicalTextArea */
export const LexicalTextAreaContext = createContext<{
  onEnterPress?: (e: KeyboardEvent) => void;
  onGetNodes?: (nodes: AiContextCacheNode) => void;
  aiContextNodeConfigs: AiContextNodeConfig[];
  namespace: string;
}>({ onEnterPress: () => {}, aiContextNodeConfigs: [], namespace: '' });
