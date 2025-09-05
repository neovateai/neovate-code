import path from 'path';

export const UI_COLORS = {
  PRODUCT_ASCII_ART: 'cyan',
  PRODUCT_NAME: 'cyanBright',
  PRODUCT_VERSION: 'gray',
  USER: 'blueBright',
  ASSISTANT: 'magentaBright',
  SYSTEM: 'redBright',
  TOOL: 'greenBright',
  TOOL_DESCRIPTION: 'green',
  TOOL_RESULT: 'gray',
  ERROR: 'red',
  SUCCESS: 'green',
  WARNING: 'yellow',
  INFO: 'gray',
  CHAT_BORDER: 'gray',
  CHAT_ARROW: 'gray',
  CHAT_ARROW_ACTIVE: 'white',
  CANCELED: 'red',
  ACTIVITY_INDICATOR_TEXT: 'gray',
  ACTIVITY_INDICATOR_GRADIENT: {
    BASE: 'gray',
    HIGHLIGHT: 'whiteBright',
    FADE_LEVELS: ['white', 'gray', 'blackBright', 'black'] as const,
  },
  MODE_INDICATOR_TEXT: 'magentaBright',
  MODE_INDICATOR_DESCRIPTION: 'gray',
} as const;

export const SPACING = {
  CHAT_INPUT_MARGIN_TOP: 1,
  ACTIVITY_INDICATOR_MARGIN_TOP: 1,
  MODE_INDICATOR_MARGIN_TOP: 0,
  MESSAGE_MARGIN_TOP: 1,
  MESSAGE_MARGIN_TOP_TOOL_RESULT: 0,
  MESSAGE_MARGIN_LEFT: 4,
  MESSAGE_MARGIN_LEFT_USER: 0,
} as const;

export const TOOL_NAMES = {
  READ: 'read',
  BASH: 'bash',
  EDIT: 'edit',
  WRITE: 'write',
  FETCH: 'fetch',
  GLOB: 'glob',
  GREP: 'grep',
  LS: 'ls',
} as const;

export const TOOL_DESCRIPTION_EXTRACTORS = {
  [TOOL_NAMES.READ]: (args: any, cwd: string) =>
    !args.file_path
      ? 'No file path provided'
      : path.relative(cwd, args.file_path),
  [TOOL_NAMES.BASH]: (args: any, cwd: string) => {
    if (!args.command || typeof args.command !== 'string') {
      return 'No command provided';
    }
    const command = args.command.trim();
    return command.length > 100 ? command.substring(0, 97) + '...' : command;
  },
  [TOOL_NAMES.EDIT]: (args: any, cwd: string) =>
    !args.file_path
      ? 'No file path provided'
      : path.relative(cwd, args.file_path),
  [TOOL_NAMES.WRITE]: (args: any, cwd: string) =>
    !args.file_path
      ? 'No file path provided'
      : path.relative(cwd, args.file_path),
  [TOOL_NAMES.FETCH]: (args: any, cwd: string) => args.url,
  [TOOL_NAMES.GLOB]: (args: any, cwd: string) => args.pattern,
  [TOOL_NAMES.GREP]: (args: any, cwd: string) => args.pattern,
  [TOOL_NAMES.LS]: (args: any, cwd: string) =>
    args.dir_path ? path.relative(cwd, args.dir_path) : '.',
} as const;

export const ANIMATION_CONFIG = {
  TEXT_GRADIENT_SPEED: 150,
  GRADIENT_COLORS: {
    BASE: 'gray',
    HIGHLIGHT: 'whiteBright',
    FADE_LEVELS: ['white', 'gray', 'blackBright', 'black'] as const,
  },
  SPEED_LIMITS: {
    MIN: 50,
    MAX: 200,
  },
} as const;
