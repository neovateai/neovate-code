import { Delta } from 'quill';
import { proxy } from 'valtio';

interface SenderState {
  prompt: string;
  mode: string;
  /** For quill editor render rich text */
  delta: Delta;
}

export const state = proxy<SenderState>({
  prompt: '',
  mode: 'agent',
  delta: new Delta(),
});

export const actions = {
  updatePrompt: (prompt: string) => {
    state.prompt = prompt;
  },

  updateMode: (mode: string) => {
    state.mode = mode;
  },

  updateDelta: (delta: Delta) => {
    state.delta = delta;
  },
};
