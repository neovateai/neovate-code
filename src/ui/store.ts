import open from 'open';
import type { ReactNode } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ApprovalMode } from '../config';
import type { Message } from '../history';
import type { LoopResult, ToolUse } from '../loop';
import { SessionConfigManager, loadSessionMessages } from '../session';
import { Session } from '../session';
import {
  type CommandEntry,
  isSlashCommand,
  parseSlashCommand,
} from '../slashCommand';
import type { ApprovalCategory } from '../tool';
import type { UIBridge } from '../uiBridge';
import { Upgrade, type UpgradeOptions } from '../upgrade';
import { setTerminalTitle } from '../utils/setTerminalTitle';
import { clearTerminal } from '../utils/terminal';

export type ApprovalResult =
  | 'approve_once'
  | 'approve_always_edit'
  | 'approve_always_tool'
  | 'deny';

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
  | 'help'
  | 'exit';

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
  productASCIIArt: string;
  version: string;
  theme: Theme;
  model: string;
  modelContextLimit: number;
  sessionId: string | null;
  initialPrompt: string | null;
  logFile: string;

  status: AppStatus;
  error: string | null;
  slashCommandJSX: ReactNode | null;
  planMode: boolean;
  bashMode: boolean;
  approvalMode: ApprovalMode;

  planResult: string | null;
  processingStartTime: number | null;

  messages: Message[];
  currentMessage: Message | null;
  queuedMessages: string[];

  draftInput: string;
  history: string[];
  historyIndex: number | null;

  // Input state fields
  inputValue: string;
  inputCursorPosition: number | undefined;
  inputShowExitWarning: boolean;
  inputCtrlCPressed: boolean;
  inputError: string | null;

  logs: string[];
  exitMessage: string | null;
  debugMode: boolean;

  approvalModal: {
    toolUse: ToolUse;
    category?: ApprovalCategory;
    resolve: (result: ApprovalResult) => Promise<void>;
  } | null;

  upgrade: {
    text: string;
    type?: 'success' | 'error';
  } | null;
}

type InitializeOpts = {
  bridge: UIBridge;
  cwd: string;
  initialPrompt: string;
  sessionId: string | undefined;
  messages: Message[];
  history: string[];
  logFile: string;
  upgrade?: UpgradeOptions;
};

interface AppActions {
  initialize: (opts: InitializeOpts) => Promise<void>;
  send: (message: string) => Promise<void>;
  sendMessage: (opts: {
    message: string | null;
    planMode?: boolean;
  }) => Promise<LoopResult>;
  addMessage: (message: Message) => void;
  log: (log: string) => void;
  setExitMessage: (exitMessage: string | null) => void;
  cancel: () => Promise<void>;
  clear: () => Promise<void>;
  setDraftInput: (draftInput: string) => void;
  setHistoryIndex: (historyIndex: number | null) => void;
  togglePlanMode: () => void;
  approvePlan: (planResult: string) => void;
  denyPlan: () => void;
  resumeSession: (sessionId: string, logFile: string) => Promise<void>;
  setModel: (model: string) => void;
  approveToolUse: ({
    toolUse,
    category,
  }: {
    toolUse: ToolUse;
    category?: ApprovalCategory;
  }) => Promise<ApprovalResult>;
  addToQueue: (message: string) => void;
  clearQueue: () => void;
  processQueuedMessages: () => Promise<void>;
  toggleDebugMode: () => void;
  setStatus: (status: AppStatus) => void;

  // Input state actions
  setInputValue: (value: string) => void;
  setInputCursorPosition: (position: number | undefined) => void;
  setInputShowExitWarning: (show: boolean) => void;
  setInputCtrlCPressed: (pressed: boolean) => void;
  setInputError: (error: string | null) => void;
  resetInput: () => void;
}

