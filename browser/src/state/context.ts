import { proxy } from 'valtio';
import { ContextType } from '@/constants/context';
import * as sender from '@/state/sender';
import type { FileItem, SlashCommand } from '@/types/chat';
import type { ContextItem } from '@/types/context';

interface ContextState {
  contexts: {
    files: Omit<FileItem, 'name'>[];
    slashCommands: Pick<SlashCommand, 'name' | 'description'>[];
  };

  attachedContexts: ContextItem[];

  loading: boolean;
}

export const state = proxy<ContextState>({
  loading: false,

  attachedContexts: [],

  get contexts() {
    const files = this.attachedContexts
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

    const slashCommands = this.attachedContexts
      .filter(
        (contextItem: ContextItem) =>
          contextItem.type === ContextType.SLASH_COMMAND,
      )
      .map((contextItem: ContextItem) => {
        const cmd = contextItem.context as SlashCommand;

        return {
          name: cmd?.name,
          description: cmd?.description,
        };
      });

    return {
      files,
      slashCommands,
    };
  },
});

export const actions = {
  /** 添加新的上下文 */
  addContext: (contextItem: ContextItem) => {
    // 去重，合并后的上下文中，已经存在的不添加
    if (
      state.attachedContexts.some((item) => item.value === contextItem.value)
    ) {
      return;
    }

    state.attachedContexts.push(contextItem);
  },

  /** 删除上下文 */
  removeContext: (value: string) => {
    state.attachedContexts = state.attachedContexts.filter(
      (item) => item.value !== value,
    );
    // change prompt and editorContexts will auto update
    // although the contextItem is created by editor
    const nextPrompt = sender.state.prompt.replaceAll(value, '');
    sender.actions.updatePrompt(nextPrompt);
  },

  setContextLoading: (loading: boolean) => {
    state.loading = loading;
  },
};
