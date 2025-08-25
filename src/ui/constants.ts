import path from 'path';

// Status-related constants
export const APP_STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  AWAITING_USER_INPUT: 'awaiting_user_input',
  TOOL_APPROVED: 'tool_approved',
  TOOL_EXECUTING: 'tool_executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Status messages
export const STATUS_MESSAGES = {
  [APP_STATUS.TOOL_APPROVED]: 'Tool approved, starting execution...',
  [APP_STATUS.TOOL_EXECUTING]: 'Executing tool...',
  [APP_STATUS.PROCESSING]: 'Processing...',
  [APP_STATUS.PROCESSING + '_plan']: 'Planning...',
  [APP_STATUS.CANCELLED]: 'Query cancelled',
} as const;

// Tool names and configurations
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

// Tool description extractors
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

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  THINKING: 'thinking',
  TOOL_CALL: 'tool-call',
  TOOL_RESULT: 'tool-result',
  BASH_COMMAND: 'bash-command',
  BASH_RESULT: 'bash-result',
} as const;

// Message roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
} as const;

// UI colors
export const UI_COLORS = {
  USER: 'blueBright',
  ASSISTANT: 'magentaBright',
  SYSTEM: 'redBright',
  TOOL: 'greenBright',
  TOOL_RESULT: 'gray',
  ERROR: 'red',
  SUCCESS: 'green',
  WARNING: 'yellow',
  INFO: 'gray',
} as const;

// Border colors for different states
export const BORDER_COLORS = {
  DEFAULT: 'blueBright',
  PROCESSING: 'gray',
  ERROR: 'redBright',
  WARNING: 'yellow',
  BASH: 'magentaBright',
} as const;

// Approval options
export const APPROVAL_OPTIONS = [
  {
    label: 'Yes (once)',
    value: 'approve_once',
  },
  {
    label: 'Yes (always for this command)',
    value: 'approve_always',
  },
  {
    label: 'Yes (always for tool)',
    value: 'approve_always_tool',
  },
  {
    label: 'No',
    value: 'deny',
  },
] as const;

// Edit approval options (for edit tool specifically)
export const EDIT_APPROVAL_OPTIONS = [
  {
    label: 'Yes (once)',
    value: 'approve_once',
  },
  {
    label: 'Yes (always for this command)',
    value: 'approve_always',
  },
  {
    label: 'Yes (always for tool)',
    value: 'approve_always_tool',
  },
  {
    label: 'Modify with external editor',
    value: 'modify_with_editor',
  },
  {
    label: 'No',
    value: 'deny',
  },
] as const;

// Plan modal options
export const PLAN_OPTIONS = [
  {
    label: 'Yes',
    value: true,
  },
  {
    label: 'No, I want to edit the plan',
    value: false,
  },
] as const;

// Default spacing values
export const SPACING = {
  MESSAGE_MARGIN_TOP: 1,
  MESSAGE_MARGIN_LEFT: 4,
  TOOL_MESSAGE_MARGIN_TOP: 0,
  USER_MESSAGE_MARGIN_LEFT: 0,
} as const;
