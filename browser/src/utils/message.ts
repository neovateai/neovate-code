import { CANCELED_MESSAGE_TEXT } from '@/constants';
import type {
  Message,
  ToolResultPart,
  UIAssistantMessage,
  UIMessage,
} from '@/types/chat';
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

export function formatMessages(messages: Message[]): UIMessage[] {
  const formattedMessages: UIMessage[] = [];

  for (const message of messages) {
    if (
      message.role === 'assistant' &&
      Array.isArray(message.content) &&
      message.content.some((content) => content.type === 'tool_use')
    ) {
      const uiMessage = {
        ...message,
        content: message.content.map((part) => {
          if (part.type === 'tool_use') {
            return {
              ...part,
              type: 'tool',
              state: 'tool_use',
            };
          }
          return part;
        }),
      } as UIMessage;
      formattedMessages.push(uiMessage);
      continue;
    }

    if (isToolResultMessage(message)) {
      const lastMessage = formattedMessages[
        formattedMessages.length - 1
      ] as UIAssistantMessage;
      if (lastMessage) {
        const toolResult = message.content[0] as ToolResultPart;
        const matchToolUse = lastMessage.content.find(
          (part) =>
            part.type === 'tool' &&
            part.state === 'tool_use' &&
            part.id === toolResult.id,
        );
        if (!matchToolUse) {
          throw new Error('Tool result message must be after tool use message');
        }
        const uiMessage = {
          ...lastMessage,
          content: lastMessage.content.map((part) => {
            if (part.type === 'tool' && part.id === toolResult.id) {
              return {
                ...part,
                ...toolResult,
                type: 'tool',
                state: 'tool_result',
              };
            }
            return part;
          }),
        } as UIMessage;
        formattedMessages[formattedMessages.length - 1] = uiMessage;
        continue;
      } else {
        throw new Error('Tool result message must be after tool use message');
      }
    }

    formattedMessages.push(message as UIMessage);
  }

  return formattedMessages;
}
