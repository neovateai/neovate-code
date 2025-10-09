import type { ContextFileType } from '@/types/context';

export enum ContextType {
  FILE = '__file',
  ATTACHMENT = '__attachment',
  IMAGE = '__image',
  SLASH_COMMAND = '__slash_command',
  UNKNOWN = '__unknown',
}

export const CONTEXT_AVAILABLE_FILE_TYPES: ContextFileType[] = [
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
    extName: '.webp',
    mime: 'image/webp',
  },
];

/** 10MB */
export const CONTEXT_MAX_FILE_SIZE = 10 * 1024 * 1024;
