import type { Delta } from 'quill';
import { proxy } from 'valtio';
import type { ApprovalMode, InitializeResult } from '@/client';
import { BLOT_NAME_CONTENT_REGEX, SLASH_COMMAND_REGEX } from '@/constants';
import type {
  ApprovalCategory,
  ApprovalResult,
  CommandEntry,
  FileItem,
  FilePart,
  ImagePart,
  LoopResult,
  Message,
  NodeBridgeResponse,
  ToolMessage2,
  ToolUse,
  UIAssistantMessage,
  UIDisplayMessage,
  UIMessage,
  UserMessage,
} from '@/types/chat';
import {
  formatMessages,
  toolResultPart2ToToolResultPart,
} from '@/utils/message';
import { getPrompt } from '@/utils/quill';
import { parseSlashCommand } from '@/utils/slashCommand';
import { countTokens } from '@/utils/tokenCounter';
import { actions as clientActions } from './client';

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
  initialized: boolean;
}

interface ChatActions {
  initialize(opts: {
    cwd: string;
    sessionId: string;
    messages: Message[];
  }): Promise<() => void>;
  send(message: string, delta?: Delta): void;
  addMessage(message: UIMessage | UIMessage[]): void;
  destroy(): void;
  sendMessage(opts: {
    message: string | null;
    planMode?: boolean;
    model?: string;
  }): Promise<LoopResult | { success: false; error: Error }>;
  getSlashCommands(): Promise<CommandEntry[]>;
  getFiles(opts: { query?: string }): Promise<FileItem[]>;
  cancel(): Promise<void>;
  setSummary(opts: {
    userPrompt: string;
    result: LoopResult | { success: false; error: Error };
  }): Promise<void>;
}

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
  initialized: false,
});

