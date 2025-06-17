import { createContext } from 'react';

export interface AiContextNodeInfo {
  displayText: string;
  value: string;
}

export interface AiContextNodeConfig {
  matchRegex: RegExp;
  aiContextId: string;
  pickInfo: (regExpExecArray: RegExpExecArray) => AiContextNodeInfo;
  render: (info: AiContextNodeInfo) => JSX.Element;
}

export const LexicalTextAreaContext = createContext<{
  onEnterPress: (e: KeyboardEvent) => void;
  aiContextNodeConfigs: AiContextNodeConfig[];
}>({ onEnterPress: () => {}, aiContextNodeConfigs: [] });
