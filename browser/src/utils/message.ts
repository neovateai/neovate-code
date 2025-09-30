import { CANCELED_MESSAGE_TEXT } from '@/constants';
import type { Message } from '@/types/chat';
import { safeStringify } from './safeStringify';

export function isToolResultMessage(message: Message) {
  return (
    Array.isArray(message.content) &&
    message.content.length === 1 &&
    message.content[0].type === 'tool_result'
  );
}

export function jsonSafeParse(json: string) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error(error);
    return {};
  }
}

export function formatParamsDescription(params: Record<string, any>): string {
  if (!params || typeof params !== 'object') {
    return '';
  }
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return '';
  }
  return entries
    .filter(([_key, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      return `${key}: ${safeStringify(value)}`;
    })
    .join(', ');
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

export function isCanceledMessage(message: Message) {
  return (
    message.role === 'user' &&
    Array.isArray(message.content) &&
    message.content.length === 1 &&
    message.content[0].type === 'text' &&
    message.content[0].text === CANCELED_MESSAGE_TEXT
  );
}
