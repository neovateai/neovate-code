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
  const store: any = proxy<Store>({
    stage: opts.stage,
    planModal: null,
    productName: opts.context.productName,
    version: opts.context.version,
    generalInfo: opts.context.generalInfo,
    status: 'idle',
    error: null,
    messages: [],
    currentMessage: null,
    history: opts.context.history,
    historyIndex: null,
    draftInput: null,
    approval: {
      pending: false,
      callId: null,
      toolName: null,
      params: null,
      resolve: null,
    },
    approvalMemory: {
      proceedOnce: new Set(),
      proceedAlways: new Set(),
      proceedAlwaysTool: new Set(),
    },
    actions: {
      addHistory: (input: string) => {
        opts.context.addHistory(input);
        store.history.push(input);
      },
      chatInputUp: (input: string) => {
        if (store.history.length === 0) {
          return input;
        }
        if (store.historyIndex === null) {
          store.draftInput = input;
          store.historyIndex = store.history.length - 1;
        } else if (store.historyIndex > 0) {
          store.historyIndex--;
        }
        return store.history[store.historyIndex];
      },
      chatInputDown: (input: string) => {
        if (store.historyIndex === null) {
          return input;
        }
        if (store.historyIndex === store.history.length - 1) {
          store.historyIndex = null;
          return store.draftInput || '';
        }
        store.historyIndex++;
        return store.history[store.historyIndex];
      },
      chatInputChange: (input: string) => {
        store.historyIndex = null;
      },
      approveToolUse: (approved: boolean) => {
        if (store.approval.resolve) {
          store.approval.resolve(approved);
          store.approval.pending = false;
          store.approval.callId = null;
          store.approval.toolName = null;
          store.approval.params = null;
          store.approval.resolve = null;
          store.status = 'processing';
        }
      },
      clearApprovalMemory: () => {
        store.approvalMemory.proceedOnce.clear();
        store.approvalMemory.proceedAlways.clear();
        store.approvalMemory.proceedAlwaysTool.clear();
      },
      query: async (input: string): Promise<any> => {
        await delay(100);
        store.historyIndex = null;
        opts.context.addHistory(input);
        const service =
          store.stage === 'plan' ? opts.planService : opts.service;
        let textDelta = '';
        let reasoningDelta = '';
        store.status = 'processing';
        store.error = null;
        store.messages.push({
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
              if (reasoningDelta && store.currentMessage) {
                reasoningDelta = '';
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
              appendLogToFile(`onText: ${text}`);
              await delay(100);
              store.currentMessage = null;
              textDelta = '';
              store.messages.push({
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
              store.currentMessage = {
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
              appendLogToFile(
                `onToolUseResult: ${callId} ${name} ${JSON.stringify(result)}`,
              );
              debug(
                `Tool use result: ${name} with result ${JSON.stringify(result)}`,
              );
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
            async onToolApprove(callId, name, params) {
              appendLogToFile(
                `onToolApprove: ${callId} ${name} ${JSON.stringify(params)}`,
              );

              // Check approval memory first
              const toolKey = `${name}:${JSON.stringify(params)}`;
              const toolOnlyKey = name;

              if (
                store.approvalMemory.proceedAlways.has(toolKey) ||
                store.approvalMemory.proceedAlwaysTool.has(toolOnlyKey)
              ) {
                return true;
              }

              if (store.approvalMemory.proceedOnce.has(toolKey)) {
                store.approvalMemory.proceedOnce.delete(toolKey);
                return true;
              }

              // Show approval prompt
              store.status = 'awaiting_user_input';
              store.approval.pending = true;
              store.approval.callId = callId;
              store.approval.toolName = name;
              store.approval.params = params;

              return new Promise<boolean>((resolve) => {
                store.approval.resolve = resolve;
              });
            },
          });
          store.status = 'completed';
          if (store.stage === 'plan') {
            store.planModal = { text: result.finalText || '' };
          }
          return result;
        } catch (e: any) {
          store.status = 'failed';
          store.error = e.message || String(e);
          store.currentMessage = null;
          throw e;
        }
      },
    },
  });
  return store;
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
  history: string[];
  historyIndex: number | null;
  draftInput: string | null;
  approval: {
    pending: boolean;
    callId: string | null;
    toolName: string | null;
    params: Record<string, any> | null;
    resolve: ((approved: boolean) => void) | null;
  };
  approvalMemory: {
    proceedOnce: Set<string>;
    proceedAlways: Set<string>;
    proceedAlwaysTool: Set<string>;
  };
  actions: {
    addHistory: (input: string) => void;
    chatInputUp: (input: string) => string;
    chatInputDown: (input: string) => string;
    chatInputChange: (input: string) => void;
    query: (input: string) => Promise<any>;
    approveToolUse: (approved: boolean) => void;
    clearApprovalMemory: () => void;
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