export const actions: ChatActions = {
  async initialize(opts) {
    await clientActions.connect();
    const response = (await clientActions.request('session.initialize', {
      cwd: opts.cwd,
      sessionId: opts.sessionId,
      messages: opts.messages,
    })) as InitializeResult;
    state.initialized = true;

    if (!response.success) {
      throw new Error(response.error?.message || 'Initialize failed');
    }

    state.cwd = opts.cwd;
    state.sessionId = opts.sessionId || null;
    state.messages = formatMessages(opts.messages);
    state.productName = response.data.productName;
    state.version = response.data.version;
    state.model = response.data.model;
    state.approvalMode = response.data.approvalMode;
    state.planMode = false;
    state.status = 'idle';
    state.approvalModal = null;
    state.error = null;
    state.processingTokens = 0;
    state.loading = false;

    const handleMessage = (data: { message: Message }) => {
      const { message } = data;
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

      // Handle new format ToolMessage2 (role: 'tool')
      if (message.role === 'tool') {
        const lastMessage = state.messages[
          state.messages.length - 1
        ] as UIAssistantMessage;

        if (!lastMessage || lastMessage.role !== 'assistant') {
          throw new Error('Tool message must be after assistant message');
        }

        // Iterate over all tool results, update the corresponding tool_use
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

          state.messages[state.messages.length - 1] = uiMessage;
        });
        return;
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
        state.approvalModal = {
          toolUse,
          category,
          resolve: async (result: ApprovalResult) => {
            state.approvalModal = null;
            const isApproved = result !== 'deny';
            if (result === 'approve_always_edit') {
              await clientActions.request('session.config.setApprovalMode', {
                cwd: state.cwd,
                sessionId: state.sessionId,
                approvalMode: 'autoEdit',
              });
            } else if (result === 'approve_always_tool') {
              await clientActions.request('session.config.addApprovalTools', {
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
      clientActions.removeEventHandler('message', handleMessage);
      clientActions.removeEventHandler('chunk', handleChunk);
    };
  },

  async send(message, delta: Delta) {
    const { cwd, sessionId } = state;

    const isDelta = BLOT_NAME_CONTENT_REGEX.test(message);

    clientActions.request('utils.telemetry', {
      cwd,
      name: 'send',
      payload: { message, sessionId },
    });

    if (!isDelta) {
      const result = await this.sendMessage({ message });
      await this.setSummary({ userPrompt: message, result });
      return;
    }

    const isCommand = SLASH_COMMAND_REGEX.test(message);
    const prompt = getPrompt(delta);

    if (!isCommand) {
      await clientActions.request('session.addMessages', {
        cwd,
        sessionId,
        messages: [
          {
            role: 'user',
            content: prompt,
            uiContent: message,
          },
        ],
      });
      const result = await this.sendMessage({ message: null });
      await this.setSummary({ userPrompt: message, result });
      return;
    }

    if (isCommand) {
      const parsed = parseSlashCommand(prompt);
      const result = (await clientActions.request('slashCommand.get', {
        cwd,
        command: parsed.command,
      })) as NodeBridgeResponse<{ commandEntry: CommandEntry }>;
      const commandeEntry = result.data?.commandEntry;

      if (!commandeEntry) {
        this.addMessage({
          role: 'ui_display',
          content: {
            type: 'error',
            text: `Unknown slash command: ${parsed.command}`,
          },
        });
        return;
      }

      const command = commandeEntry.command;
      const type = command.type;
      const isPrompt = type === 'prompt';
      const userMessage: UserMessage = {
        role: 'user',
        content: prompt,
        uiContent: message,
      };

      if (isPrompt) {
        await clientActions.request('session.addMessages', {
          cwd,
          sessionId,
          messages: [userMessage],
        });
      } else {
        this.addMessage(userMessage);
      }

      const executeResult = (await clientActions.request(
        'slashCommand.execute',
        {
          cwd,
          sessionId,
          command: parsed.command,
          args: parsed.args,
        },
      )) as NodeBridgeResponse<{ messages: UIMessage[] }>;
      const isLocal = type === 'local';

      if (executeResult.success) {
        const messages = executeResult.data.messages;
        if (isPrompt) {
          await clientActions.request('session.addMessages', {
            cwd,
            sessionId,
            messages: messages,
          });
          await this.sendMessage({ message: null });
        } else if (isLocal) {
          const parsedMessages = messages.map((message) => {
            if (message.role === 'user') {
              const contentArray = Array.isArray(message.content)
                ? message.content
                : [];
              const text =
                typeof message.content === 'string'
                  ? message.content
                  : contentArray
                      .map((part) =>
                        part.type === 'text' ? part.text : String(part),
                      )
                      .join('\n');
              return {
                role: 'ui_display',
                content: {
                  type: 'info',
                  text,
                },
              } as UIDisplayMessage;
            }
            return message;
          });

          this.addMessage(parsedMessages);
        }
      }
    }
  },

  async sendMessage(opts: {
    message: string | null;
    planMode?: boolean;
    model?: string;
  }) {
    try {
      state.status = 'processing';
      state.processingTokens = 0;
      state.loading = true;
      const { cwd, sessionId } = state;
      let attachments: Array<FilePart | ImagePart> = [];

      const response = (await clientActions.request('session.send', {
        message: opts.message,
        planMode: opts.planMode,
        model: opts.model,
        cwd,
        sessionId,
        attachments,
      })) as LoopResult;

      if (response.success) {
        state.status = 'idle';
        state.processingTokens = 0;
      } else {
        state.status = 'failed';
        state.processingTokens = 0;
        state.error = response.error?.message;
        this.addMessage({
          role: 'ui_display',
          content: { type: 'error', text: response.error?.message },
        });
      }

      state.loading = false;
      return response;
    } catch (error) {
      console.error('Send message error:', error);
      state.status = 'failed';
      state.processingTokens = 0;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      state.error = errorMessage;
      this.addMessage({
        role: 'ui_display',
        content: { type: 'error', text: errorMessage },
      });
      return {
        success: false,
        error: error as Error,
      };
    }
  },

  addMessage(messages: UIMessage | UIMessage[]) {
    const msgs = Array.isArray(messages) ? messages : [messages];
    state.messages.push(...msgs);
  },

  async getSlashCommands() {
    const response = (await clientActions.request('slashCommand.list', {
      cwd: state.cwd,
    })) as NodeBridgeResponse<{ slashCommands: CommandEntry[] }>;
    return response.data.slashCommands;
  },

  async cancel() {
    if (!isExecuting(state.status)) {
      return;
    }
    const { cwd, sessionId } = state;
    await clientActions.request('session.cancel', {
      cwd,
      sessionId,
    });
    state.status = 'idle';
    state.processingTokens = 0;
  },

  async getFiles(opts: { query?: string }) {
    if (!state.cwd) {
      throw new Error(
        'Current working directory (cwd) is not set. Please select or initialize a working directory first.',
      );
    }
    const response = (await clientActions.request('utils.files.list', {
      cwd: state.cwd,
      query: opts.query,
    })) as NodeBridgeResponse<{ files: FileItem[] }>;
    return response.data.files;
  },

  async setSummary(opts: { userPrompt: string; result: LoopResult }) {
    try {
      const { cwd, sessionId } = state;
      if (opts.result.success) {
        const queryResult = (await clientActions.request('utils.query', {
          cwd,
          systemPrompt:
            "Analyze if this message indicates a new conversation topic. If it does, extract a 2-3 word title that captures the new topic. Format your response as a JSON object with one fields: 'title' (string). Only include these fields, no other text.",
          userPrompt: opts.userPrompt,
        })) as NodeBridgeResponse<{ text: string }>;
        if (queryResult.success && queryResult.data?.text) {
          const response = JSON.parse(queryResult.data.text);
          if (response?.title) {
            document.title = response.title;
          }
          await clientActions.request('session.config.setSummary', {
            cwd,
            sessionId,
            summary: response.title,
          });
        }
      }
    } catch (error) {
      console.error('Set summary error:', error);
    }
  },

  destroy() {
    if (state.approvalModal) {
      // TODO: Optimization needed. We can't wait for approvalModal's resolve to complete here,
      // so we need to manually handle tool message denial.
      state.approvalModal.resolve('deny');
      state.approvalModal = null;
    }
    state.messages = [];
    state.cwd = null;
    state.sessionId = null;
    state.productName = null;
    state.version = null;
    state.model = null;
    state.approvalMode = 'default';
    state.planMode = false;
    state.status = 'idle';
    state.approvalModal = null;
    state.error = null;
    state.processingTokens = 0;
    state.loading = false;
    state.initialized = false;
    clientActions.unmount();
  },
};
