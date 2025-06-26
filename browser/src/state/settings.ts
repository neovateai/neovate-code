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

  // 更新设置值（直接保存）
  updateSettingValue: async (key: keyof AppSettings, value: any) => {
    const { currentScope } = state.settings;

    // 更新本地状态
    if (currentScope === 'global') {
      if (value === null || value === undefined) {
        // 如果值为空，删除该字段
        const { [key]: removed, ...rest } = state.settings.globalSettings;
        state.settings.globalSettings = rest;
      } else {
        state.settings.globalSettings = {
          ...state.settings.globalSettings,
          [key]: value,
        };
      }
    } else {
      if (value === null || value === undefined) {
        // 如果值为空，删除该字段
        const { [key]: removed, ...rest } = state.settings.projectSettings;
        state.settings.projectSettings = rest;
      } else {
        state.settings.projectSettings = {
          ...state.settings.projectSettings,
          [key]: value,
        };
      }
    }

    // 直接保存到服务器
    try {
      if (value === null || value === undefined) {
        // 删除配置项
        await settingsAPI.removeSetting(currentScope, key);
      } else {
        // 使用单个配置项更新，而不是批量更新
        await settingsAPI.setSetting(currentScope, key, value);
      }

      // 重新加载有效配置
      const effectiveResponse = await settingsAPI.getEffectiveSettings();
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      // 如果保存失败，可以考虑回滚本地状态
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
  addPlugin: async (plugin: string) => {
    const { currentScope } = state.settings;
    const currentPlugins =
      currentScope === 'global'
        ? state.settings.globalSettings.plugins || []
        : state.settings.projectSettings.plugins || [];

    if (!currentPlugins.includes(plugin)) {
      const newPlugins = [...currentPlugins, plugin];

      // 更新本地状态
      if (currentScope === 'global') {
        state.settings.globalSettings = {
          ...state.settings.globalSettings,
          plugins: newPlugins,
        };
      } else {
        state.settings.projectSettings = {
          ...state.settings.projectSettings,
          plugins: newPlugins,
        };
      }

      // 直接保存插件配置
      try {
        await settingsAPI.setSetting(currentScope, 'plugins', newPlugins);

        // 重新加载有效配置
        const effectiveResponse = await settingsAPI.getEffectiveSettings();
        state.settings.effectiveSettings =
          effectiveResponse.data || state.settings.effectiveSettings;
      } catch (error) {
        console.error('Failed to add plugin:', error);
        throw error;
      }
    }
  },

  // 删除插件
  removePlugin: async (plugin: string) => {
    const { currentScope } = state.settings;
    const currentPlugins =
      currentScope === 'global'
        ? state.settings.globalSettings.plugins || []
        : state.settings.projectSettings.plugins || [];

    const newPlugins = currentPlugins.filter((p) => p !== plugin);

    // 更新本地状态
    if (currentScope === 'global') {
      if (newPlugins.length === 0) {
        const { plugins: removed, ...rest } = state.settings.globalSettings;
        state.settings.globalSettings = rest;
      } else {
        state.settings.globalSettings = {
          ...state.settings.globalSettings,
          plugins: newPlugins,
        };
      }
    } else {
      if (newPlugins.length === 0) {
        const { plugins: removed, ...rest } = state.settings.projectSettings;
        state.settings.projectSettings = rest;
      } else {
        state.settings.projectSettings = {
          ...state.settings.projectSettings,
          plugins: newPlugins,
        };
      }
    }

    // 直接保存插件配置
    try {
      if (newPlugins.length === 0) {
        await settingsAPI.removeSetting(currentScope, 'plugins');
      } else {
        await settingsAPI.setSetting(currentScope, 'plugins', newPlugins);
      }

      // 重新加载有效配置
      const effectiveResponse = await settingsAPI.getEffectiveSettings();
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
    } catch (error) {
      console.error('Failed to remove plugin:', error);
      throw error;
    }
  },
};
