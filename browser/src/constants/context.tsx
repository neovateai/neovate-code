import {
  CodeContextTag,
  FileContextTag,
  KnowledgeContextTag,
} from '@/components/ContextTags';
import type { AiContextNodeConfig, ContextFileType } from '@/types/context';

export enum ContextType {
  FILE = 'file',
  CODE = 'code',
  KNOWLEDGE = 'knowledge',
  UNKNOWN = 'unknown',
}

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
    render: ({ info, onClose }) => (
      <FileContextTag
        key={info.value}
        displayText={info.displayText}
        onClose={onClose}
      />
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
    render: ({ info, onClose }) => (
      <CodeContextTag
        key={info.value}
        displayText={info.displayText}
        onClose={onClose}
      />
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
    render: ({ info, onClose }) => (
      <KnowledgeContextTag
        key={info.value}
        displayText={info.displayText}
        onClose={onClose}
      />
    ),
  },
];

export const CONTEXT_AVAILABLE_FILE_TYPES: ContextFileType[] = [
  // Text & Applications
  {
    extName: '.txt',
    mime: 'text/plain',
  },
  {
    extName: '.md',
    mime: 'text/markdown',
  },
  {
    extName: '.json',
    mime: 'application/json',
  },
  // Images
  {
    extName: '.png',
    mime: 'image/png',
  },
  {
    extName: '.jpg',
    mime: 'image/jpeg',
  },
  {
    extName: '.jpeg',
    mime: 'image/jpeg',
  },
  {
    extName: '.gif',
    mime: 'image/gif',
  },
  {
    extName: '.svg',
    mime: 'image/svg+xml',
  },
  {
    extName: '.webp',
    mime: 'image/webp',
  },
];

/** 10MB */
export const CONTEXT_MAX_FILE_SIZE = 1 * 1024 * 1024;
