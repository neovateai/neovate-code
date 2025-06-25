import { request } from '@/utils/request';
import type {
  AppSettings,
  ModelOption,
  SettingsResponse,
} from '../types/settings';
import type { ApiResponse } from './model';

export interface SettingsAPI {
  // 获取设置
  getSettings: (
    scope: 'global' | 'project',
  ) => Promise<ApiResponse<Partial<AppSettings>>>;
  // 设置配置
  setSetting: (
    scope: 'global' | 'project',
    key: string,
    value: any,
  ) => Promise<ApiResponse<SettingsResponse>>;
  // 批量更新设置
  updateSettings: (
    scope: 'global' | 'project',
    settings: Partial<AppSettings>,
  ) => Promise<ApiResponse<SettingsResponse>>;
  // 删除配置项
  removeSetting: (
    scope: 'global' | 'project',
    key: string,
  ) => Promise<ApiResponse<SettingsResponse>>;
  // 获取有效设置（合并后）
  getEffectiveSettings: () => Promise<ApiResponse<AppSettings>>;
  // 获取可用模型列表
  getAvailableModels: () => Promise<ApiResponse<ModelOption[]>>;
  // 获取可用插件列表
  getAvailablePlugins: () => Promise<ApiResponse<string[]>>;
  // 重置设置
  resetSettings: (
    scope: 'global' | 'project',
  ) => Promise<ApiResponse<SettingsResponse>>;
  // 导出设置
  exportSettings: (scope: 'global' | 'project') => Promise<ApiResponse<string>>;
  // 导入设置
  importSettings: (
    scope: 'global' | 'project',
    settingsJson: string,
  ) => Promise<ApiResponse<SettingsResponse>>;
}

// 实现API接口
export const settingsAPI: SettingsAPI = {
  getSettings: (scope) => {
    return request.get(`/settings?scope=${scope}`);
  },

  setSetting: (scope, key, value) => {
    return request.post('/settings', { scope, key, value });
  },

  updateSettings: (scope, settings) => {
    return request.post('/settings/batch', { scope, settings });
  },

  removeSetting: (scope, key) => {
    return request.delete(`/settings?scope=${scope}&key=${key}`);
  },

  getEffectiveSettings: () => {
    return request.get('/settings/effective');
  },

  getAvailableModels: () => {
    return request.get('/settings/models');
  },

  getAvailablePlugins: () => {
    return request.get('/settings/plugins');
  },

  resetSettings: (scope) => {
    return request.post('/settings/reset', { scope });
  },

  exportSettings: (scope) => {
    return request.get(`/settings/export?scope=${scope}`);
  },

  importSettings: (scope, settingsJson) => {
    return request.post('/settings/import', { scope, settings: settingsJson });
  },
};
