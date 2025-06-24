import type { FileItem, ImageItem } from '@/api/model';
import {
  AttachmentContextTag,
  FileContextTag,
  ImageContextTag,
} from '@/components/ContextTags';
import type { AiContextNodeConfig, ContextFileType } from '@/types/context';

export enum ContextType {
  FILE = '__file',
  ATTACHMENT = '__attachment',
  IMAGE = '__image',
  UNKNOWN = '__unknown',
}

export const AI_CONTEXT_NODE_CONFIGS: AiContextNodeConfig[] = [
  {
    type: ContextType.FILE,
    matchRegex: /@File:\[(?<value>[^\]]+)\]/,
    aiContextId: 'file',
    valueFormatter: (value) => `@File:[${value}]`,
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
    type: ContextType.ATTACHMENT,
    matchRegex: /@Attachment:\[(?<value>[^\]]+)\]/,
    aiContextId: 'attachment',
    render: ({ info, onClose }) => (
      <AttachmentContextTag
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
export const CONTEXT_MAX_FILE_SIZE = 10 * 1024 * 1024;
