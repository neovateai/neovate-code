import { proxy } from 'valtio';
import { settingsAPI } from '@/api/settings';
import type { AppSettings, SettingsState } from '../types/settings';

export const state = proxy<{ settings: SettingsState }>({
  settings: {
    currentScope: 'project',
    globalSettings: {},
    projectSettings: {},
    effectiveSettings: {
      language: 'English',
      quiet: false,
      approvalMode: 'suggest',
      plugins: [],
    },
    availableModels: [],
    availablePlugins: [],
    loading: false,
    loaded: false,
    hasUnsavedChanges: false,
  },
});

export const actions = {
  // 切换作用域
  switchScope: (scope: 'global' | 'project') => {
    state.settings.currentScope = scope;
    state.settings.hasUnsavedChanges = false;
  },

  // 加载设置
  loadSettings: async () => {
    if (state.settings.loading) return;

    state.settings.loading = true;
    try {
      const [
        globalResponse,
        projectResponse,
        effectiveResponse,
        modelsResponse,
        pluginsResponse,
      ] = await Promise.all([
        settingsAPI.getSettings('global'),
        settingsAPI.getSettings('project'),
        settingsAPI.getEffectiveSettings(),
        settingsAPI.getAvailableModels(),
        settingsAPI.getAvailablePlugins(),
      ]);

      state.settings.globalSettings = globalResponse.data || {};
      state.settings.projectSettings = projectResponse.data || {};
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
      state.settings.availableModels = modelsResponse.data || [];
      state.settings.availablePlugins = pluginsResponse.data || [];
      state.settings.loading = false;
      state.settings.loaded = true;
    } catch (error) {
      console.error('Failed to load settings:', error);
      state.settings.loading = false;
      throw error;
    }
  },

  // 更新设置值
  updateSettingValue: (key: keyof AppSettings, value: any) => {
    const { currentScope } = state.settings;
    if (currentScope === 'global') {
      state.settings.globalSettings = {
        ...state.settings.globalSettings,
        [key]: value,
      };
    } else {
      state.settings.projectSettings = {
        ...state.settings.projectSettings,
        [key]: value,
      };
    }
    state.settings.hasUnsavedChanges = true;
  },

  // 保存设置
  saveSettings: async () => {
    const { currentScope, globalSettings, projectSettings } = state.settings;
    const settings =
      currentScope === 'global' ? globalSettings : projectSettings;

    try {
      await settingsAPI.updateSettings(currentScope, settings);
      state.settings.hasUnsavedChanges = false;

      // 重新加载有效配置
      const effectiveResponse = await settingsAPI.getEffectiveSettings();
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  // 重置设置
  resetSettings: async () => {
    const { currentScope } = state.settings;
    try {
      await settingsAPI.resetSettings(currentScope);
      await actions.loadSettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  },

  // 导出设置
  exportSettings: async (): Promise<string> => {
    const { currentScope } = state.settings;
    try {
      const response = await settingsAPI.exportSettings(currentScope);
      return response.data || '';
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw error;
    }
  },

  // 导入设置
  importSettings: async (settingsJson: string) => {
    const { currentScope } = state.settings;
    try {
      await settingsAPI.importSettings(currentScope, settingsJson);
      await actions.loadSettings();
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  },

  // 添加插件
  addPlugin: (plugin: string) => {
    const { currentScope } = state.settings;
    const currentPlugins =
      currentScope === 'global'
        ? state.settings.globalSettings.plugins || []
        : state.settings.projectSettings.plugins || [];

    if (!currentPlugins.includes(plugin)) {
      const newPlugins = [...currentPlugins, plugin];
      actions.updateSettingValue('plugins', newPlugins);
    }
  },

  // 删除插件
  removePlugin: (plugin: string) => {
    const { currentScope } = state.settings;
    const currentPlugins =
      currentScope === 'global'
        ? state.settings.globalSettings.plugins || []
        : state.settings.projectSettings.plugins || [];

    const newPlugins = currentPlugins.filter((p) => p !== plugin);
    actions.updateSettingValue('plugins', newPlugins);
  },
};
