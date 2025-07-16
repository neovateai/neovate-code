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
