import { proxy } from 'valtio';
import { getFileList } from '@/api/fileService';
import type { FileItem } from '@/api/model';

interface SuggestionState {
  fileList: FileItem[];
  fileMap: Map<string, FileItem>;
}

export const state = proxy<SuggestionState>({
  fileList: [],
  fileMap: new Map(),
});

export const actions = {
  setFileList: (value: FileItem[]) => {
    state.fileList = value;
    value.forEach((file) => {
      state.fileMap.set(file.path, file);
    });
  },
  getFileList: async () => {
    const response = await getFileList();
    actions.setFileList(response.data.items || []);
  },
  getFileByPath: (path: string) => {
    return state.fileMap.get(path);
  },
};
