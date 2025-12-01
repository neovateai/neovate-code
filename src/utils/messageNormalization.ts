import type {
  NormalizedMessage,
  ReasoningPart,
  TextPart,
  ToolResultPart2,
} from '../message';

function formatToolResultContent(llmContent: unknown): string {
  if (typeof llmContent === 'string') {
    const truncatedText =
      llmContent.length > 200
        ? `${llmContent.substring(0, 200)}...`
        : llmContent;
    return `: ${truncatedText}`;
  }
  if (Array.isArray(llmContent)) {
    const textParts = llmContent
      .filter((part): part is TextPart => part.type === 'text')
      .map((part) => part.text)
      .join(' ');
    const truncatedText =
      textParts.length > 200 ? `${textParts.substring(0, 200)}...` : textParts;
    if (truncatedText) {
      return `: ${truncatedText}`;
    }
  }
  return '';
}

/**
 * Normalizes messages for compacting by filtering out tool-related content
 * while preserving the conversational flow and essential information.
 *
 * This function transforms tool calls and results into human-readable summaries
 * to make the conversation history suitable for compression without losing
 * important context about what operations were performed.
 *
 * For assistant messages:
 * - Removes tool_use parts
 * - Keeps text and reasoning parts
 * - If no text content exists, converts reasoning to text for readability
 * - If no content remains, uses a default placeholder
 *
 * For tool messages:
 * - Converts to user messages with tool execution summaries
 *
 * @param messages - Array of normalized messages to process
 * @returns Array of normalized messages with tool content converted to summaries
 */
export function normalizeMessagesForCompact(
  messages: NormalizedMessage[],
): NormalizedMessage[] {
  return messages
    .map((message) => {
      if (message.role === 'assistant') {
        if (Array.isArray(message.content)) {
          const filteredContent = message.content.filter(
            (part): part is TextPart | ReasoningPart =>
              part.type === 'text' || part.type === 'reasoning',
          );

          if (filteredContent.length === 0) {
            return {
              ...message,
              content: [
                {
                  type: 'text' as const,
                  text: '[Assistant performed tool operations]',
                },
              ],
            };
          }

          // If there's no text content, convert reasoning to text for readability
          const hasTextPart = filteredContent.some(
            (part) => part.type === 'text',
          );
          if (!hasTextPart) {
            const reasoningTexts = filteredContent
              .filter(
                (part): part is ReasoningPart => part.type === 'reasoning',
              )
              .map((part) => part.text)
              .filter((text) => text.trim().length > 0);

            if (reasoningTexts.length > 0) {
              return {
                ...message,
                content: [
                  {
                    type: 'text' as const,
                    text: reasoningTexts.join('\n'),
                  },
                ],
              };
            }

            // If even reasoning is empty, use default text
            return {
              ...message,
              content: [
                {
                  type: 'text' as const,
                  text: '[Assistant performed tool operations]',
                },
              ],
            };
          }

          return {
            ...message,
            content: filteredContent,
          };
        }
        return message;
      }

      if (message.role === 'tool') {
        if (Array.isArray(message.content)) {
          const toolSummaries = message.content.map((part: ToolResultPart2) => {
            if (part.type === 'tool-result') {
              const result = part.result;
              let summary = `Tool ${part.toolName} executed`;

              if (
                result &&
                typeof result === 'object' &&
                'llmContent' in result
              ) {
                const contentSuffix = formatToolResultContent(
                  result.llmContent,
                );
                summary += contentSuffix || ' successfully';
              } else {
                summary += ' successfully';
              }

              return summary;
            }
            return 'Tool operation completed';
          });

          return {
            ...message,
            role: 'user' as const,
            content: `[Tool Results Summary: ${toolSummaries.join('; ')}]`,
          };
        }

        return {
          ...message,
          role: 'user' as const,
          content: '[Tool operations completed]',
        };
      }

      return message;
    })
    .filter((message) => {
      if (typeof message.content === 'string') {
        return message.content.trim().length > 0;
      }
      if (Array.isArray(message.content)) {
        return message.content.length > 0;
      }
      return true;
    });
}
