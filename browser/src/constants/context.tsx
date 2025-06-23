import type { FileItem, ImageItem } from '@/api/model';
import {
  CodeContextTag,
  FileContextTag,
  ImageContextTag,
} from '@/components/ContextTags';
import type { AiContextNodeConfig, ContextFileType } from '@/types/context';

export enum ContextType {
  FILE = 'file',
  CODE = 'code',
  IMAGE = 'image',
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
    render: ({ info, onClose, context }) => (
      <FileContextTag
        key={info.value}
        displayText={info.displayText}
        onClose={onClose}
        context={context as FileItem}
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
    type: ContextType.IMAGE,
    matchRegex: /@Image:\[(?<value>[^\]]+)\]/,
    aiContextId: 'image',
    displayTextToValue: (displayText) => `@Image:[${displayText}]`,
    pickInfo: (regExpExecArray) => ({
      value: regExpExecArray[0],
      displayText: regExpExecArray.groups?.value || '',
    }),
    render: ({ info, onClose, context }) => (
      <ImageContextTag
        key={info.value}
        displayText={info.displayText}
        onClose={onClose}
        context={context as ImageItem}
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
