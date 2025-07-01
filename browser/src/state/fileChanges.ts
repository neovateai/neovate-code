import { proxy } from 'valtio';
import { editFile, readFile } from '@/api/files';

export interface FileEdit {
  toolCallId: string;
  old_string: string;
  new_string: string;
}

interface FileState {
  path: string;
  content: string;
  edits: FileEdit[];
}

interface FileChangesStore {
  files: Record<string, FileState | undefined>;
}

export const fileChangesState = proxy<FileChangesStore>({
  files: {},
});

export const fileChangesActions = {
  // 修改本地file内容
  writeFileContent: async (path: string, newCode: string) => {
    const fileState = fileChangesState.files[path];
    if (fileState) {
      await editFile(path, newCode);
      fileState.content = newCode;
    }
  },

  // 更新fileState
  updateFileState: (path: string, fileState: FileState) => {
    fileChangesState.files[path] = fileState;
  },

  // 初始化fileState, push edits
  initFileState: async (path: string, edits: FileEdit[]) => {
    const fileState = fileChangesState.files[path];
    if (!fileState) {
      const fileContent = await readFile(path);
      if (fileContent.success) {
        fileChangesState.files[path] = proxy<FileState>({
          path,
          content: fileContent.data.content,
          edits,
        });
      }
    } else {
      // 因为存在多个edit render call，所以content可能初始化过了
      fileState.edits.push(...edits);
    }
  },
};
