import type { Attachment } from '@ant-design/x/es/attachments';
import { proxy } from '@umijs/max';
import { getFileList } from '@/api/fileService';
import type { FileItem } from '@/api/model';

interface SuggestionState {
  fileList: FileItem[];
}

export const state = proxy<SuggestionState>({
  fileList: [],
});

export const actions = {
  setFileList: (value: FileItem[]) => {
    state.fileList = value;
  },
  getFileList: async () => {
    const response = await getFileList();
    state.fileList = response.data.items || [];
  },
};
