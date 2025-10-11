import { proxy } from 'valtio';
import {
  getAvailableModels,
  getAvailablePlugins,
  getEffectiveSettings,
  getSettings,
  removeSetting,
  setSetting,
} from '@/api/settings';
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
        getSettings('global'),
        getSettings('project'),
        getEffectiveSettings(),
        getAvailableModels(),
        getAvailablePlugins(),
      ]);

      state.settings.globalSettings = globalResponse.data || {};
      state.settings.projectSettings = projectResponse.data || {};
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
      state.settings.availableModels = modelsResponse.data || [];
      state.settings.availablePlugins = pluginsResponse.data || [];
      state.settings.loading = false;
      state.settings.loaded = true;
      state.settings.hasUnsavedChanges = false;
    } catch (error) {
      console.error('Failed to load settings:', error);
      state.settings.loading = false;
      state.settings.loaded = false;
    }
  },

  // Update setting value (local only, no API call)
  updateSettingValue: (
    key: keyof AppSettings,
    value: AppSettings[keyof AppSettings],
  ) => {
    const { currentScope } = state.settings;

    // Update local state only
    if (currentScope === 'global') {
      if (value === null || value === undefined || value === '') {
        const { [key]: removed, ...rest } = state.settings.globalSettings;
        state.settings.globalSettings = rest;
      } else {
        state.settings.globalSettings = {
          ...state.settings.globalSettings,
          [key]: value,
        };
      }
    } else {
      if (value === null || value === undefined || value === '') {
        const { [key]: removed, ...rest } = state.settings.projectSettings;
        state.settings.projectSettings = rest;
      } else {
        state.settings.projectSettings = {
          ...state.settings.projectSettings,
          [key]: value,
        };
      }
    }

    // Mark as having unsaved changes
    state.settings.hasUnsavedChanges = true;
  },

  // Save current settings to server
  saveAllSettings: async () => {
    const { currentScope } = state.settings;
    const settingsToSave =
      currentScope === 'global'
        ? state.settings.globalSettings
        : state.settings.projectSettings;

    try {
      // Get current server settings first
      const currentServerSettings = await getSettings(currentScope);
      const serverSettings = currentServerSettings.data || {};

      // Find keys to delete (exist on server but not in local)
      const keysToDelete = Object.keys(serverSettings).filter(
        (key) => !(key in settingsToSave),
      );

      // Delete missing settings
      for (const key of keysToDelete) {
        await removeSetting(currentScope, key);
      }

      // Save existing settings
      for (const [key, value] of Object.entries(settingsToSave)) {
        if (value === null || value === undefined || value === '') {
          await removeSetting(currentScope, key);
        } else {
          await setSetting(currentScope, key, value);
        }
      }

      // Reload settings to ensure state sync
      await actions.loadSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
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
        await setSetting(currentScope, 'plugins', newPlugins);

        // Reload effective settings
        const effectiveResponse = await getEffectiveSettings();
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
        await removeSetting(currentScope, 'plugins');
      } else {
        await setSetting(currentScope, 'plugins', newPlugins);
      }

      // Reload effective settings
      const effectiveResponse = await getEffectiveSettings();
      state.settings.effectiveSettings =
        effectiveResponse.data || state.settings.effectiveSettings;
    } catch (error) {
      console.error('Failed to remove plugin:', error);
      throw error;
    }
  },
};
