import {
  type AgentInputItem,
  type AssistantMessageItem,
  type ModelProvider,
  Runner,
  type UserMessageItem,
} from '@openai/agents';
import createDebug from 'debug';
import { last } from 'lodash-es';
import { createCompactAgent } from '../agents/compact';

const debug = createDebug('takumi:utils:compact');

export async function generateSummaryMessage(opts: {
  history: AgentInputItem[];
  model: string;
  language?: string;
  modelProvider: ModelProvider;
}) {
  const messages = normalizeMessagesForAPI(opts.history).concat([
    {
      role: 'user',
      content: `Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we're doing, which files we're working on, and what we're going to do next.`,
    },
  ]);

  const agent = createCompactAgent({
    model: opts.model,
    language: opts.language ?? 'English',
  });
  const runner = new Runner({
    modelProvider: opts.modelProvider,
  });
  debug('running compact agent', messages);
  const result = await runner.run(agent, messages);
  const summary = result.finalOutput;
  if (typeof summary !== 'string') {
    throw new Error('Summary is not a string');
  }
  const usage = result.state.toJSON().lastModelResponse?.usage;
  return { summary, usage };
}

export function normalizeMessagesForAPI(messages: AgentInputItem[]) {
  const result: (AssistantMessageItem | UserMessageItem)[] = [];
  for (const message of messages) {
    if ('role' in message) {
      switch (message.role) {
        case 'user': {
          // If the current message is not a tool result, add it to the result
          if (
            'content' in message &&
            typeof message.content === 'string' &&
            !message.content.includes('<function_results>')
          ) {
            result.push(message);
            break;
          }

          // If the last message is not a tool result, add the current message to the result
          const lastMessage = last(result);
          if (
            !lastMessage ||
            lastMessage.role === 'assistant' ||
            typeof lastMessage.content !== 'string' ||
            !lastMessage.content.includes('<function_results>')
          ) {
            result.push(message);
            break;
          }

          if (typeof message.content !== 'string') {
            result.push(message);
            break;
          }

          // Merge the current message with the last message
          const lastIndex = result.length - 1;
          result[lastIndex] = {
            ...lastMessage,
            content: `${lastMessage.content}\n${message.content}`,
          };
          break;
        }
        case 'assistant':
          result.push(message);
          break;
      }
    }
  }
  return result;
}
