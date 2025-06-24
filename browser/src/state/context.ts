import { proxy } from 'valtio';
import type { FileItem } from '@/api/model';
import { ContextType } from '@/constants/context';
import * as sender from '@/state/sender';
import type { ContextItem } from '@/types/context';

interface ContextState {
  contexts: {
    files: Omit<FileItem, 'name'>[];
  };

  contextItems: ContextItem[];

  contextsSelectedValues: string[];
}

export const state = proxy<ContextState>({
  contextItems: [],

  get contextsSelectedValues() {
    return this.contextItems.map((item: ContextItem) => item.displayText);
  },

  get contexts() {
    const files = this.contextItems
      .filter(
        (contextItem: ContextItem) => contextItem.type === ContextType.FILE,
      )
      .map((contextItem: ContextItem) => {
        const file = contextItem.context as FileItem;

        return {
          path: file.path,
          type: file.type,
        };
      });

    return {
      files,
    };
  },
});

export const actions = {
  /** 从上下文选择器添加新的上下文 */
  addContext: (contextItem: ContextItem) => {
    // 去重，合并后的上下文中，已经存在的不添加
    if (state.contextItems.some((item) => item.value === contextItem.value)) {
      return;
    }

    state.contextItems.push(contextItem);
  },

  /** 删除来自上下文选择器的上下文 */
  removeContext: (value: string) => {
    state.contextItems = state.contextItems.filter(
      (item) => item.value !== value,
    );
    // change prompt and editorContexts will auto update
    // although the contextItem is created by editor
    const nextPrompt = sender.state.prompt.replaceAll(value, '');
    sender.actions.updatePrompt(nextPrompt);
  },
};
