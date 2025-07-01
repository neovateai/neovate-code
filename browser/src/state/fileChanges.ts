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

// 因为edit tool会直接修改本地文件，所以需要根据edits计算出原始内容
const calculateOriginalContent = (finalContent: string, edits: FileEdit[]) => {
  return edits.reduceRight(
    (content, edit) => content.replace(edit.new_string, edit.old_string),
    finalContent,
  );
};

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
        const originalContent = calculateOriginalContent(
          fileContent.data.content,
          edits,
        );
        fileChangesState.files[path] = proxy<FileState>({
          path,
          content: originalContent,
          edits,
        });
      }
    } else {
      // 因为存在多个edit render call，所以content可能初始化过了
      fileState.edits.push(...edits);
    }
  },
};
