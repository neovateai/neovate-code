import {
  type AgentInputItem,
  type AssistantMessageItem,
  ModelProvider,
  Runner,
  type UserMessageItem,
} from '@openai/agents';
import createDebug from 'debug';
import { last } from 'lodash-es';
import React, { useEffect } from 'react';
import { createCompactAgent } from '../../agents/compact';
import { APP_STAGE } from '../../ui/constants';
import { useAppContext } from '../../ui/hooks';
import { LocalJSXCommand } from '../types';

const debug = createDebug('takumi:slash-commands:compact');

export const compactCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'compact',
  description: `Clear conversation history but keep a summary in context.`,
  async call(onDone) {
    return React.createElement(() => {
      const { services, state } = useAppContext();
      const isPlan = state.stage === APP_STAGE.PLAN;
      const service = isPlan ? services.planService : services.service;
      if (service.history.length === 0) {
        debug('skipping compacting, history length is 0');
        onDone('No messages to compact');
        return;
      }

      useEffect(() => {
        const run = async () => {
          try {
            const summary = await generateSummaryMessage({
              history: service.history,
              model: services.context.config.model,
              language: services.context.config.language,
              modelProvider: services.context.getModelProvider(),
            });
            service.history.length = 0;
            debug('compacted summary', summary);
            service.history.push({
              role: 'user',
              content: summary,
            });
            onDone('Chat history compressed successfully');
          } catch (error) {
            debug('error compacting', error);
            onDone(
              `Error compacting: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        };
        run();
      }, []);
      return null;
    });
  },
};

async function generateSummaryMessage(opts: {
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
    language: opts.language ?? 'english',
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
  return summary;
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
