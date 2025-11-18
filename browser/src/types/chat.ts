import type { Delta } from 'quill';

export type SystemMessage = {
  role: 'system';
  content: string;
};

export type TextPart = {
  type: 'text';
  text: string;
};

export type ImagePart = {
  type: 'image';
  data: string;
  mimeType: string;
};

export type FilePart = {
  type: 'file';
  filename?: string;
  data: string;
  mimeType: string;
};

export type UserContent = string | Array<TextPart | ImagePart | FilePart>;

export type UserMessage = {
  role: 'user';
  content: UserContent;
  hidden?: boolean;
  uiContent?: string;
};

export type ReasoningPart = {
  type: 'reasoning';
  text: string;
};

export type ToolUsePart = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
  displayName?: string;
  description?: string;
};

// assistant message
export type AssistantContent =
  | string
  | Array<TextPart | ReasoningPart | ToolUsePart>;

export type AssistantMessage = {
  role: 'assistant';
  uuid: string;
  parentUuid: string | null;
  content: AssistantContent;
  text: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
};

//  tool message
type TodoItem = {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
};

type TodoReadReturnDisplay = {
  type: 'todo_read';
  todos: TodoItem[];
};

type TodoWriteReturnDisplay = {
  type: 'todo_write';
  oldTodos: TodoItem[];
  newTodos: TodoItem[];
};

type DiffViewerReturnDisplay = {
  type: 'diff_viewer';
  originalContent: string | { inputKey: string };
  newContent: string | { inputKey: string };
  filePath: string;
  [key: string]: any;
};

export type ToolResult = {
  llmContent: string | (TextPart | ImagePart)[];
  returnDisplay?:
    | string
    | DiffViewerReturnDisplay
    | TodoReadReturnDisplay
    | TodoWriteReturnDisplay;
  isError?: boolean;
};

export type ToolResultPart = {
  type: 'tool_result';
  id: string;
  name: string;
  input: Record<string, any>;
  result: ToolResult;
};

export type ToolResultContent = Array<ToolResultPart>;

export type ToolResultMessage = {
  role: 'user';
  content: ToolResultContent;
};

export type ToolUseMessage = {
  role: 'user';
  content: ToolUsePart;
};

// New format ToolMessage2 related types
export type ToolResultPart2 = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  result: ToolResult;
};

export type ToolMessage2 = {
  role: 'tool';
  content: ToolResultPart2[];
};

export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | ToolMessage2;

export type UIToolPart = {
  type: 'tool';
  state: 'tool_use' | 'tool_result';
  id: string;
  name: string;
  input: Record<string, any>;
  // tool_result
  result?: ToolResult;

  // tool_use
  displayName?: string;
  description?: string;
};

export type UIAssistantContent = Array<TextPart | ReasoningPart | UIToolPart>;

export type UIAssistantMessage = {
  role: 'assistant';
  uuid: string;
  parentUuid: string | null;
  content: UIAssistantContent;
  text: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
};

export type UIDisplayContent = {
  type: 'error' | 'info' | 'compression';
  text: string;
};

export type UIDisplayMessage = {
  role: 'ui_display';
  content: UIDisplayContent;
};

export type UIMessage =
  | SystemMessage
  | UserMessage
  | UIAssistantMessage
  | UIDisplayMessage;

export type LoopResult =
  | {
      success: true;
      data: Record<string, any>;
      metadata: {
        turnsCount: number;
        toolCallsCount: number;
        duration: number;
      };
    }
  | {
      success: false;
      error: {
        type: 'tool_denied' | 'max_turns_exceeded' | 'api_error' | 'canceled';
        message: string;
        details?: Record<string, any>;
      };
    };

// approval
export type ApprovalResult =
  | 'approve_once'
  | 'approve_always_edit'
  | 'approve_always_tool'
  | 'deny';

export type ToolUse = {
  name: string;
  params: Record<string, any>;
  callId: string;
};

export type ApprovalCategory = 'read' | 'write' | 'command' | 'network';

// slash command
export interface SlashCommand {
  type: 'local' | 'local-jsx' | 'prompt';
  name: string;
  description: string;
  isEnabled?: boolean;
}

export enum CommandSource {
  Builtin = 'builtin',
  User = 'user',
  Project = 'project',
  Plugin = 'plugin',
}

export type CommandEntry = {
  command: SlashCommand;
  source: CommandSource;
};

export type NodeBridgeResponse<T = any> = {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
};

export interface UIUserMessage extends UserMessage {
  delta?: Delta;
}

// files
export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}
