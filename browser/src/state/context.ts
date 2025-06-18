import { proxy } from 'valtio';
import type { FileItem } from '@/api/model';
import * as suggestion from '@/state/suggestion';

interface ContextState {
  fileList: FileItem[];
  isShowContext: boolean;
  contexts: {
    files: Omit<FileItem, 'name'>[];
  };
}

export const state = proxy<ContextState>({
  fileList: [],
  get isShowContext() {
    return this.fileList.length > 0;
  },
  get contexts() {
    return {
      files: this.fileList.map((file: FileItem) => ({
        path: file.path,
        type: file.type,
      })),
    };
  },
});

export const actions = {
  setFiles: (files: FileItem[]) => {
    state.fileList = files;
  },
  setFile: (path: string) => {
    const file = suggestion.actions.getFileByPath(path);
    if (file) {
      // 增加去重
      if (!state.fileList.some((f) => f.path === file.path)) {
        state.fileList.push(file);
      }
    }
  },
};
