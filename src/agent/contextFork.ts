import type { NormalizedMessage } from '../message';
import { randomUUID } from '../utils/randomUUID';

export function prepareForkMessages(
  parentMessages: NormalizedMessage[],
  taskPrompt: string,
  availableToolNames: string[],
): NormalizedMessage[] {
  const normalizedMessages = normalizeMessagesForSubAgent(
    parentMessages,
    availableToolNames,
  );

  const contextSeparator: NormalizedMessage = {
    role: 'user',
    content: buildContextSeparatorMessage(availableToolNames),
    type: 'message',
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    parentUuid: null,
  };

  const taskMessage: NormalizedMessage = {
    role: 'user',
    content: taskPrompt,
    type: 'message',
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
    parentUuid: null,
  };

  return [...normalizedMessages, contextSeparator, taskMessage];
}

function normalizeMessagesForSubAgent(
  messages: NormalizedMessage[],
  availableToolNames: string[],
): NormalizedMessage[] {
  const availableToolSet = new Set(availableToolNames);
  const keptToolUseIds = new Set<string>();

  return messages
    .map((message) => {
      if (message.role === 'assistant' && Array.isArray(message.content)) {
        const filteredContent = message.content.filter((part) => {
          if (part.type === 'text' || part.type === 'reasoning') {
            return true;
          }
          if (part.type === 'tool_use') {
            const isAvailable = availableToolSet.has(part.name);
            if (isAvailable) {
              keptToolUseIds.add(part.id);
            }
            return isAvailable;
          }
          return false;
        });

        if (filteredContent.length === 0) {
          return {
            ...message,
            content: [
              {
                type: 'text' as const,
                text: '[Parent agent performed operations]',
              },
            ],
          };
        }

        return { ...message, content: filteredContent };
      }

      if (message.role === 'tool' && Array.isArray(message.content)) {
        const filteredContent = message.content.filter((part) => {
          return keptToolUseIds.has(part.toolCallId);
        });
        return { ...message, content: filteredContent };
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

function buildContextSeparatorMessage(availableTools: string[]): string {
  return `### FORKING CONVERSATION CONTEXT ###
### ENTERING SUB-AGENT ROUTINE ###

IMPORTANT CONTEXT NOTES:
- The messages above are from the parent conversation thread, provided for context only
- You are now in a sub-agent context with LIMITED TOOLS
- Your available tools are: ${availableTools.join(', ')}
- Do NOT attempt to use tools from the parent context that are not in your tool list
- Parent tool operations have been summarized for your reference
- Focus solely on completing the specific task assigned to you below

---`;
}
