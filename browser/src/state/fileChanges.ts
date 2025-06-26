import { proxy } from 'valtio';
import { editFile, readFile } from '@/api/files';

export interface FileEdit {
  toolCallId: string;
  old_string: string;
  new_string: string;
}

interface FileState {
  path: string;
  finalContent?: string;
  originalContent?: string;
  isLoading: boolean;
  edits: FileEdit[];
  error?: string;
}

interface FileChangesStore {
  files: Record<string, FileState | undefined>;
}

export const fileChangesState = proxy<FileChangesStore>({
  files: {},
});

const calculateOriginalContent = (finalContent: string, edits: FileEdit[]) => {
  // IMPORTANT: The backend applies edits sequentially. To get the original,
  // we must reverse-apply them in the opposite order of execution.
  return edits.reduceRight(
    (content, edit) => content.replace(edit.new_string, edit.old_string),
    finalContent,
  );
};

// This map holds promises for ongoing fetch operations for each file path.
// It prevents race conditions where multiple components trigger the same fetch.
const fetchPromises: Record<string, Promise<void>> = {};

export const fileChangesActions = {
  registerEdit: (path: string, edit: FileEdit) => {
    let fileState = fileChangesState.files[path];

    if (!fileState) {
      fileState = proxy<FileState>({ path, isLoading: false, edits: [] });
      fileChangesState.files[path] = fileState;
    }

    // Add the new edit if it's not already registered for this file.
    if (!fileState.edits.some((e) => e.toolCallId === edit.toolCallId)) {
      fileState.edits.push(edit);
      // If content is already loaded, we must recalculate the original content
      // as the basis for the diff has now changed with the new edit.
      if (fileState.finalContent) {
        fileState.originalContent = calculateOriginalContent(
          fileState.finalContent,
          fileState.edits,
        );
      }
    }

    // If a fetch is already in progress for this path, or if content is already loaded, do nothing.
    if (fetchPromises[path] || fileState.finalContent) {
      return;
    }

    fileState.isLoading = true;

    const fetchPromise = (async () => {
      try {
        const res = await readFile(path);
        const currentState = fileChangesState.files[path]!;
        if (res.success) {
          const finalContent = res.data.content;
          currentState.finalContent = finalContent;
          // By the time this resolves, more edits may have been registered.
          // We use the latest list of edits from the state to ensure correctness.
          currentState.originalContent = calculateOriginalContent(
            finalContent,
            currentState.edits,
          );
        } else {
          currentState.error = res.error || 'Failed to read file';
        }
      } catch (e: any) {
        const currentState = fileChangesState.files[path]!;
        currentState.error = e.message || 'Unknown error';
      } finally {
        const currentState = fileChangesState.files[path]!;
        currentState.isLoading = false;
        delete fetchPromises[path];
      }
    })();

    fetchPromises[path] = fetchPromise;
  },

  updateFileContent: async (path: string, newContent: string) => {
    const fileState = fileChangesState.files[path];
    if (!fileState) {
      console.error('File state not found for path:', path);
      return;
    }

    // When the user manually edits and saves, the previous "original" and "final"
    // distinction for the automated tools becomes the new baseline.
    fileState.originalContent = fileState.finalContent;
    fileState.finalContent = newContent;

    // The granular tool edits are now void, as the user has taken over.
    fileState.edits = [];

    // Persist the user's changes to the backend.
    await editFile(path, newContent);
  },
};
