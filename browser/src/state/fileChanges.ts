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
  /** Represents the status of this edit, undefined means unmodified */
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

// Since edit tool modifies local files directly, need to calculate original content from edits
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
  // Modify local file content
  writeFileContent: async (path: string, newCode: string) => {
    const fileState = fileChangesState.files[path];
    if (fileState) {
      await editFile(path, newCode);
      fileState.content = newCode;
    }
  },

  // Update fileState
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

  // Initialize new file state, content is file content; no need to read since file doesn't exist locally
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

  // Initialize fileState, push edits
  initFileState: async (path: string, edits: FileEdit[]) => {
    const fileState = fileChangesState.files[path];
    console.log('initFileState --->', path, fileState, edits);
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
      // Since there are multiple edit render calls, content might already be initialized
      fileState.edits.push(...edits);
    }
  },

  // Read all edits in the corresponding path file and apply these edits to get the final content
  getFinalContent: (path: string) => {
    const fileState = fileChangesState.files[path];
    if (!fileState) {
      return '';
    }
    return fileChangesState.files[path]?.edits.reduce((content, edit) => {
      // If not accepted or rejected, consider the edit as valid and needs to be applied
      if (!edit.editStatus) {
        // If old_string is empty, consider the edit as new addition and needs to be applied
        if (edit.old_string === '') {
          return edit.new_string;
        }
        // Apply edit and mark as applied
        const result = content.replace(edit.old_string, () => edit.new_string);

        return result;
      }
      if (edit.editStatus === 'accept') {
        // `accept` means content has already been updated
        return content;
      }
      return content;
    }, fileState.content);
  },
};
