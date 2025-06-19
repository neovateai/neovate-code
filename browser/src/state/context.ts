import { proxy } from 'valtio';
import type { ContextStoreValue, FileItem } from '@/api/model';
import { ContextType } from '@/constants/context';
import * as sender from '@/state/sender';
import type { ContextItem } from '@/types/context';

interface ContextState {
  editorContexts: ContextItem[];
  selectContexts: ContextItem[];
  editorContextMap: Map<string, ContextStoreValue>;
  selectContextMap: Map<string, ContextStoreValue>;
  contexts: {
    files: Omit<FileItem, 'name'>[];
  };

  contextItems: ContextItem[];

  contextsSelectedValues: string[];
}

export const state = proxy<ContextState>({
  editorContexts: [],
  selectContexts: [],
  editorContextMap: new Map(),
  selectContextMap: new Map(),

  get contextItems() {
    // 根据value去重
    return [...this.editorContexts, ...this.selectContexts].reduce(
      (acc, cur) => {
        if (!acc.some((item: ContextItem) => item.value === cur.value)) {
          acc.push(cur);
        }
        return acc;
      },
      [] as ContextItem[],
    );
  },

  get contextsSelectedValues() {
    return this.contextItems.map((item: ContextItem) => item.displayText);
  },
  get contexts() {
    const files = this.contextItems
      .filter(
        (contextItem: ContextItem) => contextItem.type === ContextType.FILE,
      )
      .map((contextItem: ContextItem) => {
        const file =
          this.editorContextMap.get(contextItem.value) ||
          this.selectContextMap.get(contextItem.value);
        if (!file) {
          return null;
        }

        return {
          path: file.path,
          type: file.type,
        };
      })
      .filter(Boolean);

    return {
      files,
    };
  },
});

// TODO 知识库限制1个

export const actions = {
  // ========Select Contexts========
  /** 从上下文选择器添加新的上下文 */
  addSelectContext: (contextItem: ContextItem, context: ContextStoreValue) => {
    // 去重，合并后的上下文中，已经存在的不添加
    if (state.contextItems.some((item) => item.value === contextItem.value)) {
      return;
    }
    state.selectContextMap.set(contextItem.value, context);
    state.selectContexts.push(contextItem);
  },

  /** 删除来自上下文选择器的上下文 */
  removeSelectContext: (value: string) => {
    state.selectContexts = state.selectContexts.filter(
      (item) => item.value !== value,
    );
    // change prompt and editorContexts will auto update
    const nextPrompt = sender.state.prompt.replaceAll(value, '');
    sender.actions.updatePrompt(nextPrompt);
    // remove map value
    state.selectContextMap.delete(value);
  },

  // ========Editor Contexts========
  /** 删除来自编辑器的上下文 */
  removeEditorContext: (value: string) => {
    // change prompt and editorContexts will auto update
    const nextPrompt = sender.state.prompt.replaceAll(value, '');
    sender.actions.updatePrompt(nextPrompt);
    // remove map value
    state.editorContextMap.delete(value);
  },

  /**
   * 添加来自编辑器的上下文
   *
   * 仅添加Map，ContextItem会通过updateEditorContext更新
   *
   */
  addEditorContext: (contextItem: ContextItem, context: ContextStoreValue) => {
    if (state.editorContexts.some((item) => item.value === contextItem.value)) {
      return;
    }
    state.editorContextMap.set(contextItem.value, context);
  },

  /**
   * 更新来自编辑器的上下文
   *
   * 不添加Map，只更新ContextItem
   *
   * 如果去重后的ContextItem中，Item被删除，会自动删除对应的Map值
   */
  updateEditorContext: (nextContextItems: ContextItem[]) => {
    const nextEditorContext: ContextItem[] = [];

    for (const nextContextItem of nextContextItems) {
      if (
        // 如果通过直接选择的上下文已经包含，那么不再添加
        !state.selectContexts.some(
          (item) => item.value === nextContextItem.value,
        ) &&
        // 对下一批Context的上下文进行去重
        !nextEditorContext.some((item) => item.value === nextContextItem.value)
      ) {
        nextEditorContext.push(nextContextItem);
      }
    }

    const prevEditorContext = state.editorContexts;

    for (const prevContextItem of prevEditorContext) {
      if (
        // 如果编辑器中原有的上下文被删除，那么删除对应的Map值
        !nextEditorContext.some((item) => item.value === prevContextItem.value)
      ) {
        state.editorContextMap.delete(prevContextItem.value);
      }
    }

    state.editorContexts = nextEditorContext;
  },

  // =======Other========
  /** 管理发送prompt后的状态 */
  afterSend: () => {
    state.editorContextMap.clear();
    state.editorContexts = [];
  },
};
