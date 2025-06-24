import createDebug from 'debug';
import os from 'os';
import { proxy } from 'valtio';
import { isReasoningModel } from '../provider';
import { query } from '../query';
import { Service } from '../service';

const debug = createDebug('takumi:ui:store');

let store: Store | null = null;

export function getStore() {
  if (!store) {
    throw new Error('Store not initialized');
  }
  return store;
}

export interface CreateStoreOpts {
  productName: string;
  version: string;
  service: Service;
  planService: Service;
  stage: 'plan' | 'code';
  traceFile: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const homeDir = os.homedir();

export function createStore(opts: CreateStoreOpts) {
  if (store) {
    return store;
  }
  store = proxy<Store>({
    stage: opts.stage,
    planModal: null,
    generalInfo: {
      productName: opts.productName,
      version: opts.version,
      log: opts.traceFile.replace(homeDir, '~'),
      workspace: opts.service.context.cwd.replace(homeDir, '~'),
      model: opts.service.context.config.model,
    },
    status: 'idle',
    error: null,
    messages: [],
    currentMessage: null,
    actions: {
      addUserPrompt: (input: string) => {
        opts.service.context.addUserPrompt(input);
      },
      query: async (input: string): Promise<any> => {
        const service =
          store!.stage === 'plan' ? opts.planService : opts.service;
        let textDelta = '';
        let reasoningDelta = '';
        store!.status = 'processing';
        await delay(100);
        store!.messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: input,
          },
        });
        const result = await query({
          input: [
            {
              role: 'user',
              content: input,
            },
          ],
          service,
          thinking: isReasoningModel(service.context.config.model),
          onTextDelta(text) {
            store = store!;
            if (reasoningDelta && store.currentMessage) {
              store.messages.push(store.currentMessage);
              store.currentMessage = null;
            }
            textDelta += text;
            store.currentMessage = {
              role: 'assistant',
              content: {
                type: 'text',
                text: textDelta,
              },
            };
          },
          async onText(text) {
            await delay(100);
            store = store!;
            store.currentMessage = null;
            store.messages.push({
              role: 'assistant',
              content: {
                type: 'text',
                text,
              },
            });
            debug('onText', text);
          },
          onReasoning(text) {
            store = store!;
            reasoningDelta += text;
            store.currentMessage = {
              role: 'assistant',
              content: {
                type: 'thinking',
                text: reasoningDelta,
              },
            };
            debug('onReasoning', text);
          },
          onToolUse(callId, name, params) {
            store = store!;
            debug(`Tool use: ${name} with params ${JSON.stringify(params)}`);
            store.messages.push({
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
            debug(
              `Tool use result: ${name} with result ${JSON.stringify(result)}`,
            );
            store = store!;
            store.messages.push({
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
        store!.status = 'completed';
        if (store!.stage === 'plan') {
          store!.planModal = { text: result.finalText || '' };
        }
        return result;
      },
    },
  });
  return store;
}

export interface Store {
  generalInfo: {
    productName: string;
    version: string;
    model: string;
    workspace: string;
    log: string;
  };
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
