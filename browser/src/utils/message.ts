import { CANCELED_MESSAGE_TEXT } from '@/constants';
import type {
  Message,
  ToolMessage2,
  ToolResultPart,
  ToolResultPart2,
  UIAssistantMessage,
  UIMessage,
} from '@/types/chat';
import { safeStringify } from './safeStringify';

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

    // 处理新格式的 ToolMessage2 (role: 'tool')
    if (message.role === 'tool') {
      const lastMessage = formattedMessages[
        formattedMessages.length - 1
      ] as UIAssistantMessage;

      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('Tool message must be after assistant message');
      }

      // 遍历所有 tool results，更新对应的 tool_use
      const toolMessage = message as ToolMessage2;
      toolMessage.content.forEach((toolResultPart2) => {
        const toolResult = toolResultPart2ToToolResultPart(toolResultPart2);

        const uiMessage = {
          ...lastMessage,
          content: lastMessage.content.map((part) => {
            if (
              part.type === 'tool' &&
              part.state === 'tool_use' &&
              part.id === toolResult.id
            ) {
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
      });
      continue;
    }

    formattedMessages.push(message as UIMessage);
  }

  return formattedMessages;
}
