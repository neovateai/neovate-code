import type { ReactNode } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message } from '../history';
import type { LoopResult } from '../loop';
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
  | 'failed'
  | 'cancelled'
  | 'slash_command';

const APP_STATUS_MESSAGES = {
  processing: 'Processing...',
  planning: 'Planning...',
  plan_approving: 'Waiting for plan approval...',
  tool_approving: 'Waiting for tool approval...',
  tool_executing: 'Executing tool...',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

interface AppState {
  bridge: UIBridge;

  cwd: string;
  productName: string;
  version: string;
  theme: Theme;
  model: string;
  sessionId: string | null;

  status: AppStatus;
  error: string | null;
  slashCommandJSX: ReactNode | null;

  messages: Message[];
  currentMessage: Message | null;
  queuedMessages: QueuedMessage[];

  draftInput: string;
  history: string[];
  historyIndex: number | null;
}

type InitializeOpts = {
  bridge: UIBridge;
  cwd: string;
  initialPrompt: string;
};

interface AppActions {
  initialize: (opts: InitializeOpts) => Promise<void>;
  send: (message: string) => Promise<void>;
  addMessage: (message: Message) => void;
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
      sessionId: null,

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
          // theme: 'light',
        });
        bridge.onEvent('message', (data) => {
          get().addMessage(data.message);
        });
        if (opts.initialPrompt) {
          await get().send(opts.initialPrompt);
        }
      },

      // TODO: support aborting
      // TODO: support queued messages
      send: async (message) => {
        const { bridge, cwd, sessionId } = get();
        set({ status: 'processing' });
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
      },

      cancel: async () => {
        const { bridge, cwd, sessionId } = get();
        await bridge.request('cancel', {
          cwd,
          sessionId,
        });
        set({ status: 'cancelled' });
      },

      addMessage: (message) => {
        set({ messages: [...get().messages, message] });
      },
    }),
    { name: 'app-store' },
  ),
);
