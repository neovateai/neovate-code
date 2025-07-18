export const PRODUCT_NAME = 'TAKUMI';

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

// todo-write will be converted to todo_write causing tool name mismatch
export enum TOOL_NAME {
  TODO_WRITE = 'todoWrite',
  TODO_READ = 'todoRead',
  BASH = 'bash',
}

// Reserve 20% buffer for small models
export const MIN_TOKEN_THRESHOLD = 32_000 * 0.8;
export const OUTPUT_TOKEN_MAX = 32_000;
