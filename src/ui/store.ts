import open from 'open';
import type { ReactNode } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ApprovalMode } from '../config';
import type { LoopResult, StreamResult, ThinkingConfig } from '../loop';
import type { Message, NormalizedMessage, UserMessage } from '../message';
import type { ModelInfo, ProvidersMap } from '../model';
import { Paths } from '../paths';
import { loadSessionMessages, Session, SessionConfigManager } from '../session';
import {
  type CommandEntry,
  isSlashCommand,
  parseSlashCommand,
} from '../slashCommand';
import type { ApprovalCategory, ToolUse } from '../tool';
import type { UIBridge } from '../uiBridge';
import { Upgrade, type UpgradeOptions } from '../upgrade';
import { setTerminalTitle } from '../utils/setTerminalTitle';
import { clearTerminal } from '../utils/terminal';
import { countTokens } from '../utils/tokenCounter';
import { getUsername } from '../utils/username';
import { detectImageFormat } from './TextInput/utils/imagePaste';

export type ApprovalResult =
  | 'approve_once'
  | 'approve_always_edit'
  | 'approve_always_tool'
  | 'deny';

export interface BashPromptBackgroundEvent {
  taskId: string;
  command: string;
  currentOutput: string;
}

type Theme = 'light' | 'dark';
type AppStatus =
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

interface AppState {
  bridge: UIBridge;

  cwd: string;
  userName: string;
  productName: string;
  productASCIIArt: string;
  version: string;
  theme: Theme;
  model: ModelInfo | null;
  planModel: string | null;
  modelContextLimit: number;
  initializeModelError: string | null;
  providers: ProvidersMap;
  sessionId: string | null;
  initialPrompt: string | null;
  logFile: string;

  status: AppStatus;
  error: string | null;
  slashCommandJSX: ReactNode | null;
  planMode: boolean;
  brainstormMode: boolean;
  bashMode: boolean;
  approvalMode: ApprovalMode;

  planResult: string | null;
  processingStartTime: number | null;
  processingTokens: number;

  retryInfo: {
    currentRetry: number;
    maxRetries: number;
    error: string | null;
  } | null;

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

  // Pasted text storage
  pastedTextMap: Record<string, string>;

  // Pasted image storage
  pastedImageMap: Record<string, string>;

  logs: string[];
  exitMessage: string | null;
  debugMode: boolean;

  approvalModal: {
    toolUse: ToolUse;
    category?: ApprovalCategory;
    resolve: (
      result: ApprovalResult,
      params?: Record<string, unknown>,
    ) => Promise<void>;
  } | null;

  memoryModal: {
    rule: string;
    resolve: (result: 'project' | 'global' | null) => void;
  } | null;

  upgrade: {
    text: string;
    type?: 'success' | 'error';
  } | null;

  forkModalVisible: boolean;
  forkParentUuid: string | null;
  forkCounter: number;

