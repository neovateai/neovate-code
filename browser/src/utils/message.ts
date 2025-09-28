import type { Message } from '@/types/chat';

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
    return null;
  }
}
