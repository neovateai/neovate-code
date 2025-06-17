import { proxy } from '@umijs/max';

interface ContextState {
  files: string[];
  isShowContext: boolean;
}

export const state = proxy<ContextState>({
  files: [],
  get isShowContext() {
    return this.files.length > 0;
  },
});

export const actions = {
  setFiles: (files: string[]) => {
    state.files = files;
  },
  setFile: (file: string) => {
    state.files = [...state.files, file];
  },
};
