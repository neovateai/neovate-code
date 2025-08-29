import type { ContextFileType } from '@/types/context';

export enum ContextType {
  FILE = '__file',
  ATTACHMENT = '__attachment',
  IMAGE = '__image',
  SLASH_COMMAND = '__slash_command',
  UNKNOWN = '__unknown',
}

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
  // disable svg because claude doesn't support it
  // {
  //   extName: '.svg',
  //   mime: 'image/svg+xml',
  // },
  {
    extName: '.webp',
    mime: 'image/webp',
  },
];

/** 10MB */
export const CONTEXT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const CONTEXT_MAX_POPUP_ITEM_COUNT = 50;
