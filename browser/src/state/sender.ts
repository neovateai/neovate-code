import type { Attachment } from '@ant-design/x/es/attachments';
import { proxy } from '@umijs/max';

interface SenderState {
  prompt: string;
  attachmentsOpen: boolean;
  attachedFiles: Attachment[];
}

export const state = proxy<SenderState>({
  prompt: '',
  attachmentsOpen: false,
  attachedFiles: [],
});

export const actions = {
  updatePrompt: (value: string) => {
    state.prompt = value;
  },
  setAttachmentsOpen: (value: boolean) => {
    state.attachmentsOpen = value;
  },
  setAttachedFiles: (value: Attachment[]) => {
    state.attachedFiles = value;
  },
};
