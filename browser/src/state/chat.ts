import { proxy } from 'valtio';
import type { ApprovalMode, InitializeResult } from '@/client';
import type {
  ApprovalCategory,
  ApprovalResult,
  CommandEntry,
  FilePart,
  ImagePart,
  LoopResult,
  Message,
  NodeBridgeResponse,
  ToolResultPart,
  ToolUse,
  UIAssistantMessage,
  UIMessage,
} from '@/types/chat';
import { isToolResultMessage } from '@/utils/message';
import { countTokens } from '@/utils/tokenCounter';
import { actions as clientActions, state as clientState } from './client';

export type AppStatus =
  | 'idle'
  | 'processing'
  | 'planning'
  | 'plan_approving'
  | 'tool_approving'
  | 'tool_executing'
  | 'compacting'
  | 'failed'
  | 'cancelled'
  | 'slash_command_executing'
  | 'help'
  | 'exit';

function isExecuting(status: AppStatus) {
  return (
    status === 'processing' ||
    status === 'planning' ||
    status === 'tool_executing' ||
    status === 'compacting'
  );
}

interface ChatState {
  cwd: string | null;
  sessionId: string | null;
  version: string | null;
  productName: string | null;
  model: string | null;
  approvalMode: ApprovalMode;
  planMode: boolean;
  status: AppStatus;
  messages: UIMessage[];
  loading: boolean;
  approvalModal: {
    toolUse: ToolUse;
    category: ApprovalCategory;
    resolve: (result: ApprovalResult) => Promise<void>;
  } | null;
  error: string | null;

  processingTokens: number;
}

interface ChatActions {
  initialize(opts: { cwd: string; sessionId?: string }): void;
  send(message: string): void;
  addMessage(message: UIMessage): void;
  destroy(): void;
  sendMessage(opts: {
    message: string;
    planMode?: boolean;
    model?: string;
  }): Promise<LoopResult>;
  getSlashCommands(): Promise<CommandEntry[]>;
  cancel(): Promise<void>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const state = proxy<ChatState>({
  cwd: null,
  sessionId: null,
  version: null,
  productName: null,
  model: null,
  approvalMode: 'default',
  planMode: false,
  status: 'idle',
  messages: [],
  loading: false,
  approvalModal: null,
  error: null,
  processingTokens: 0,
});

export const actions: ChatActions = {
  async initialize(opts) {
    if (clientState.state === 'connecting') {
      console.log('connecting');
      return;
    }
    await clientActions.connect();
    await sleep(100);
    const response = (await clientActions.request('initialize', {
      cwd: opts.cwd,
      sessionId: opts.sessionId,
    })) as InitializeResult;

    if (!response.success) {
      throw new Error(response.error?.message || 'Initialize failed');
    }

    state.cwd = opts.cwd;
    state.sessionId = opts.sessionId || null;
    state.productName = response.data.productName;
    state.version = response.data.version;
    state.model = response.data.model;
    state.approvalMode = response.data.approvalMode;
    state.planMode = false;
    state.status = 'idle';

    const handleMessage = (data: { message: Message }) => {
      // 处理 tool_result 和 tool_use
      const { message } = data;
      console.log('handleMessage', message);
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
        state.messages.push(uiMessage);
        return;
      }
      if (isToolResultMessage(message)) {
        const lastMessage = state.messages[
          state.messages.length - 1
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
            throw new Error(
              'Tool result message must be after tool use message',
            );
          }
          const uiMessage = {
            ...lastMessage,
            content: lastMessage.content.map((part) => {
              if (part.type === 'tool') {
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
          state.messages[state.messages.length - 1] = uiMessage;
          return;
        } else {
          throw new Error('Tool result message must be after tool use message');
        }
      }
      state.messages.push(message as UIMessage);
    };

    const handleChunk = (data: any) => {
      if (data.sessionId === state.sessionId && data.cwd === state.cwd) {
        const chunk = data.chunk;

        // Collect tokens from text-delta and reasoning events
        if (
          chunk.type === 'raw_model_stream_event' &&
          chunk.data?.type === 'model' &&
          (chunk.data.event?.type === 'text-delta' ||
            chunk.data.event?.type === 'reasoning')
        ) {
          const textDelta = chunk.data.event.textDelta || '';
          const tokenCount = countTokens(textDelta);
          state.processingTokens += tokenCount;
        }
      }
    };

    clientActions.onEvent('message', handleMessage);
    clientActions.onEvent('chunk', handleChunk);

    clientActions.toolApproval(async (toolUse, category) => {
      return new Promise<{ approved: boolean }>((resolve) => {
        console.log('toolApproval', toolUse, category);
        state.approvalModal = {
          toolUse,
          category,
          resolve: async (result: ApprovalResult) => {
            state.approvalModal = null;
            const isApproved = result !== 'deny';
            console.log('result', state.cwd, state.sessionId);
            if (result === 'approve_always_edit') {
              await clientActions.request('sessionConfig.setApprovalMode', {
                cwd: state.cwd,
                sessionId: state.sessionId,
                approvalMode: 'autoEdit',
              });
            } else if (result === 'approve_always_tool') {
              await clientActions.request('sessionConfig.addApprovalTools', {
                cwd: state.cwd,
                sessionId: state.sessionId,
                approvalTool: toolUse.name,
              });
            }
            resolve({ approved: isApproved });
          },
        };
      });
    });

    return () => {
      console.log('destroy');
      clientActions.removeEventHandler('message', handleMessage);
      clientActions.removeEventHandler('chunk', handleChunk);
    };
  },

  async send(message) {
    const { cwd, sessionId } = state;

    clientActions.request('telemetry', {
      cwd,
      name: 'send',
      payload: { message, sessionId },
    });

    await actions.sendMessage({ message });
  },

  async sendMessage(opts: {
    message: string;
    planMode?: boolean;
    model?: string;
  }) {
    state.status = 'processing';
    state.processingTokens = 0;
    state.loading = true;
    const { cwd, sessionId } = state;
    let attachments: Array<FilePart | ImagePart> = [];

    const response = (await clientActions.request('send', {
      message: opts.message,
      planMode: opts.planMode,
      model: opts.model,
      cwd,
      sessionId,
      attachments,
    })) as LoopResult;

    console.log('response', response);

    if (response.success) {
      state.status = 'idle';
      state.processingTokens = 0;
    } else {
      state.status = 'failed';
      state.processingTokens = 0;
      state.error = response.error?.message;
    }

    state.loading = false;
    return response;
  },

  addMessage(message) {
    state.messages.push(message);
  },

  async getSlashCommands() {
    const response = (await clientActions.request('getSlashCommands', {
      cwd: state.cwd,
    })) as NodeBridgeResponse<{ slashCommands: CommandEntry[] }>;
    return response.data.slashCommands;
  },

  async cancel() {
    if (!isExecuting(state.status)) {
      return;
    }
    const { cwd, sessionId } = state;
    await clientActions.request('cancel', {
      cwd,
      sessionId,
    });
    state.status = 'idle';
    state.processingTokens = 0;
  },

  destroy() {
    state.messages = [];
    state.cwd = null;
    state.sessionId = null;
    state.productName = null;
    state.version = null;
    clientActions.unmount();
  },
};
