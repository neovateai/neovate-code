import type { Attachment } from '@ant-design/x/es/attachments';
import { proxy } from 'valtio';

interface SenderState {
  prompt: string;
  contextOpen: boolean;
  attachedFiles: Attachment[];
}

export const state = proxy<SenderState>({
  prompt: '',
  contextOpen: false,
  attachedFiles: [],
});

export const actions = {
  updatePrompt: (value: string) => {
    state.prompt = value;
  },
  setContextOpen: (value: boolean) => {
    state.contextOpen = value;
  },
  setAttachedFiles: (value: Attachment[]) => {
    state.attachedFiles = value;
  },
};
