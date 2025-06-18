import { proxy } from 'valtio';
import type { FileItem } from '@/api/model';
import { ContextType } from '@/constants/ContextType';
import type { ContextItem } from '@/types/context';

interface ContextState {
  fileList: FileItem[];
  editorContexts: ContextItem[];
  selectContexts: ContextItem[];
  editorContextMap: Map<string, any>;
  selectContextMap: Map<string, any>;

  contexts: {
    files: Omit<FileItem, 'name'>[];
  };
}

export const state = proxy<ContextState>({
  editorContexts: [],
  selectContexts: [],
  editorContextMap: new Map(),
  selectContextMap: new Map(),
  fileList: [],
  get contexts() {
    // 根据value去重
    const mergedContexts = [
      ...this.editorContexts,
      ...this.selectContexts,
    ].reduce((acc, cur) => {
      if (!acc.some((item) => item.value === cur.value)) {
        acc.push(cur);
      }
      return acc;
    }, [] as ContextItem[]);

    const files = mergedContexts
      .filter((contextItem) => contextItem.type === ContextType.FILE)
      .map((contextItem) => ({}));

    return {
      // files: this.fileList.map((file: FileItem) => ({
      //   path: file.path,
      //   type: file.type,
      // })),
      files: [],
    };
  },
});

// TODO 知识库限制1个

export const actions = {
  addEditorContext: (contextItem: ContextItem, context?: any) => {
    // 增加去重
    if (state.editorContexts.some((item) => item.value === contextItem.value)) {
      return;
    }
    state.editorContextMap.set(contextItem.value, context);
    state.editorContexts.push(contextItem);
  },

  addSelectContext: (contextItem: ContextItem, context?: any) => {
    if (state.selectContexts.some((item) => item.value === contextItem.value)) {
      return;
    }
    state.selectContextMap.set(contextItem.value, context);
    state.selectContexts.push(contextItem);
  },

  removeEditorContext: (value: string) => {
    state.editorContexts = state.editorContexts.filter(
      (item) => item.value !== value,
    );
    state.editorContextMap.delete(value);
  },

  removeSelectContext: (value: string) => {
    state.selectContexts = state.selectContexts.filter(
      (item) => item.value !== value,
    );
    state.selectContextMap.delete(value);
  },

  updateEditorContext: (contextItems: ContextItem[]) => {
    state.editorContexts = contextItems;
    state.editorContextMap.clear();
    // TODO context
  },
};
