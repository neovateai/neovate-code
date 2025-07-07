import { proxy } from 'valtio';
import { type FileListQueries, getFileList } from '@/api/files';
import type { FileItem } from '@/api/model';

interface SuggestionState {
  fileList: FileItem[];
  fileMap: Map<string, FileItem>;
  loading: boolean;
}

export const state = proxy<SuggestionState>({
  fileList: [],
  fileMap: new Map(),
  loading: false,
});

export const actions = {
  setFileList: (value: FileItem[]) => {
    state.fileList = value;

    state.loading = false;
    value.forEach((file) => {
      state.fileMap.set(file.path, file);
    });
  },
  getFileList: async (queries?: FileListQueries) => {
    console.log(queries);
    if (state.loading) {
      return;
    }

    state.loading = true;
    try {
      const response = await getFileList(queries);
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
