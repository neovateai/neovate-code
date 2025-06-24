import { proxy } from 'valtio';
import { getFileList } from '@/api/files';
import type { FileItem } from '@/api/model';

interface SuggestionState {
  fileList: FileItem[];
  fileMap: Map<string, FileItem>;
  loading: boolean;
  loaded: boolean;
}

export const state = proxy<SuggestionState>({
  fileList: [],
  fileMap: new Map(),
  loading: false,
  loaded: false,
});

export const actions = {
  setFileList: (value: FileItem[]) => {
    state.fileList = value;
    state.loaded = true;
    state.loading = false;
    value.forEach((file) => {
      state.fileMap.set(file.path, file);
    });
  },
  getFileList: async () => {
    if (state.loading || state.loaded) {
      return;
    }

    state.loading = true;
    try {
      const response = await getFileList();
      actions.setFileList(response.data.items || []);
    } catch (error) {
      state.loading = false;
      console.error('Failed to get file list:', error);
    }
  },
  getFileByPath: (path: string) => {
    return state.fileMap.get(path);
  },
};
