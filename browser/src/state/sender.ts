import { proxy } from 'valtio';

interface SenderState {
  prompt: string;
  plainText: string;
  mode:
    | 'chat'
    | 'code'
    | 'shell'
    | 'agent'
    | 'plan'
    | 'ask'
    | 'refactor'
    | 'ai-code';
  openFooter: boolean;
}

export const state = proxy<SenderState>({
  prompt: '',
  plainText: '',
  mode: 'agent',
  openFooter: true,
});

export const actions = {
  updatePrompt: (prompt: string) => {
    state.prompt = prompt;
  },

  updatePlainText: (plainText: string) => {
    state.plainText = plainText;
  },

  updateMode: (mode: SenderState['mode']) => {
    state.mode = mode;
  },

  updateOpenFooter: (openFooter: boolean) => {
    state.openFooter = openFooter;
  },
};
