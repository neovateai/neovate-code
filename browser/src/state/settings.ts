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
  // Switch scope
  switchScope: (scope: 'global' | 'project') => {
    state.settings.currentScope = scope;
  },

  // Load settings
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

  // Update setting value (save directly)
  updateSettingValue: async (key: keyof AppSettings, value: any) => {
    const { currentScope } = state.settings;

    // Update local state
    if (currentScope === 'global') {
      if (value === null || value === undefined) {
        // If value is empty, remove the field
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
        // If value is empty, remove the field
        const { [key]: removed, ...rest } = state.settings.projectSettings;
        state.settings.projectSettings = rest;
      } else {
        state.settings.projectSettings = {
          ...state.settings.projectSettings,
          [key]: value,
        };
      }
    }

    // Save directly to server
    try {
      if (value === null || value === undefined) {
        // Remove setting item
        await settingsAPI.removeSetting(currentScope, key);
      } else {
        // Use single setting update instead of batch update
        await settingsAPI.setSetting(currentScope, key, value);
      }

      // Reload effective settings
      const effectiveResponse = await settingsAPI.getEffectiveSettings();
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      // If save fails, consider rolling back local state
    }
  },

  // Add plugin
  addPlugin: async (plugin: string) => {
    const { currentScope } = state.settings;
    const currentPlugins =
      currentScope === 'global'
        ? state.settings.globalSettings.plugins || []
        : state.settings.projectSettings.plugins || [];

    if (!currentPlugins.includes(plugin)) {
      const newPlugins = [...currentPlugins, plugin];

      // Update local state
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

      // Save plugin configuration directly
      try {
        await settingsAPI.setSetting(currentScope, 'plugins', newPlugins);

        // Reload effective settings
        const effectiveResponse = await settingsAPI.getEffectiveSettings();
        state.settings.effectiveSettings =
          effectiveResponse.data || state.settings.effectiveSettings;
      } catch (error) {
        console.error('Failed to add plugin:', error);
        throw error;
      }
    }
  },

  // Remove plugin
  removePlugin: async (plugin: string) => {
    const { currentScope } = state.settings;
    const currentPlugins =
      currentScope === 'global'
        ? state.settings.globalSettings.plugins || []
        : state.settings.projectSettings.plugins || [];

    const newPlugins = currentPlugins.filter((p) => p !== plugin);

    // Update local state
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

    // Save plugin configuration directly
    try {
      if (newPlugins.length === 0) {
        await settingsAPI.removeSetting(currentScope, 'plugins');
      } else {
        await settingsAPI.setSetting(currentScope, 'plugins', newPlugins);
      }

      // Reload effective settings
      const effectiveResponse = await settingsAPI.getEffectiveSettings();
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
    } catch (error) {
      console.error('Failed to remove plugin:', error);
      throw error;
    }
  },
};
