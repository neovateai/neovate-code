import { proxy } from 'valtio';

interface SenderState {
  prompt: string;
  plainText: string;
  mode: string;
  openFooter: boolean;
}

export const state = proxy<SenderState>({
  prompt: '',
  plainText: '',
  mode: 'agent',
  openFooter: false,
});

export const actions = {
  updatePrompt: (prompt: string) => {
    state.prompt = prompt;
  },

  updatePlainText: (plainText: string) => {
    state.plainText = plainText;
  },

  updateOpenFooter: (openFooter: boolean) => {
    state.openFooter = openFooter;
  },

  updateModeAndFooterVisible: (mode: string, openFooter: boolean) => {
    state.mode = mode;
    state.openFooter = openFooter;
  },
};