  bashBackgroundPrompt: BashPromptBackgroundEvent | null;
  thinking: ThinkingConfig | undefined;
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
    model?: string;
  }) => Promise<LoopResult>;
  addMessage: (message: Message) => void;
  log: (log: string) => void;
  setExitMessage: (exitMessage: string | null) => void;
  cancel: () => Promise<void>;
  clear: () => Promise<void>;
  setDraftInput: (draftInput: string) => void;
  setHistoryIndex: (historyIndex: number | null) => void;
  toggleMode: () => void;
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
  }) => Promise<{ approved: boolean; params?: Record<string, unknown> }>;
  showMemoryModal: (rule: string) => Promise<'project' | 'global' | null>;
  addToQueue: (message: string) => void;
  clearQueue: () => void;
  processQueuedMessages: () => Promise<void>;
  scheduleQueueProcessing: () => void;
  toggleDebugMode: () => void;
  setStatus: (status: AppStatus) => void;
  setBashMode: (bashMode: boolean) => void;
  setRetryInfo: (
    retryInfo: {
      currentRetry: number;
      maxRetries: number;
      error: string | null;
    } | null,
  ) => void;

  // Input state actions
  setInputValue: (value: string) => void;
  setInputCursorPosition: (position: number | undefined) => void;
  setInputShowExitWarning: (show: boolean) => void;
  setInputCtrlCPressed: (pressed: boolean) => void;
  setInputError: (error: string | null) => void;
  resetInput: () => void;
  setPastedTextMap: (map: Record<string, string>) => Promise<void>;
  setPastedImageMap: (map: Record<string, string>) => Promise<void>;
  showForkModal: () => void;
  hideForkModal: () => void;
  fork: (targetMessageUuid: string) => Promise<void>;
  incrementForkCounter: () => void;
  setBashBackgroundPrompt: (prompt: BashPromptBackgroundEvent) => void;
  clearBashBackgroundPrompt: () => void;
  toggleThinking: () => void;
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
      providers: {},
      status: 'idle',
      error: null,
      slashCommandJSX: null,
      planMode: false,
      brainstormMode: false,
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
      processingTokens: 0,
      retryInfo: null,
      approvalModal: null,
      memoryModal: null,
      upgrade: null,

      // Input state
      inputValue: '',
      inputCursorPosition: undefined,
      inputShowExitWarning: false,
      inputCtrlCPressed: false,
      inputError: null,
      pastedTextMap: {},
      pastedImageMap: {},
      forkModalVisible: false,
      forkParentUuid: null,
      forkCounter: 0,
      thinking: undefined,

      bashBackgroundPrompt: null,

      // Actions
      initialize: async (opts) => {
        const { bridge } = opts;
        const response = await bridge.request('session.initialize', {
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
          planModel: response.data.planModel,
          initializeModelError: response.data.initializeModelError,
          modelContextLimit: response.data.model?.model?.limit.context || 0,
          providers: response.data.providers,
          sessionId: opts.sessionId,
          messages: opts.messages,
          history: opts.history,
          initialPrompt: opts.initialPrompt,
          logFile: opts.logFile,
          planMode: false,
          bashMode: false,
          approvalMode: response.data.approvalMode,
          pastedTextMap: response.data.pastedTextMap || {},
          pastedImageMap: response.data.pastedImageMap || {},
          userName: getUsername() ?? 'user',
          thinking: response.data.model?.thinkingConfig
            ? { effort: 'low' }
            : undefined,
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
        bridge.onEvent('chunk', (data) => {
          // Match sessionId and cwd
          if (data.sessionId === get().sessionId && data.cwd === get().cwd) {
            const chunk = data.chunk;
            // Collect tokens from text-delta and reasoning events
            if (
              chunk.type === 'text-delta' ||
              chunk.type === 'reasoning-delta'
            ) {
              const tokenCount = countTokens(chunk.delta);
              set({ processingTokens: get().processingTokens + tokenCount });
            }
          }
        });
        bridge.onEvent('streamResult', (data) => {
          const result = data.result as StreamResult;
          if (result.error) {
            const error = (() => {
              try {
                return result.error.data.error.message;
              } catch (_e) {}
              return JSON.stringify(result.error.data);
            })();
            set({
              retryInfo: {
                currentRetry: result.error.retryAttempt,
                maxRetries: result.error.maxRetries,
                error,
              },
            });
          } else {
            set({ retryInfo: null });
          }
        });
        setImmediate(async () => {
          if (opts.initialPrompt) {
            get().send(opts.initialPrompt);
          }
          // Upgrade
          if (opts.upgrade) {
            const autoUpdateResponse = await bridge.request('config.get', {
              cwd: opts.cwd,
              isGlobal: true,
              key: 'autoUpdate',
            });
            const autoUpdate = autoUpdateResponse.data.value ?? true;
            if (autoUpdate) {
              const upgrade = new Upgrade(opts.upgrade);
              const result = await upgrade.check();
              if (result.hasUpdate && result.tarballUrl) {
                set({
                  upgrade: {
                    text: `v${result.latestVersion} available, upgrading...`,
                  },
                });
                try {
                  await upgrade.upgrade({ tarballUrl: result.tarballUrl });
                  set({
                    upgrade: {
                      text: `Upgraded to v${result.latestVersion}, restart to apply changes.`,
                      type: 'success',
                    },
                  });
                } catch (error) {
                  set({
                    upgrade: {
                      text: `Failed to upgrade: ${String(error)}`,
                      type: 'error',
                    },
                  });
                }
              }
            }
          }
        });
      },

      send: async (message) => {
        const {
          bridge,
          cwd,
          sessionId,
          planMode,
          brainstormMode,
          status,
          pastedTextMap,
        } = get();

        if (brainstormMode) {
          message = `/spec:brainstorm ${message}`;
          set({
            brainstormMode: false,
          });
        }

        bridge.request('utils.telemetry', {
          cwd,
          name: 'send',
          payload: { message, sessionId },
        });

        // Check if processing, queue the message
        if (isExecuting(status)) {
          get().addToQueue(message);
          return;
        }

        // Expand pasted text references before processing
        let expandedMessage = message;
        const pastedTextRegex = /\[Pasted text (#\d+) \d+ lines\]/g;
        const matches = [...message.matchAll(pastedTextRegex)];
        for (const match of matches) {
          const pasteId = match[1];
          const pastedContent = pastedTextMap[pasteId];
          if (pastedContent) {
            const placeholder = new RegExp(
              `\\[Pasted text ${pasteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d+ lines\\]`,
              'g',
            );
            expandedMessage = expandedMessage.replace(
              placeholder,
              pastedContent.replace(/\r/g, '\n'),
            );
          }
        }

        // Save history to global data (save the original message with placeholders)
        if (!isSlashCommand(message)) {
          const newHistory = [...get().history, message];
          set({
            history: newHistory,
            historyIndex: null,
          });
          await bridge.request('project.addHistory', {
            cwd,
            history: message,
          });
        }

        // slash command - use expanded message for processing
        if (isSlashCommand(expandedMessage)) {
          const parsed = parseSlashCommand(expandedMessage);
          const result = await bridge.request('slashCommand.get', {
            cwd,
            command: parsed.command,
          });
          const commandEntry = result.data?.commandEntry as CommandEntry;
          if (commandEntry) {
            const userMessage: Message = {
              role: 'user',
              content: expandedMessage,
            };
            const command = commandEntry.command;
            const type = command.type;
            const isLocal = type === 'local';
            const isLocalJSX = type === 'local-jsx';
            const isPrompt = type === 'prompt';
            if (isPrompt) {
              const forkParentUuid = get().forkParentUuid;
              await bridge.request('session.addMessages', {
                cwd,
                sessionId,
                messages: [userMessage],
                parentUuid: forkParentUuid || undefined,
              });
              if (forkParentUuid) {
                set({
                  forkParentUuid: null,
                });
              }
            } else {
              set({
                messages: [...get().messages, userMessage],
              });
            }
            // TODO: save local type command's messages to history
            if (isLocal || isPrompt) {
              const result = await bridge.request('slashCommand.execute', {
                cwd,
                sessionId,
                command: parsed.command,
                args: parsed.args,
              });
              if (result.success) {
                const messages = result.data.messages;
                if (isPrompt) {
                  await bridge.request('session.addMessages', {
                    cwd,
                    sessionId,
                    messages,
                  });
                } else {
                  set({
                    messages: [...get().messages, ...messages],
                  });
                }
              }
              if (isPrompt) {
                await get().sendMessage({
                  message: null,
                  model: command.model,
                });
              }
            } else if (isLocalJSX) {
              const jsx = await command.call(
                async (result: string | null) => {
                  set({
                    slashCommandJSX: null,
                  });
                  if (result) {
                    set({
                      messages: [
                        ...get().messages,
                        {
                          role: 'user',
                          content: [
                            {
                              type: 'text',
                              text: result,
                            },
                          ],
                        },
                      ],
                    });
                  }
                },
                {} as any,
                parsed.args,
              );
              set({
                slashCommandJSX: jsx,
              });
            } else {
              throw new Error(
                `Unknown slash command type: ${commandEntry.command.type}`,
              );
            }
            // set({ status: 'slash_command_executing' });
          } else {
            const userMessage: UserMessage = {
              role: 'user',
              content: `Unknown slash command: ${parsed.command}`,
            };
            get().addMessage(userMessage);
          }
          return;
        }

        // Check if message is a bash command
        if (expandedMessage.startsWith('!')) {
          const command = expandedMessage.slice(1).trim();
          if (!command) return;

          set({
            status: 'processing',
          });

          // Add bash command message
          const bashCommandMsg: Message = {
            role: 'user',
            content: `<bash-input>${command}</bash-input>`,
          };

          await bridge.request('session.addMessages', {
            cwd,
            sessionId,
            messages: [bashCommandMsg],
          });

          // Execute command via bash tool
          const result = await bridge.request('utils.tool.executeBash', {
            cwd,
            command,
          });

          // Add output message
          const bashOutputMsg = {
            role: 'user',
            uiContent: result.data.returnDisplay,
            content: result.data.isError
              ? `<bash-stderr>${result.data.llmContent}</bash-stderr>`
              : `<bash-stdout>${result.data.llmContent}</bash-stdout>`,
          };

          await bridge.request('session.addMessages', {
            cwd,
            sessionId,
            messages: [bashOutputMsg],
          });

          set({
            status: 'idle',
          });

          // Check for queued messages after bash command execution
          get().scheduleQueueProcessing();

          return;
        } else {
          // Use store's current model for regular message sending
          const result = await get().sendMessage({
            message: expandedMessage,
            planMode,
          });
          if (planMode && result.success) {
            set({
              planResult: result.data.text,
            });
          }

          // Update terminal title after successful send
          if (result.success && get().messages.length <= 2) {
            // don't await this
            (async () => {
              try {
                const queryResult = await bridge.request(
                  'utils.summarizeMessage',
                  {
                    cwd,
                    message,
                  },
                );

                if (queryResult.success && queryResult.data?.text) {
                  try {
                    const response = JSON.parse(queryResult.data.text);
                    if (response && response.title) {
                      setTerminalTitle(response.title);
                      await bridge.request('session.config.setSummary', {
                        cwd,
                        sessionId,
                        summary: response.title,
                      });
                    }
                  } catch (parseError) {
                    get().log(
                      `Parse query result error: ${String(parseError)}`,
                    );
                    get().log(`Query result: ${queryResult.data.text}`);
                  }
                }
              } catch (error) {
                get().log(`Query error: ${String(error)}`);
              }
            })();
          }

          // Check for queued messages after successful send
          if (result.success) {
            get().scheduleQueueProcessing();
          }
        }
      },

      // Helper method to schedule queued message processing
      scheduleQueueProcessing: () => {
        const QUEUE_PROCESSING_DELAY_MS = 100; // Delay to ensure current operation completes
        if (get().queuedMessages.length > 0) {
          get().log(
            `Scheduling processing of ${get().queuedMessages.length} queued message(s)`,
          );
          setTimeout(() => {
            get().processQueuedMessages();
          }, QUEUE_PROCESSING_DELAY_MS);
        }
      },

      setBashBackgroundPrompt: (prompt: BashPromptBackgroundEvent) => {
        set({ bashBackgroundPrompt: prompt });
      },

      clearBashBackgroundPrompt: () => {
        set({ bashBackgroundPrompt: null });
      },

      sendMessage: async (opts: {
        message: string | null;
        planMode?: boolean;
        model?: string;
      }) => {
        set({
          status: 'processing',
          processingStartTime: Date.now(),
          processingTokens: 0,
        });
        const { message } = opts;
        const { bridge, cwd, sessionId, pastedImageMap } = get();

        const attachments = [];
        // Handle pasted images
        if (message && Object.keys(pastedImageMap).length > 0) {
          const pastedImageRegex = /\[Image (#\d+)\]/g;
          const imageMatches = [...message.matchAll(pastedImageRegex)];

          for (const match of imageMatches) {
            const imageId = match[1];
            const imageData = pastedImageMap[imageId];
            if (imageData) {
              const mimeType = detectImageFormat(imageData);
              attachments.push({
                type: 'image',
                data: `data:image/${mimeType};base64,${imageData}`,
                mimeType: `image/${mimeType}`,
              });
            }
          }
        }

        const response: LoopResult = await bridge.request('session.send', {
          message: opts.message,
          cwd,
          sessionId,
          planMode: opts.planMode,
          model: opts.model,
          attachments,
          parentUuid: get().forkParentUuid || undefined,
          thinking: get().thinking,
        });
        if (response.success) {
          set({
            status: 'idle',
            processingStartTime: null,
            processingTokens: 0,
            retryInfo: null,
            forkParentUuid: null,
          });
        } else {
          set({
            status: 'failed',
            error: response.error.message,
            processingStartTime: null,
            processingTokens: 0,
            retryInfo: null,
            forkParentUuid: null,
          });
        }
        return response;
      },

      cancel: async () => {
        const { bridge, cwd, sessionId, status } = get();
        if (!isExecuting(status)) {
          return;
        }
        await bridge.request('session.cancel', {
          cwd,
          sessionId,
        });
        set({
          status: 'idle',
          processingStartTime: null,
          processingTokens: 0,
          retryInfo: null,
          bashBackgroundPrompt: null,
        });
      },

      clear: async () => {
        const sessionId = Session.createSessionId();
        const paths = new Paths({
          productName: get().productName,
          cwd: get().cwd,
        });
        set({
          messages: [],
          sessionId,
          logFile: paths.getSessionLogPath(sessionId),
          // Also reset input state when clearing
          inputValue: '',
          inputCursorPosition: undefined,
          inputShowExitWarning: false,
          inputCtrlCPressed: false,
          inputError: null,
          pastedTextMap: {},
          pastedImageMap: {},
          processingTokens: 0,
          retryInfo: null,
          forkParentUuid: null,
          forkModalVisible: false,
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

      toggleMode: () => {
        const { planMode, brainstormMode } = get();
        if (!planMode && !brainstormMode) {
          set({ planMode: true });
        } else if (planMode && !brainstormMode) {
          set({ planMode: false, brainstormMode: true });
        } else {
          set({ planMode: false, brainstormMode: false });
        }
      },

      approvePlan: (planResult: string) => {
        set({ planResult: null, planMode: false });
        const bridge = get().bridge;
        bridge
          .request('session.addMessages', {
            cwd: get().cwd,
            sessionId: get().sessionId,
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: planResult }],
              },
            ],
          })
          .catch((error) => {
            console.error('Failed to add messages:', error);
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
        const pastedTextMap = sessionConfigManager.config.pastedTextMap || {};
        const pastedImageMap = sessionConfigManager.config.pastedImageMap || {};
        set({
          sessionId,
          logFile,
          messages,
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
          processingTokens: 0,
          retryInfo: null,
          planMode: false,
          bashMode: false,
          // Reset input state when resuming
          inputValue: '',
          inputCursorPosition: undefined,
          inputShowExitWarning: false,
          inputCtrlCPressed: false,
          inputError: null,
          pastedTextMap,
          pastedImageMap,
          forkParentUuid: null,
          forkModalVisible: false,
        });
      },

      setModel: async (model: string) => {
        const { bridge, cwd } = get();
        await bridge.request('config.set', {
          cwd: cwd,
          key: 'model',
          value: model,
          isGlobal: true,
        });
        await bridge.request('project.clearContext', {});
        // Get the modelContextLimit for the selected model
        const modelsResponse = await bridge.request('models.list', { cwd });
        if (modelsResponse.success) {
          const currentModel = modelsResponse.data.currentModel;
          set({
            model: currentModel,
            modelContextLimit: currentModel?.model.limit.context || 0,
            thinking: currentModel?.thinkingConfig
              ? { effort: 'low' }
              : undefined,
          });
        }
      },

      approveToolUse: ({
        toolUse,
        category,
      }: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => {
        const { bridge, cwd, sessionId } = get();
        return new Promise<{
          approved: boolean;
          params?: Record<string, unknown>;
        }>((resolve) => {
          set({
            approvalModal: {
              toolUse,
              category,
              resolve: async (
                result: ApprovalResult,
                params?: Record<string, unknown>,
              ) => {
                set({ approvalModal: null });
                const isApproved = result !== 'deny';
                if (result === 'approve_always_edit') {
                  await bridge.request('session.config.setApprovalMode', {
                    cwd,
                    sessionId,
                    approvalMode: 'autoEdit',
                  });
                } else if (result === 'approve_always_tool') {
                  await bridge.request('session.config.addApprovalTools', {
                    cwd,
                    sessionId,
                    approvalTool: toolUse.name,
                  });
                }
                resolve({
                  approved: isApproved,
                  params: isApproved ? params : undefined,
                });
              },
            },
          });
        });
      },

      showMemoryModal: (rule: string) => {
        return new Promise<'project' | 'global' | null>((resolve) => {
          set({
            memoryModal: {
              rule,
              resolve: (result: 'project' | 'global' | null) => {
                set({ memoryModal: null });
                resolve(result);
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

      showForkModal: () => {
        set({ forkModalVisible: true });
      },

      hideForkModal: () => {
        set({ forkModalVisible: false });
      },

      fork: async (targetMessageUuid: string) => {
        const { bridge, cwd, sessionId, messages } = get();

        // Find the target message
        const targetMessage = messages.find(
          (m) => (m as NormalizedMessage).uuid === targetMessageUuid,
        );
        if (!targetMessage) {
          get().log(`Fork error: Message ${targetMessageUuid} not found`);
          return;
        }

        // Filter messages up to and including the target
        const messageIndex = messages.findIndex(
          (m) => (m as NormalizedMessage).uuid === targetMessageUuid,
        );
        const filteredMessages = messages.slice(0, messageIndex);

        // Extract content from target message
        let contentText = '';
        if (typeof targetMessage.content === 'string') {
          contentText = targetMessage.content;
        } else if (Array.isArray(targetMessage.content)) {
          const textParts = targetMessage.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text);
          contentText = textParts.join('');
        }

        // Update store state
        set({
          messages: filteredMessages,
          forkParentUuid: (targetMessage as NormalizedMessage).parentUuid,
          inputValue: contentText,
          inputCursorPosition: contentText.length,
          forkModalVisible: false,
        });
        get().incrementForkCounter();
      },

      incrementForkCounter: () => {
        set({ forkCounter: get().forkCounter + 1 });
      },

      setStatus: (status: AppStatus) => {
        set({ status });
      },

      setBashMode: (bashMode: boolean) => {
        set({ bashMode });
      },

      setRetryInfo: (retryInfo) => {
        set({ retryInfo });
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

      setPastedTextMap: async (map: Record<string, string>) => {
        const { bridge, cwd, sessionId } = get();
        set({ pastedTextMap: map });
        // Save to session config
        if (sessionId) {
          await bridge.request('session.config.setPastedTextMap', {
            cwd,
            sessionId,
            pastedTextMap: map,
          });
        }
      },

      setPastedImageMap: async (map: Record<string, string>) => {
        const { bridge, cwd, sessionId } = get();
        set({ pastedImageMap: map });
        // Save to session config
        if (sessionId) {
          await bridge.request('session.config.setPastedImageMap', {
            cwd,
            sessionId,
            pastedImageMap: map,
          });
        }
      },

      toggleThinking: () => {
        const { thinking: current, model } = get();
        if (!model) return;
        if (!model.thinkingConfig) return;
        let next: ThinkingConfig | undefined;
        if (!current) {
          next = { effort: 'low' };
        } else if (current.effort === 'low') {
          next = { effort: 'medium' };
        } else if (current.effort === 'medium') {
          next = { effort: 'high' };
        } else {
          next = undefined;
        }
        set({ thinking: next });
      },
    }),
    { name: 'app-store' },
  ),
);
