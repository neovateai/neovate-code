import type { Attachment } from '@ant-design/x/es/attachments';
import { proxy } from 'valtio';

interface SenderState {
  prompt: string;
  plainText: string;
  attachedFiles: Attachment[];
}

export const state = proxy<SenderState>({
  prompt: '',
  plainText: '',
  attachedFiles: [],
});

export const actions = {
  updatePrompt: (prompt: string) => {
    state.prompt = prompt;
  },

  updatePlainText: (plainText: string) => {
    state.plainText = plainText;
  },

  setAttachedFiles: (value: Attachment[]) => {
    state.attachedFiles = value;
  },
};
