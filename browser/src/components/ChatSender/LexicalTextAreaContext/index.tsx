import { createContext } from 'react';
import { AiContextNodeConfig } from '@/types/chat';

/** Inject Editor Contexts into LexicalTextArea */
export const LexicalTextAreaContext = createContext<{
  onEnterPress?: (e: KeyboardEvent) => void;
  aiContextNodeConfigs: AiContextNodeConfig[];
}>({ onEnterPress: () => {}, aiContextNodeConfigs: [] });
