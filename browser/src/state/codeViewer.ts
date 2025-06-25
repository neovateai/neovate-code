import { proxy } from 'valtio';
import i18n from '@/i18n';
import type { CodeViewerLanguage, CodeViewerTabItem } from '@/types/codeViewer';

interface CodeViewerState {
  visible: boolean;
  activeId: string | undefined;
  codeViewerTabItems: CodeViewerTabItem[];
}

export const state = proxy<CodeViewerState>({
  visible: false,
  activeId: undefined,
  codeViewerTabItems: [],
});

export const actions = {
  setActiveId: (activeId: string) => {
    state.activeId = activeId;
  },
  removeItem: (id: string) => {
    const nextItems = state.codeViewerTabItems.filter((item) => item.id !== id);

    if (nextItems.length === 0) {
      state.visible = false;
    }

    state.codeViewerTabItems = nextItems;
  },

  displayNormalViewer: ({
    language,
    code,
    path,
  }: {
    language?: CodeViewerLanguage;
    code: string;
    /** 文件路径，默认作为key使用 */
    path?: string;
  }) => {
    if (path) {
      const remainingItem = state.codeViewerTabItems.find(
        (item) => item.id === path,
      );

      if (remainingItem) {
        state.activeId = remainingItem.id;
        return;
      }
    }

    const id = path || Date.now().toString();
    const title = path || i18n.t('codeViewer.tempFile');

    state.codeViewerTabItems.push({
      title,
      language,
      code,
      id,
      viewType: 'normal',
    });

    state.activeId = id;
    state.visible = true;
  },
};
