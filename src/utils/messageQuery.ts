import type { Message, NormalizedMessage } from '../message';

/**
 * Finds the last assistant message that processed a given user message.
 *
 * Searches for assistant messages after the target user message but before
 * the next user message (if any). Returns the UUID of the last assistant
 * in this range.
 *
 * @param messages - Array of messages to search
 * @param targetMessageUuid - UUID of the target user message
 * @returns UUID of the last assistant message, or null if not found
 */
export function findLastAssistantAfterUser(
  messages: Message[],
  targetMessageUuid: string,
): string | null {
  const messageIndex = messages.findIndex(
    (m) => (m as NormalizedMessage).uuid === targetMessageUuid,
  );

  if (messageIndex === -1) {
    return null;
  }

  let lastAssistantUuid: string | null = null;

  for (let i = messageIndex + 1; i < messages.length; i++) {
    const msg = messages[i] as NormalizedMessage;

    if (msg.role === 'user') {
      break;
    }

    if (msg.role === 'assistant') {
      lastAssistantUuid = msg.uuid;
    }
  }

  return lastAssistantUuid;
}
