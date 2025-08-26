import { proxy } from 'valtio';

interface SenderState {
  prompt: string;
  mode: string;
}

export const state = proxy<SenderState>({
  prompt: '',
  mode: 'agent',
});

export const actions = {
  updatePrompt: (prompt: string) => {
    state.prompt = prompt;
  },

  updateMode: (mode: string) => {
    state.mode = mode;
  },
};
