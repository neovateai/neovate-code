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
  // 重要提示：后端按顺序应用编辑。为了获得原始内容，
  // 我们必须按照执行顺序的相反顺序来反向应用它们。
  return edits.reduceRight(
    (content, edit) => content.replace(edit.new_string, edit.old_string),
    finalContent,
  );
};

// 此映射保存每个文件路径正在进行的获取操作的 Promise。
// 它可以防止多个组件触发相同获取操作时可能出现的竞态条件。
const fetchPromises: Record<string, Promise<void>> = {};

export const fileChangesActions = {
  registerEdit: (path: string, edit: FileEdit) => {
    let fileState = fileChangesState.files[path];

    if (!fileState) {
      fileState = proxy<FileState>({ path, isLoading: false, edits: [] });
      fileChangesState.files[path] = fileState;
    }

    // 如果此文件尚未注册此编辑，则添加新编辑。
    if (!fileState.edits.some((e) => e.toolCallId === edit.toolCallId)) {
      fileState.edits.push(edit);
      // 如果内容已加载，我们必须重新计算原始内容，
      // 因为 diff 的基础现在已随新编辑而更改。
      if (fileState.finalContent) {
        fileState.originalContent = calculateOriginalContent(
          fileState.finalContent,
          fileState.edits,
        );
      }
    }

    // 始终获取最新内容以确保差异的准确性。
    // 这可以避免在后端编辑完成之前读取文件而导致的竞态条件。
    fileState.isLoading = true;

    const fetchPromise = (async () => {
      try {
        const res = await readFile(path);
        const currentState = fileChangesState.files[path]!;
        if (res.success) {
          const finalContent = res.data.content;
          currentState.finalContent = finalContent;
          // 当此 Promise 解析时，可能已经注册了更多的编辑。
          // 我们使用状态中最新的编辑列表来确保正确性。
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

    // 首先将用户的更改持久化到后端。
    await editFile(path, newContent);

    // 成功持久化后，更新状态。
    // 用户手动保存的内容将成为新的"最终"状态。
    fileState.finalContent = newContent;

    // 细粒度的工具编辑现在已失效，因为用户已接管。
    // 未来任何 diff 的"原始"内容都应基于此新状态。
    fileState.originalContent = newContent;
    fileState.edits = [];
  },
};