export type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      // State
      bridge: null,
      cwd: null,
      productName: null,
      productASCIIArt: null,
      version: null,
      initialPrompt: null,
      logFile: null,
      theme: 'light',
      model: null,
      modelContextLimit: null,
      status: 'idle',
      error: null,
      slashCommandJSX: null,
      planMode: false,
      bashMode: false,
      approvalMode: 'default',
      messages: [],
      currentMessage: null,
      queuedMessages: [],
      draftInput: '',
      history: [],
      historyIndex: null,
      sessionId: null,
      logs: [],
      debugMode: false,
      planResult: null,
      processingStartTime: null,
      approvalModal: null,
      upgrade: null,

      // Input state
      inputValue: '',
      inputCursorPosition: undefined,
      inputShowExitWarning: false,
      inputCtrlCPressed: false,
      inputError: null,

      // Actions
      initialize: async (opts) => {
        const { bridge } = opts;
        const response = await bridge.request('initialize', {
          cwd: opts.cwd,
          sessionId: opts.sessionId,
        });
        if (!response.success) {
          throw new Error(response.error.message);
        }
        set({
          bridge,
          cwd: opts.cwd,
          productName: response.data.productName,
          productASCIIArt: response.data.productASCIIArt,
          version: response.data.version,
          model: response.data.model,
          modelContextLimit: response.data.modelContextLimit,
          sessionId: opts.sessionId,
          messages: opts.messages,
          history: opts.history,
          initialPrompt: opts.initialPrompt,
          logFile: opts.logFile,
          planMode: false,
          bashMode: false,
          approvalMode: response.data.approvalMode,
          // theme: 'light',
        });

        // Set terminal title from session config if available
        if (response.data.sessionSummary) {
          setTerminalTitle(response.data.sessionSummary);
        }

        bridge.onEvent('message', (data) => {
          const message = data.message as Message;
          get().addMessage(message);
        });
        setImmediate(async () => {
          if (opts.initialPrompt) {
            get().send(opts.initialPrompt);
          }
          // Upgrade
          if (opts.upgrade) {
            const upgrade = new Upgrade(opts.upgrade);
            const result = await upgrade.check();
            if (result.hasUpdate && result.tarballUrl) {
              set({
                upgrade: {
                  text: `v${result.latestVersion} available,\nupgrading...`,
                },
              });
              try {
                await upgrade.upgrade({ tarballUrl: result.tarballUrl });
                set({
                  upgrade: {
                    text: `Upgraded to v${result.latestVersion}`,
                    type: 'success',
                  },
                });
              } catch (error) {
                set({ upgrade: { text: `Failed to upgrade`, type: 'error' } });
              }
            }
          }
        });
      },

      send: async (message) => {
        const { bridge, cwd, sessionId, planMode, status } = get();

        // Check if processing, queue the message
        if (isExecuting(status)) {
          get().addToQueue(message);
          return;
        }

        // Only add to history when actually sending
        const newHistory = [...get().history, message];
        set({
          history: newHistory,
          historyIndex: null,
        });

        // Save history to session config
        await bridge.request('sessionConfig.addHistory', {
          cwd,
          sessionId,
          history: message,
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
                await get().sendMessage({ message: null });
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
          // Use store's current model for regular message sending
          const result = await get().sendMessage({ message, planMode });
          if (planMode && result.success) {
            set({
              planResult: result.data.text,
            });
          }

          // Update terminal title after successful send
          if (result.success) {
            try {
              const queryResult = await bridge.request('query', {
                cwd,
                systemPrompt:
                  "Analyze if this message indicates a new conversation topic. If it does, extract a 2-3 word title that captures the new topic. Format your response as a JSON object with one fields: 'title' (string). Only include these fields, no other text.",
                userPrompt: message,
              });

              if (queryResult.success && queryResult.data?.text) {
                try {
                  const response = JSON.parse(queryResult.data.text);
                  if (response && response.title) {
                    setTerminalTitle(response.title);
                    await bridge.request('sessionConfig.setSummary', {
                      cwd,
                      sessionId,
                      summary: response.title,
                    });
                  }
                } catch (parseError) {
                  get().log(String(parseError));
                }
              }
            } catch (error) {
              get().log(String(error));
            }

            // Check for queued messages
            if (get().queuedMessages.length > 0) {
              setTimeout(() => {
                get().processQueuedMessages();
              }, 100);
            }
          }
        }
      },

      sendMessage: async (opts: {
        message: string | null;
        planMode?: boolean;
      }) => {
        set({
          status: 'processing',
          processingStartTime: Date.now(),
        });
        const { bridge, cwd, sessionId } = get();
        const response: LoopResult = await bridge.request('send', {
          message: opts.message,
          cwd,
          sessionId,
          planMode: opts.planMode,
        });
        if (response.success) {
          set({ status: 'idle', processingStartTime: null });
        } else {
          set({
            status: 'failed',
            error: response.error.message,
            processingStartTime: null,
          });
        }
        return response;
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
        set({ status: 'idle', processingStartTime: null });
      },

      clear: async () => {
        const sessionId = Session.createSessionId();
        set({
          messages: [],
          history: [],
          historyIndex: null,
          sessionId,
          // Also reset input state when clearing
          inputValue: '',
          inputCursorPosition: undefined,
          inputShowExitWarning: false,
          inputCtrlCPressed: false,
          inputError: null,
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

      togglePlanMode: () => {
        set({ planMode: !get().planMode });
      },

      approvePlan: (planResult: string) => {
        set({ planResult: null, planMode: false });
        const bridge = get().bridge;
        bridge.request('addMessages', {
          cwd: get().cwd,
          sessionId: get().sessionId,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: planResult }],
              history: null,
            },
          ],
        });
        // Use store's model for plan approval - no need to pass explicitly
        get().sendMessage({ message: null });
      },

      denyPlan: () => {
        set({ planResult: null });
      },

      resumeSession: async (sessionId: string, logFile: string) => {
        await clearTerminal();
        const messages = loadSessionMessages({ logPath: logFile });
        const sessionConfigManager = new SessionConfigManager({
          logPath: logFile,
        });
        const history = sessionConfigManager.config.history || [];
        set({
          sessionId,
          logFile,
          messages,
          history,
          historyIndex: null,
          status: 'idle',
          error: null,
          slashCommandJSX: null,
          currentMessage: null,
          queuedMessages: [],
          draftInput: '',
          logs: [],
          exitMessage: null,
          planResult: null,
          processingStartTime: null,
          planMode: false,
          bashMode: false,
          // Reset input state when resuming
          inputValue: '',
          inputCursorPosition: undefined,
          inputShowExitWarning: false,
          inputCtrlCPressed: false,
          inputError: null,
        });
      },

      setModel: async (model: string) => {
        const { bridge, cwd } = get();
        await bridge.request('setConfig', {
          cwd: cwd,
          key: 'model',
          value: model,
          isGlobal: true,
        });
        await bridge.request('clearContext', {});
        set({ model });
      },
      approveToolUse: ({
        toolUse,
        category,
      }: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => {
        const { bridge, cwd, sessionId } = get();
        return new Promise<boolean>((resolve) => {
          set({
            approvalModal: {
              toolUse,
              category,
              resolve: async (result: ApprovalResult) => {
                set({ approvalModal: null });
                const isApproved = result !== 'deny';
                if (result === 'approve_always_edit') {
                  await bridge.request('sessionConfig.setApprovalMode', {
                    cwd,
                    sessionId,
                    approvalMode: 'autoEdit',
                  });
                } else if (result === 'approve_always_tool') {
                  await bridge.request('sessionConfig.addApprovalTools', {
                    cwd,
                    sessionId,
                    approvalTool: toolUse.name,
                  });
                }
                resolve(isApproved);
              },
            },
          });
        });
      },
      addToQueue: (message: string) => {
        set({ queuedMessages: [...get().queuedMessages, message] });
      },
      clearQueue: () => {
        set({ queuedMessages: [] });
      },
      processQueuedMessages: async () => {
        const queued = get().queuedMessages;
        if (queued.length === 0) return;

        get().clearQueue();
        // Send all queued messages as a single joined message
        const joinedMessage = queued.join('\n');
        await get().send(joinedMessage);
      },

      toggleDebugMode: () => {
        const newDebugMode = !get().debugMode;
        set({ debugMode: newDebugMode });
        if (newDebugMode) {
          open(get().logFile).catch((error) =>
            get().log(`Failed to open log file: ${error.message}`),
          );
        }
      },

      setStatus: (status: AppStatus) => {
        set({ status });
      },

      // Input state actions
      setInputValue: (value: string) => {
        set({ inputValue: value });
      },

      setInputCursorPosition: (position: number | undefined) => {
        set({ inputCursorPosition: position });
      },

      setInputShowExitWarning: (show: boolean) => {
        set({ inputShowExitWarning: show });
      },

      setInputCtrlCPressed: (pressed: boolean) => {
        set({ inputCtrlCPressed: pressed });
      },

      setInputError: (error: string | null) => {
        set({ inputError: error });
      },

      resetInput: () => {
        set({
          inputValue: '',
          inputCursorPosition: undefined,
          inputShowExitWarning: false,
          inputCtrlCPressed: false,
          inputError: null,
        });
      },
    }),
    { name: 'app-store' },
  ),
);
