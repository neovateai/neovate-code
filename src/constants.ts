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
  EXIT_PLAN_MODE = 'ExitPlanMode',
  SKILL = 'skill',
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

export const PLAN_MODE_EVENTS = {
  EXIT_PLAN_MODE: 'plan.exit',
  PREVIEW_PLAN: 'plan.preview',
} as const;

// ============================================
// Compression Strategy Constants
// ============================================

// Compaction configuration
export const COMPACTION_OUTPUT_TOKEN_MAX = 4096;
export const COMPACTION_TRIGGER_RATIO = 0.7; // Trigger compression at 70% context usage

// Pruning configuration
export const PRUNE_PROTECT_THRESHOLD = 40_000; // Protect threshold: recent 40k tokens not pruned
export const PRUNE_MINIMUM = 20_000; // Minimum prune amount: skip if below this
export const PRUNE_PROTECT_TURNS = 2; // Protect recent 2 conversation turns
// why we need to protect the following tools? when pruning, protect the following tools, avoid losing main context information when pruning
export const PRUNE_PROTECTED_TOOLS = [TOOL_NAMES.SKILL, TOOL_NAMES.TASK]; // Protected tool list
// Truncation configuration
export const TRUNCATE_MAX_LINES = 2000; // Maximum lines
export const TRUNCATE_MAX_BYTES = 50 * 1024; // Maximum bytes (50KB)
