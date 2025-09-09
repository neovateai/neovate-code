import { CANCELED_MESSAGE_TEXT } from './constants';
import { randomUUID } from './utils/randomUUID';

export type SystemMessage = {
  role: 'system';
  content: string;
};
export type TextPart = {
  type: 'text';
  text: string;
};
export type UserContent = string | Array<TextPart>;
export type ToolUsePart = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
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
export type ToolContent = Array<ToolResultPart>;
export type ToolResultPart = {
  type: 'tool_result';
  id: string;
  name: string;
  input: Record<string, any>;
  result: any;
  isError?: boolean;
};
export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage;
export type NormalizedMessage = Message & {
  type: 'message';
  timestamp: string;
  uuid: string;
  parentUuid: string | null;
};

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
    !isCanceledMessage(message)
  );
}

export function getMessageText(message: Message) {
  return typeof message.content === 'string'
    ? message.content
    : message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
}
