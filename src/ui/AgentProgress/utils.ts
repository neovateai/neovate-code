import type {
  AssistantMessage,
  NormalizedMessage,
  ToolResultPart,
  ToolResultPart2,
  ToolUsePart,
} from '../../message';

/**
 * Calculate statistics for SubAgent messages
 */
export function calculateStats(messages: NormalizedMessage[]) {
  let toolCalls = 0;
  let tokens = 0;

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const assistantMsg = msg as AssistantMessage;

      // Count tool calls
      if (Array.isArray(assistantMsg.content)) {
        toolCalls += assistantMsg.content.filter(
          (p) => p.type === 'tool_use',
        ).length;
      }

      // Count tokens
      if ('usage' in assistantMsg && assistantMsg.usage) {
        tokens +=
          assistantMsg.usage.input_tokens + assistantMsg.usage.output_tokens;
      }
    }
  }

  return { toolCalls, tokens };
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export type LogItem =
  | { type: 'user'; content: string; id: string }
  | {
      type: 'tool';
      toolUse: ToolUsePart;
      toolResult?: ToolResultPart | ToolResultPart2;
      id: string;
    }
  | { type: 'text'; content: string; id: string };

export function groupMessages(messages: NormalizedMessage[]): LogItem[] {
  const items: LogItem[] = [];
  const toolUseMap = new Map<string, LogItem & { type: 'tool' }>();

  for (const [messageIndex, msg] of messages.entries()) {
    if (msg.role === 'user') {
      let content = '...';
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        const textPart = msg.content.find((p) => p.type === 'text');
        if (textPart && textPart.type === 'text') {
          content = textPart.text;
        }
      }

      items.push({
        type: 'user',
        content,
        id: msg.uuid || `user-${messageIndex}`,
      });
    } else if (msg.role === 'assistant') {
      const content = msg.content;
      if (typeof content === 'string') {
        items.push({
          type: 'text',
          content,
          id: msg.uuid || `text-${messageIndex}`,
        });
      } else if (Array.isArray(content)) {
        for (const [partIndex, part] of content.entries()) {
          if (part.type === 'text') {
            const id = msg.uuid
              ? `${msg.uuid}-text-${partIndex}`
              : `text-${messageIndex}-${partIndex}`;
            items.push({
              type: 'text',
              content: part.text,
              id,
            });
          } else if (part.type === 'tool_use') {
            const item: LogItem & { type: 'tool' } = {
              type: 'tool',
              toolUse: part,
              id: part.id,
            };
            items.push(item);
            toolUseMap.set(part.id, item);
          }
        }
      }
    } else if (msg.role === 'tool') {
      const content = msg.content as (ToolResultPart | ToolResultPart2)[];
      if (Array.isArray(content)) {
        for (const part of content) {
          let toolId: string | undefined;
          if (part.type === 'tool_result') {
            toolId = part.id;
          } else if (part.type === 'tool-result') {
            toolId = part.toolCallId;
          }

          if (toolId) {
            const toolUseItem = toolUseMap.get(toolId);
            if (toolUseItem) {
              toolUseItem.toolResult = part;
            }
          }
        }
      }
    }
  }

  return items;
}

export function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  if (count > 1000000) {
    return `${(count / 1000000).toFixed(2)}M`;
  }
  return `${(count / 1000).toFixed(1)}k`;
}
