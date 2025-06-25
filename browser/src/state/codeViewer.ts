import { proxy } from 'valtio';
import type { CodeViewerTabItem } from '@/types/codeViewer';

interface CodeViewerState {
  visible: boolean;
  activeId: number | null;
  codeViewerTabItems: CodeViewerTabItem[];
}

export const state = proxy<CodeViewerState>({
  visible: true,
  activeId: null,
  codeViewerTabItems: [
    {
      viewType: 'normal',
      id: 1,
      title: 'Code Normal View',
      language: 'typescript',
      code: 'console.log("Hello, world!");',
    },
  ],
});

export const actions = {};
