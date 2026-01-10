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

export const BINARY_EXTENSIONS = new Set([
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.class',
  '.o',
  '.obj',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.jar',
  '.war',
  // Database
  '.db',
  '.sqlite',
  '.sqlite3',
  '.parquet',
  '.h5',
  // Media (Non-image)
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.mkv',
  // System
  '.ds_store',
  'thumbs.db',
]);
export const CANCELED_MESSAGE_TEXT = '[Request interrupted by user]';

export enum TOOL_NAMES {
  TODO_WRITE = 'todoWrite',
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
  GENERAL_PURPOSE = 'GeneralPurpose',
  NEOVATE_CODE_GUIDE = 'neovate-code-guide',
}
