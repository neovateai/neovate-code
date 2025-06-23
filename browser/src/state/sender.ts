import { proxy } from 'valtio';

interface SenderState {
  prompt: string;
  plainText: string;
}

export const state = proxy<SenderState>({
  prompt: '',
  plainText: '',
});

export const actions = {
  updatePrompt: (prompt: string) => {
    state.prompt = prompt;
  },

  updatePlainText: (plainText: string) => {
    state.plainText = plainText;
  },
};
