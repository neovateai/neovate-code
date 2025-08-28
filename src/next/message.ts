import { CANCELED_MESSAGE_TEXT } from '../constants';
import { randomUUID } from '../utils/randomUUID';
import type { Message, NormalizedMessage } from './history';

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
