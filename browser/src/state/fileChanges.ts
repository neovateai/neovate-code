import { proxy } from 'valtio';
import { editFile, readFile } from '@/api/files';
import * as codeViewer from '@/state/codeViewer';
import type {
  CodeNormalViewerMode,
  CodeViewerEditStatus,
} from '@/types/codeViewer';
import { diff } from '@/utils/codeViewer';

export interface FileEdit {
  toolCallId: string;
  old_string: string;
  new_string: string;
  /** 表示该edit的状态，undefined时表示未修改 */
  editStatus?: CodeViewerEditStatus;
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
  updateFileState: async (
    path: string,
    fileStateFn: (prevFileState: FileState) => FileState,
    mode?: CodeNormalViewerMode,
  ) => {
    const prevFileState = fileChangesState.files[path];
    if (!prevFileState) {
      return;
    }
    const nextFileState = fileStateFn(prevFileState);
    fileChangesState.files[path] = nextFileState;
    // 更新后，将最终内容写入文件
    const finalContent = fileChangesActions.getFinalContent(path);
    if (finalContent) {
      await editFile(path, finalContent);
    }

    const originalCode = nextFileState.content;
    const modifiedCode = fileChangesActions.getFinalContent(path) || '';
    fileChangesActions.updateCodeViewerState(
      path,
      originalCode,
      modifiedCode,
      mode,
    );
  },

  acceptEdit: (
    path: string,
    editToAccept: FileEdit,
    mode?: CodeNormalViewerMode,
  ) => {
    fileChangesActions.updateFileState(
      path,
      (prevState) => {
        const newContent = prevState.content.replace(
          editToAccept.old_string,
          editToAccept.new_string,
        );
        const nextEdit: FileEdit = {
          ...editToAccept,
          editStatus: 'accept',
        };
        return {
          ...prevState,
          content: newContent,
          edits: prevState.edits.map((edit) =>
            edit.toolCallId === nextEdit.toolCallId ? nextEdit : edit,
          ),
        };
      },
      mode,
    );
  },

  rejectEdit: (
    path: string,
    editToReject: FileEdit,
    mode?: CodeNormalViewerMode,
  ) => {
    fileChangesActions.updateFileState(
      path,
      (prevState) => {
        const nextEdit: FileEdit = {
          ...editToReject,
          editStatus: 'reject',
        };
        return {
          ...prevState,
          edits: prevState.edits.map((edit) =>
            edit.toolCallId === nextEdit.toolCallId ? nextEdit : edit,
          ),
        };
      },
      mode,
    );
  },

  updateCodeViewerState: async (
    path: string,
    originalCode: string,
    modifiedCode: string,
    mode?: CodeNormalViewerMode,
  ) => {
    if (mode) {
      codeViewer.actions.updateNormalViewerConfig({
        code: mode === 'new' ? modifiedCode : originalCode,
        path,
        mode,
      });
    } else {
      const diffStat = await diff(originalCode, modifiedCode);
      codeViewer.actions.updateDiffViewerConfig({
        path,
        originalCode,
        modifiedCode,
        diffStat,
      });
    }
  },

  // 初始化新文件的state，content为文件内容；不需要read因为本地没有这个文件
  initNewFileState: async (
    path: string,
    content: string,
    edits: FileEdit[],
  ) => {
    fileChangesState.files[path] = proxy<FileState>({
      path,
      content,
      edits,
    });
  },

  // 初始化fileState, push edits
  initFileState: async (path: string, edits: FileEdit[]) => {
    const fileState = fileChangesState.files[path];
    console.log('thy debug initFileState', path, edits);
    console.log('thy debug fileState', fileState);
    if (!fileState) {
      const fileContent = await readFile(path);
      if (fileContent.success) {
        const originalContent = calculateOriginalContent(
          fileContent.data.content,
          edits,
        );
        console.log('thy debug originalContent', originalContent);
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

  // 读取对应path文件中的所有edits，并应用这些edits，得到最终内容
  getFinalContent: (path: string) => {
    const fileState = fileChangesState.files[path];
    if (!fileState) {
      return '';
    }
    return fileChangesState.files[path]?.edits.reduce((content, edit) => {
      // 如果没有accept或reject过，则认为edit是有效的，需要应用
      if (!edit.editStatus) {
        return content.replace(edit.old_string, edit.new_string);
      }
      if (edit.editStatus === 'accept') {
        // `accept` 意味着 content 已经被更新
        return content;
      }
      return content;
    }, fileState.content);
  },
};
