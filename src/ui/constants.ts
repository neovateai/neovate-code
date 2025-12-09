export const UI_COLORS = {
  PRODUCT_ASCII_ART: 'cyan',
  PRODUCT_NAME: 'cyanBright',
  PRODUCT_VERSION: 'gray',
  USER: 'gray',
  ASSISTANT: 'magentaBright',
  SYSTEM: 'redBright',
  TOOL: '#10C080',
  TOOL_DESCRIPTION: '#1B6B5A',
  TOOL_RESULT: 'gray',
  ERROR: 'red',
  SUCCESS: 'green',
  WARNING: 'yellow',
  INFO: 'gray',
  CHAT_BORDER: 'gray',
  CHAT_BORDER_MEMORY: 'cyan',
  CHAT_BORDER_BASH: 'magenta',
  CHAT_BORDER_THINKING: 'gray',
  CHAT_BORDER_THINKING_HARD: '#FFC046',
  CHAT_ARROW: '#FF3070',
  CHAT_ARROW_ACTIVE: '#FF3070',
  CANCELED: 'red',
  ACTIVITY_INDICATOR_TEXT: 'gray',
  ACTIVITY_INDICATOR_GRADIENT: {
    BASE: 'gray',
    HIGHLIGHT: 'whiteBright',
    FADE_LEVELS: ['white', 'gray', 'blackBright', 'black'] as const,
  },
  MODE_INDICATOR_TEXT: 'magentaBright',
  MODE_INDICATOR_DESCRIPTION: 'gray',
  // Ask/Select Component Colors
  ASK_PRIMARY: 'blue',
  ASK_SUCCESS: 'green',
  ASK_SECONDARY: 'gray',
  ASK_WARNING: 'yellow',
  ASK_NAV_ACTIVE_BG: 'blue',
  ASK_NAV_ACTIVE_TEXT: 'black',
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

export const PASTE_CONFIG = {
  TIMEOUT_MS: 100,
  RAPID_INPUT_THRESHOLD_MS: 150,
  LARGE_INPUT_THRESHOLD: 300,
  MEDIUM_SIZE_MULTI_CHUNK_THRESHOLD: 200,
  MAX_PASTE_SIZE: 1024 * 1024,
  MAX_PASTE_ITEMS: 20,
  IMAGE_PASTE_MESSAGE_TIMEOUT_MS: 3000,
  PASTE_STATE_TIMEOUT_MS: 500,
} as const;
