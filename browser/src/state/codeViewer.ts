import { proxy } from 'valtio';
import type { CodeViewerTabItem } from '@/types/codeViewer';

interface CodeViewerState {
  visible: boolean;
  activeId: string | undefined;
  codeViewerTabItems: CodeViewerTabItem[];
}

export const state = proxy<CodeViewerState>({
  visible: true,
  activeId: undefined,
  codeViewerTabItems: [
    {
      viewType: 'normal',
      id: '1',
      title: 'Code Normal View',
      language: 'typescript',
      code: 'console.log("Hello, world!");',
    },
    {
      viewType: 'normal',
      id: '2',
      title: '666',
      language: 'markdown',
      code: '**Header**',
    },
  ],
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
};
