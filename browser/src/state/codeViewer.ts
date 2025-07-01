import { proxy } from 'valtio';
import i18n from '@/i18n';
import type {
  CodeNormalViewerMode,
  CodeViewerLanguage,
  CodeViewerTabItem,
  DiffStat,
} from '@/types/codeViewer';
import { inferFileType } from '@/utils/codeViewer';

interface CodeViewerState {
  visible: boolean;
  activeId: string | undefined;
  codeViewerTabItems: CodeViewerTabItem[];
  jumpFunctionMap: { [path: string]: ((_: number) => void) | undefined };
}

interface DisplayNormalViewerConfigs {
  /** 如果为空但传入了path，会尝试使用path的后缀推断 */
  language?: CodeViewerLanguage;
  code: string;
  /** 文件路径，默认作为key使用 */
  path?: string;
  mode?: CodeNormalViewerMode;
}

interface DisplayDiffViewerConfigs {
  language?: CodeViewerLanguage;
  originalCode: string;
  modifiedCode: string;
  diffStat?: DiffStat;
  path?: string;
  hideDiffActions?: boolean;
}

export const state = proxy<CodeViewerState>({
  visible: false,
  activeId: undefined,
  codeViewerTabItems: [],
  jumpFunctionMap: {},
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

  updateNormalViewerConfig: async (
    configs:
      | DisplayNormalViewerConfigs
      | (() => Promise<DisplayNormalViewerConfigs>),
  ) => {
    const targetConfigs =
      typeof configs === 'function' ? await configs() : configs;

    const { language, code, path, mode } = targetConfigs;

    const id = path || Date.now().toString();

    const title = path || i18n.t('codeViewer.tempFile');

    const targetLanguage = language || inferFileType(path);

    let reuseTab = false;
    state.codeViewerTabItems = state.codeViewerTabItems.map((item) => {
      if (item.id === id) {
        reuseTab = true;
        return {
          title,
          language: targetLanguage,
          code,
          id,
          viewType: 'normal',
          path,
          mode,
        };
      } else {
        return item;
      }
    });

    if (!reuseTab) {
      state.codeViewerTabItems.push({
        title,
        language: targetLanguage,
        code,
        id,
        viewType: 'normal',
        path,
        mode,
      });
    }

    state.activeId = id;
  },

  /** 代码有更新后，也需要重新调用一次这个函数刷新展示 */
  updateDiffViewerConfig: (config: DisplayDiffViewerConfigs) => {
    const { path, modifiedCode, originalCode, language, diffStat } = config;

    const id = path || Date.now().toString();

    const title = path || i18n.t('codeViewer.tempFile');

    const targetLanguage = language || inferFileType(path);

    let reuseTab = false;
    // 更新所有满足要求的item
    state.codeViewerTabItems = state.codeViewerTabItems.map((item) => {
      if (item.id === id) {
        reuseTab = true;
        return {
          title,
          language: targetLanguage,
          originalCode,
          modifiedCode,
          id,
          viewType: 'diff',
          path,
          diffStat,
          hideDiffActions: !diffStat?.diffBlockStats.length,
        };
      } else {
        return item;
      }
    });

    if (!reuseTab) {
      state.codeViewerTabItems.push({
        title,
        language: targetLanguage,
        originalCode,
        modifiedCode,
        id,
        viewType: 'diff',
        path,
        diffStat,
        hideDiffActions: !diffStat?.diffBlockStats.length,
      });
    }

    state.activeId = id;
  },

  /**
   * 展示编辑器、打开特定的文件并跳转特定的行，如果是DiffView，则跳转ModifiedModel对应的行
   * @param path 文件路径
   */
  jumpToLine: (path: string, lineCount: number) => {
    const remainingItem = state.codeViewerTabItems.find(
      (item) => item.id === path,
    );

    const jumpFunction = state.jumpFunctionMap[path];

    if (remainingItem && jumpFunction) {
      state.activeId = remainingItem.id;
      state.visible = true;

      jumpFunction(lineCount);
    }
  },

  /** 注册跳转函数 */
  registerJumpFunction: (path: string, fn: (_: number) => void) => {
    state.jumpFunctionMap[path] = fn;
  },
};
