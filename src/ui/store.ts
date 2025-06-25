import createDebug from 'debug';
import fs from 'fs';
import { proxy } from 'valtio';
import { Context } from '../context';
import { isReasoningModel } from '../provider';
import { query } from '../query';
import { Service } from '../service';
import { delay } from '../utils/delay';

const debug = createDebug('takumi:ui:store');

export interface CreateStoreOpts {
  context: Context;
  service: Service;
  planService: Service;
  stage: 'plan' | 'code';
}

// for debugging
function appendLogToFile(log: string) {
  if (!process.env.TAKUMI_TRACE_FILE) {
    return;
  }
  const datetime = new Date().toLocaleString();
  fs.appendFileSync(process.env.TAKUMI_TRACE_FILE, `[${datetime}] ${log}\n`);
}

export function createStore(opts: CreateStoreOpts) {
  const createdStore = proxy<Store>({
    stage: opts.stage,
    planModal: null,
    productName: opts.context.productName,
    version: opts.context.version,
    generalInfo: opts.context.generalInfo,
    status: 'idle',
    error: null,
    messages: [],
    currentMessage: null,
    actions: {
      addUserPrompt: (input: string) => {
        opts.context.addUserPrompt(input);
      },
      query: async (input: string): Promise<any> => {
        await delay(100);
        const service =
          createdStore.stage === 'plan' ? opts.planService : opts.service;
        let textDelta = '';
        let reasoningDelta = '';
        createdStore.status = 'processing';
        createdStore.error = null;
        createdStore.messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: input,
          },
        });
        try {
          const result = await query({
            input: [
              {
                role: 'user',
                content: input,
              },
            ],
            service,
            thinking: isReasoningModel(service.context.config.model),
            async onTextDelta(text) {
              appendLogToFile(`onTextDelta: ${text}`);
              await delay(100);
              if (reasoningDelta && createdStore.currentMessage) {
                reasoningDelta = '';
                createdStore.messages.push(createdStore.currentMessage);
                createdStore.currentMessage = null;
              }
              textDelta += text;
              createdStore.currentMessage = {
                role: 'assistant',
                content: {
                  type: 'text',
                  text: textDelta,
                },
              };
            },
            async onText(text) {
              appendLogToFile(`onText: ${text}`);
              await delay(100);
              createdStore.currentMessage = null;
              textDelta = '';
              createdStore.messages.push({
                role: 'assistant',
                content: {
                  type: 'text',
                  text,
                },
              });
              debug('onText', text);
            },
            async onReasoning(text) {
              appendLogToFile(`onReasoning: ${text}`);
              await delay(100);
              reasoningDelta += text;
              createdStore.currentMessage = {
                role: 'assistant',
                content: {
                  type: 'thinking',
                  text: reasoningDelta,
                },
              };
              debug('onReasoning', text);
            },
            async onToolUse(callId, name, params) {
              appendLogToFile(
                `onToolUse: ${callId} ${name} ${JSON.stringify(params)}`,
              );
              await delay(100);
              debug(`Tool use: ${name} with params ${JSON.stringify(params)}`);
              createdStore.messages.push({
                role: 'assistant',
                content: {
                  type: 'tool-call',
                  toolCallId: callId,
                  toolName: name,
                  args: params,
                },
              });
            },
            onToolUseResult(callId, name, result) {
              appendLogToFile(
                `onToolUseResult: ${callId} ${name} ${JSON.stringify(result)}`,
              );
              debug(
                `Tool use result: ${name} with result ${JSON.stringify(result)}`,
              );
              createdStore.messages.push({
                role: 'tool',
                content: {
                  type: 'tool-result',
                  toolCallId: callId,
                  toolName: name,
                  result,
                },
              });
            },
          });
          createdStore.status = 'completed';
          if (createdStore.stage === 'plan') {
            createdStore.planModal = { text: result.finalText || '' };
          }
          return result;
        } catch (e: any) {
          createdStore.status = 'failed';
          createdStore.error = e.message || String(e);
          createdStore.currentMessage = null;
          throw e;
        }
      },
    },
  });
  return createdStore;
}

export interface Store {
  productName: string;
  version: string;
  generalInfo: Record<string, string>;
  stage: 'plan' | 'code';
  planModal: { text: string } | null;
  status:
    | 'idle'
    | 'processing'
    | 'awaiting_user_input'
    | 'completed'
    | 'failed'
    | 'cancelled';
  error: string | null;
  messages: Message[];
  currentMessage: Message | null;
  actions: {
    addUserPrompt: (input: string) => void;
    query: (input: string) => Promise<any>;
  };
}

type Text = {
  type: 'text';
  text: string;
};

type Thinking = {
  type: 'thinking';
  text: string;
};

type ToolCall = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
};

type ToolResult = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: any;
};

export type Message =
  | UserMessage
  | AssistantTextMessage
  | AssistantToolMessage
  | ToolMessage
  | ThinkingMessage
  | SystemMessage;

export type UserMessage = {
  role: 'user';
  content: Text;
};

export type AssistantTextMessage = {
  role: 'assistant';
  content: Text;
};

export type AssistantToolMessage = {
  role: 'assistant';
  content: ToolCall;
};

export type ToolMessage = {
  role: 'tool';
  content: ToolResult;
};

export type ThinkingMessage = {
  role: 'assistant';
  content: Thinking;
};

export type SystemMessage = {
  role: 'system';
  content: Text;
};
