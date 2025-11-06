import { CANCELED_MESSAGE_TEXT } from './constants';
import type { ToolResult } from './tool';
import { randomUUID } from './utils/randomUUID';

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

export type UserContent = string | Array<TextPart | ImagePart>;

export type ToolUsePart = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
  displayName?: string;
  description?: string;
};
export type ReasoningPart = {
  type: 'reasoning';
  text: string;
};
export type AssistantContent =
  | string
  | Array<TextPart | ReasoningPart | ToolUsePart>;
export type AssistantMessage = {
  role: 'assistant';
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
export type UserMessage = {
  role: 'user';
  content: UserContent;
  hidden?: boolean;
};
export type ToolMessage = {
  role: 'user';
  content: ToolContent;
};
export type ToolMessage2 = {
  role: 'tool';
  content: ToolResultPart2[];
};
export type ToolResultPart2 = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  result: ToolResult;
};
export type ToolContent = Array<ToolResultPart>;
export type ToolResultPart = {
  type: 'tool_result';
  id: string;
  name: string;
  input: Record<string, any>;
  result: ToolResult;
};

export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | ToolMessage2;
export type NormalizedMessage = Message & {
  type: 'message';
  timestamp: string;
  uuid: string;
  parentUuid: string | null;
  uiContent?: string;
};

export function toolResultPart2ToToolResultPart(
  part: ToolResultPart2,
): ToolResultPart {
  return {
    type: 'tool_result',
    id: part.toolCallId,
    name: part.toolName,
    input: part.input,
    result: part.result,
  };
}

export function createUserMessage(
  content: string,
  parentUuid: string | null,
): NormalizedMessage {
  return {
    parentUuid,
    uuid: randomUUID(),
    role: 'user',
    content,
    type: 'message',
    timestamp: new Date().toISOString(),
  };
}

export function isToolResultMessage(message: Message) {
  return (
    Array.isArray(message.content) &&
    message.content.length === 1 &&
    message.content[0].type === 'tool_result'
  );
}

export function isCanceledMessage(message: Message) {
  return (
    message.role === 'user' &&
    Array.isArray(message.content) &&
    message.content.length === 1 &&
    message.content[0].type === 'text' &&
    message.content[0].text === CANCELED_MESSAGE_TEXT
  );
}

export function isUserTextMessage(message: Message) {
  return (
    message.role === 'user' &&
    !isToolResultMessage(message) &&
    !isCanceledMessage(message) &&
    !isUserBashCommandMessage(message) &&
    !isUserBashOutputMessage(message)
  );
}

export function isUserBashCommandMessage(message: Message) {
  return (
    message.role === 'user' &&
    typeof message.content === 'string' &&
    message.content.startsWith('<bash-input>')
  );
}

export function isUserBashOutputMessage(message: Message) {
  return (
    message.role === 'user' &&
    typeof message.content === 'string' &&
    message.content.startsWith('<bash-stdout>')
  );
}

export function getMessageText(message: Message) {
  if (
    'uiContent' in message &&
    message.uiContent &&
    typeof message.uiContent === 'string'
  ) {
    return message.uiContent;
  }
  return typeof message.content === 'string'
    ? message.content
    : message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
}

/**
 * Finds tool uses in the last assistant message that don't have corresponding tool results.
 * This is useful for identifying incomplete tool executions, such as when a session is canceled
 * before all tools have finished executing.
 *
 * @param messages - Array of normalized messages to analyze
 * @returns Object containing the assistant message and incomplete tool uses, or null if none found
 */
export function findIncompleteToolUses(messages: NormalizedMessage[]): {
  assistantMessage: NormalizedMessage;
  incompleteToolUses: ToolUsePart[];
} | null {
  if (messages.length === 0) {
    return null;
  }

  // Find the last assistant message
  let lastAssistantMessage: NormalizedMessage | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantMessage = messages[i];
      break;
    }
  }

  if (!lastAssistantMessage || !Array.isArray(lastAssistantMessage.content)) {
    return null;
  }

  // Extract all tool_use from the assistant message
  const toolUses = lastAssistantMessage.content.filter(
    (part): part is ToolUsePart => part.type === 'tool_use',
  );

  if (toolUses.length === 0) {
    return null;
  }

  // Find all tool_result messages after the assistant message
  const assistantIndex = messages.lastIndexOf(lastAssistantMessage);
  const subsequentMessages = messages.slice(assistantIndex + 1);

  // Collect all tool_result IDs from subsequent messages
  const completedToolIds = new Set<string>();
  for (const msg of subsequentMessages) {
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'tool-result') {
          completedToolIds.add(part.toolCallId);
        }
      }
    }
  }

  // Find tool_uses that don't have corresponding tool_results
  const incompleteToolUses = toolUses.filter(
    (toolUse) => !completedToolIds.has(toolUse.id),
  );

  if (incompleteToolUses.length === 0) {
    return null;
  }

  return {
    assistantMessage: lastAssistantMessage,
    incompleteToolUses,
  };
}
