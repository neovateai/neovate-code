export const PRODUCT_NAME = 'NEOVATE';
export const PRODUCT_ASCII_ART = `
█▄ █ █▀▀ █▀█ █ █ ▄▀█ ▀█▀ █▀▀
█ ▀█ ██▄ █▄█ ▀▄▀ █▀█  █  ██▄
`.trim();
export const DEFAULT_OUTPUT_STYLE_NAME = 'Default';
export const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.tiff',
  '.tif',
]);
export const CANCELED_MESSAGE_TEXT = '[Request interrupted by user]';

export enum TOOL_NAMES {
  TODO_WRITE = 'todoWrite',
  TODO_READ = 'todoRead',
  BASH = 'bash',
}
