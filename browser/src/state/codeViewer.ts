import { proxy } from 'valtio';
import i18n from '@/i18n';
import type {
  CodeViewerLanguage,
  CodeViewerTabItem,
  DiffStat,
} from '@/types/codeViewer';
import { inferFileType } from '@/utils/codeViewer';

interface CodeViewerState {
  visible: boolean;
  activeId: string | undefined;
  codeViewerTabItems: CodeViewerTabItem[];
}

interface DisplayNormalViewerConfigs {
  /** 如果为空但传入了path，会尝试使用path的后缀推断 */
  language?: CodeViewerLanguage;
  code: string;
  /** 文件路径，默认作为key使用 */
  path?: string;
}

interface DisplayDiffViewerConfigs {
  language?: CodeViewerLanguage;
  originalCode: string;
  modifiedCode: string;
  diffStat?: DiffStat;
  path?: string;
}

export const state = proxy<CodeViewerState>({
  visible: false,
  activeId: undefined,
  codeViewerTabItems: [],
});

export const actions = {
  setVisible: (visible: boolean) => {
    state.visible = visible;
  },

  setActiveId: (activeId: string) => {
    state.activeId = activeId;
  },

  removeItem: (id: string) => {
    const nextItems = state.codeViewerTabItems.filter((item) => item.id !== id);

    if (nextItems.length === 0) {
      state.visible = false;
    } else {
      // TODO 可以优化成打开上一个而不是第一个
      const nextActiveId = nextItems[0].id;
      state.activeId = nextActiveId;
    }

    state.codeViewerTabItems = nextItems;
  },

  displayNormalViewer: async (
    configs:
      | DisplayNormalViewerConfigs
      | (() => Promise<DisplayNormalViewerConfigs>),
  ) => {
    const targetConfigs =
      typeof configs === 'function' ? await configs() : configs;

    const { language, code, path } = targetConfigs;

    const id = path || Date.now().toString();

    const remainingItem = state.codeViewerTabItems.find(
      (item) => item.id === path,
    );

    if (remainingItem) {
      state.activeId = remainingItem.id;
    } else {
      const title = path || i18n.t('codeViewer.tempFile');

      const targetLanguage = language || inferFileType(path);

      state.codeViewerTabItems.push({
        title,
        language: targetLanguage,
        code,
        id,
        viewType: 'normal',
        path,
      });

      state.activeId = id;
    }

    state.visible = true;
  },

  displayDiffViewer: (config: DisplayDiffViewerConfigs) => {
    const { path, modifiedCode, originalCode, language, diffStat } = config;

    const id = path || Date.now().toString();

    const remainingItem = state.codeViewerTabItems.find(
      (item) => item.id === path,
    );

    if (remainingItem) {
      state.activeId = remainingItem.id;
    } else {
      const title = path || i18n.t('codeViewer.tempFile');

      const targetLanguage = language || inferFileType(path);

      state.codeViewerTabItems.push({
        title,
        language: targetLanguage,
        originalCode,
        modifiedCode,
        id,
        viewType: 'diff',
        path,
        diffStat,
      });

      state.activeId = id;
    }

    state.visible = true;
  },
};
