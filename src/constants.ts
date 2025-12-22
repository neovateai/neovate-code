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
  '.webp',
]);
export const CANCELED_MESSAGE_TEXT = '[Request interrupted by user]';

export enum TOOL_NAMES {
  TODO_WRITE = 'todoWrite',
  TODO_READ = 'todoRead',
  BASH = 'bash',
  BASH_OUTPUT = 'bash_output',
  KILL_BASH = 'kill_bash',
  GREP = 'grep',
  ASK_USER_QUESTION = 'AskUserQuestion',
  READ = 'read',
  GLOB = 'glob',
  WRITE = 'write',
  EDIT = 'edit',
  LS = 'ls',
  TASK = 'task',
}

export const BASH_EVENTS = {
  PROMPT_BACKGROUND: 'bash:prompt_background',
  MOVE_TO_BACKGROUND: 'bash:move_to_background',
  BACKGROUND_MOVED: 'bash:background_moved',
} as const;

// Reserve 20% buffer for small models
export const MIN_TOKEN_THRESHOLD = 32_000 * 0.8;

export const BACKGROUND_THRESHOLD_MS = 2000;

export enum AGENT_TYPE {
  EXPLORE = 'Explore',
  PLAN = 'Plan',
}
