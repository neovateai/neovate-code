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
