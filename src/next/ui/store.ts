import type { ReactNode } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { CANCELED_MESSAGE_TEXT } from '../../constants';
import { randomUUID } from '../../utils/randomUUID';
import type { Message } from '../history';
import type { LoopResult } from '../loop';
import {
  type CommandEntry,
  isSlashCommand,
  parseSlashCommand,
} from '../slashCommand';
import type { UIBridge } from '../uiBridge';

type QueuedMessage = {
  id: string;
  content: string;
  timestamp: number;
};

type Theme = 'light' | 'dark';
type AppStatus =
  | 'idle'
  | 'processing'
  | 'planning'
  | 'plan_approving'
  // | 'plan_approved'
  | 'tool_approving'
  // | 'tool_approved'
  | 'tool_executing'
  | 'compacting'
  | 'failed'
  | 'cancelled'
  | 'slash_command_executing'
  | 'help';

const APP_STATUS_MESSAGES = {
  processing: 'Processing...',
  planning: 'Planning...',
  plan_approving: 'Waiting for plan approval...',
  tool_approving: 'Waiting for tool approval...',
  tool_executing: 'Executing tool...',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function isExecuting(status: AppStatus) {
  return (
    status === 'processing' ||
    status === 'planning' ||
    status === 'tool_executing' ||
    status === 'compacting'
  );
}

interface AppState {
  bridge: UIBridge;

  cwd: string;
  productName: string;
  version: string;
  theme: Theme;
  model: string;
  sessionId: string | null;
  initialPrompt: string | null;
  logFile: string;

  status: AppStatus;
  error: string | null;
  slashCommandJSX: ReactNode | null;

  messages: Message[];
  currentMessage: Message | null;
  queuedMessages: QueuedMessage[];

  draftInput: string;
  history: string[];
  historyIndex: number | null;

  logs: string[];
  exitMessage: string | null;
}

type InitializeOpts = {
  bridge: UIBridge;
  cwd: string;
  initialPrompt: string;
  sessionId: string | undefined;
  messages: Message[];
  history: string[];
  logFile: string;
};

interface AppActions {
  initialize: (opts: InitializeOpts) => Promise<void>;
  send: (message: string) => Promise<void>;
  addMessage: (message: Message) => void;
  log: (log: string) => void;
  setExitMessage: (exitMessage: string | null) => void;
  cancel: () => Promise<void>;
  clear: () => Promise<void>;
  setDraftInput: (draftInput: string) => void;
  setHistoryIndex: (historyIndex: number | null) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // State
      bridge: null,
      cwd: null,
      productName: null,
      version: null,
      initialPrompt: null,
      logFile: null,
      theme: 'light',
      model: null,
      status: 'idle',
      error: null,
      slashCommandJSX: null,
      messages: [],
      currentMessage: null,
      queuedMessages: [],
      draftInput: '',
      history: [],
      historyIndex: null,
      sessionId: null,
      logs: [],

      // Actions
      initialize: async (opts) => {
        const { bridge } = opts;
        const response = await bridge.request('initialize', {
          cwd: opts.cwd,
        });
        if (!response.success) {
          throw new Error(response.error.message);
        }
        set({
          bridge,
          cwd: opts.cwd,
          productName: response.data.productName,
          version: response.data.version,
          model: response.data.model,
          sessionId: opts.sessionId,
          messages: opts.messages,
          history: opts.history,
          initialPrompt: opts.initialPrompt,
          logFile: opts.logFile,
          // theme: 'light',
        });
        bridge.onEvent('message', (data) => {
          const message = data.message as Message;
          get().addMessage(message);
        });
        setImmediate(async () => {
          if (opts.initialPrompt) {
            await get().send(opts.initialPrompt);
          }
        });
      },

      // TODO: support queued messages
      send: async (message) => {
        const { bridge, cwd, sessionId } = get();

        set({
          history: [...get().history, message],
          historyIndex: null,
        });

        // slash command
        if (isSlashCommand(message)) {
          const parsed = parseSlashCommand(message);
          const result = await bridge.request('getSlashCommand', {
            cwd,
            command: parsed.command,
          });
          const commandeEntry = result.data?.commandEntry as CommandEntry;
          if (commandeEntry) {
            const userMessage: Message = {
              role: 'user',
              content: message,
            };
            await bridge.request('addMessages', {
              cwd,
              sessionId,
              messages: [userMessage],
            });
            const command = commandeEntry.command;
            const type = command.type;
            const isLocal = type === 'local';
            const isLocalJSX = type === 'local-jsx';
            const isPrompt = type === 'prompt';
            // TODO: save local type command's messages to history
            if (isLocal || isPrompt) {
              const result = await bridge.request('executeSlashCommand', {
                cwd,
                sessionId,
                command: parsed.command,
                args: parsed.args,
              });
              if (result.success) {
                const messages = result.data.messages;
                await bridge.request('addMessages', {
                  cwd,
                  sessionId,
                  messages,
                });
              }
              if (isPrompt) {
                await sendMessage(null);
              }
            } else if (isLocalJSX) {
              const jsx = await command.call(async (result: string) => {
                set({
                  slashCommandJSX: null,
                });
                await bridge.request('addMessages', {
                  cwd,
                  sessionId,
                  messages: [
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'text',
                          text: result,
                        },
                      ],
                      history: null,
                    },
                  ],
                });
              }, {} as any);
              set({
                slashCommandJSX: jsx,
              });
            } else {
              throw new Error(
                `Unknown slash command type: ${commandeEntry.command.type}`,
              );
            }
            // set({ status: 'slash_command_executing' });
          } else {
            // TODO: handle unknown slash command
          }
          return;
        } else {
          await sendMessage(message);
        }

        async function sendMessage(message: string | null) {
          set({
            status: 'processing',
          });
          const response: LoopResult = await bridge.request('send', {
            message,
            cwd,
            sessionId,
          });
          if (response.success) {
            set({ status: 'idle' });
          } else {
            set({ status: 'failed', error: response.error.message });
          }
        }
      },

      cancel: async () => {
        const { bridge, cwd, sessionId, status } = get();
        if (!isExecuting(status)) {
          return;
        }
        await bridge.request('cancel', {
          cwd,
          sessionId,
        });
        set({ status: 'idle' });
      },

      clear: async () => {
        const sessionId = randomUUID();
        set({
          messages: [],
          history: [],
          historyIndex: null,
          sessionId,
        });
        return {
          sessionId,
        };
      },

      addMessage: (message) => {
        set({ messages: [...get().messages, message] });
      },

      log: (log: string) => {
        set({
          logs: [...get().logs, `[${new Date().toISOString()}] ${log}`],
        });
      },

      setExitMessage: (exitMessage: string | null) => {
        set({ exitMessage });
      },

      setDraftInput: (draftInput: string) => {
        set({ draftInput });
      },

      setHistoryIndex: (historyIndex: number | null) => {
        set({ historyIndex });
      },
    }),
    { name: 'app-store' },
  ),
);
