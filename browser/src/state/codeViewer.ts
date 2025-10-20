import { proxy } from 'valtio';
import i18n from '@/i18n';
import type {
  CodeNormalViewerMode,
  CodeViewerLanguage,
  CodeViewerTabItem,
  DiffStat,
} from '@/types/codeViewer';
import { diff, inferFileType } from '@/utils/codeViewer';
import * as layout from './layout';

interface CodeViewerState {
  visible: boolean;
  activeId: string | undefined;
  codeViewerTabItems: CodeViewerTabItem[];
  jumpFunctionMap: { [path: string]: ((_: number) => void) | undefined };
}

interface DisplayNormalViewerConfigs {
  /** If empty but path is provided, will try to infer from path extension */
  language?: CodeViewerLanguage;
  code: string;
  /** File path, used as key by default */
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
    // Auto expand right panel when CodeViewer is shown
    // Auto collapse right panel when CodeViewer is hidden
    layout.actions.setRightPanelExpanded(visible);
  },

  hideDiffActions: (path: string) => {
    const nextItems = state.codeViewerTabItems.map((item) =>
      item.path === path ? { ...item, hideDiffActions: true } : item,
    );

    state.codeViewerTabItems = nextItems;
  },

  setActiveId: (activeId: string) => {
    state.activeId = activeId;
  },

  removeItem: (id: string) => {
    const nextItems = state.codeViewerTabItems.filter((item) => item.id !== id);

    if (nextItems.length === 0) {
      state.visible = false;
      // Auto collapse right panel when there are no more tabs
      layout.actions.setRightPanelExpanded(false);
    } else {
      // TODO: Could be optimized to open the previous tab instead of the first one
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
    // Auto expand and show right panel when opening CodeViewer
    state.visible = true;
    layout.actions.setRightPanelExpanded(true);
  },

  /** Need to call this function again to refresh display after code updates */
  updateDiffViewerConfig: (config: DisplayDiffViewerConfigs) => {
    const { path, modifiedCode, originalCode, language, diffStat } = config;

    const id = path || Date.now().toString();

    const title = path || i18n.t('codeViewer.tempFile');

    const targetLanguage = language || inferFileType(path);

    let reuseTab = false;
    // Update all matching items
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
    // Auto expand and show right panel when opening CodeViewer
    state.visible = true;
    layout.actions.setRightPanelExpanded(true);
  },

  /**
   * Show editor, open specific file and jump to specific line. For DiffView, jump to corresponding line in ModifiedModel
   * @param path File path
   */
  jumpToLine: (path: string, lineCount: number) => {
    const remainingItem = state.codeViewerTabItems.find(
      (item) => item.id === path,
    );

    const jumpFunction = state.jumpFunctionMap[path];

    if (remainingItem && jumpFunction) {
      state.activeId = remainingItem.id;
      state.visible = true;
      // Auto expand right panel when jumping to code line
      layout.actions.setRightPanelExpanded(true);

      jumpFunction(lineCount);
    }
  },

  /** Register jump function */
  registerJumpFunction: (path: string, fn: (_: number) => void) => {
    state.jumpFunctionMap[path] = fn;
  },

  async openCodeViewer(
    path: string,
    originalCode: string,
    modifiedCode: string,
    mode?: CodeNormalViewerMode,
  ) {
    if (mode) {
      this.updateNormalViewerConfig({
        code: mode === 'new' ? modifiedCode : originalCode,
        path,
        mode,
      });
    } else {
      const diffStat = await diff(originalCode, modifiedCode);
      this.updateDiffViewerConfig({
        path,
        originalCode,
        modifiedCode,
        diffStat,
      });
    }
    this.setVisible(true);
  },
};
