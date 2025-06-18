import {
  CodeContextTag,
  FileContextTag,
  KnowledgeContextTag,
} from '@/components/ContextTags';
import type { AiContextNodeConfig } from '@/types/chat';
import { ContextType } from './ContextType';

export const AI_CONTEXT_NODE_CONFIGS: AiContextNodeConfig[] = [
  {
    type: ContextType.FILE,
    matchRegex: /@File:\[(?<value>[^\]]+)\]/,
    aiContextId: 'file',
    displayTextToValue: (displayText) => `@File:[${displayText}]`,
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ displayText, value }, onClose) => (
      <FileContextTag key={value} displayText={displayText} onClose={onClose} />
    ),
  },
  {
    type: ContextType.CODE,
    matchRegex: /@Code:\[(?<value>[^\]]+)\]/,
    aiContextId: 'code',
    displayTextToValue: (displayText) => `@Code:[${displayText}]`,
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ displayText, value }, onClose) => (
      <CodeContextTag key={value} displayText={displayText} onClose={onClose} />
    ),
  },
  {
    type: ContextType.KNOWLEDGE,
    matchRegex: /@Knowledge:\[(?<value>[^\]]+)\]/,
    aiContextId: 'knowledge',
    displayTextToValue: (displayText) => `@Knowledge:[${displayText}]`,
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ displayText, value }, onClose) => (
      <KnowledgeContextTag
        key={value}
        displayText={displayText}
        onClose={onClose}
      />
    ),
  },
];
