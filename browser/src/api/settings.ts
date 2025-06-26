import { request } from '@/utils/request';
import type {
  AppSettings,
  ModelOption,
  SettingsResponse,
} from '../types/settings';
import type { ApiResponse } from './model';

// Get settings
export const getSettings = (
  scope: 'global' | 'project',
): Promise<ApiResponse<Partial<AppSettings>>> => {
  return request.get(`/settings?scope=${scope}`);
};

// Set configuration
export const setSetting = (
  scope: 'global' | 'project',
  key: string,
  value: any,
): Promise<ApiResponse<SettingsResponse>> => {
  return request.post('/settings', { scope, key, value });
};

// Batch update settings
export const updateSettings = (
  scope: 'global' | 'project',
  settings: Partial<AppSettings>,
): Promise<ApiResponse<SettingsResponse>> => {
  return request.post('/settings/batch', { scope, settings });
};

// Delete configuration item
export const removeSetting = (
  scope: 'global' | 'project',
  key: string,
): Promise<ApiResponse<SettingsResponse>> => {
  return request.delete(`/settings?scope=${scope}&key=${key}`);
};

// Get effective settings (merged)
export const getEffectiveSettings = (): Promise<ApiResponse<AppSettings>> => {
  return request.get('/settings/effective');
};

// Get available models list
export const getAvailableModels = (): Promise<ApiResponse<ModelOption[]>> => {
  return request.get('/settings/models');
};

// Get available plugins list
export const getAvailablePlugins = (): Promise<ApiResponse<string[]>> => {
  return request.get('/settings/plugins');
};

// Reset settings
export const resetSettings = (
  scope: 'global' | 'project',
): Promise<ApiResponse<SettingsResponse>> => {
  return request.post('/settings/reset', { scope });
};

// Export settings
export const exportSettings = (
  scope: 'global' | 'project',
): Promise<ApiResponse<string>> => {
  return request.get(`/settings/export?scope=${scope}`);
};

// Import settings
export const importSettings = (
  scope: 'global' | 'project',
  settingsJson: string,
): Promise<ApiResponse<SettingsResponse>> => {
  return request.post('/settings/import', { scope, settings: settingsJson });
};
