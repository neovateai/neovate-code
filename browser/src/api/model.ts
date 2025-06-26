export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

export interface ImageItem {
  /** URL or base64 string */
  src: string;
  mime: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface AppData {
  productName: string;
  version: string;
  cwd: string;
  config: Record<string, any>;
}

export interface SettingsAPI {
  // Get settings
  getSettings: (
    scope: 'global' | 'project',
  ) => Promise<ApiResponse<Partial<any>>>;
  // Set configuration
  setSetting: (
    scope: 'global' | 'project',
    key: string,
    value: any,
  ) => Promise<ApiResponse<any>>;
  // Batch update settings
  updateSettings: (
    scope: 'global' | 'project',
    settings: Partial<any>,
  ) => Promise<ApiResponse<any>>;
  // Delete configuration item
  removeSetting: (
    scope: 'global' | 'project',
    key: string,
  ) => Promise<ApiResponse<any>>;
  // Get effective settings (merged)
  getEffectiveSettings: () => Promise<ApiResponse<any>>;
  // Get available models list
  getAvailableModels: () => Promise<ApiResponse<any[]>>;
  // Get available plugins list
  getAvailablePlugins: () => Promise<ApiResponse<string[]>>;
  // Reset settings
  resetSettings: (scope: 'global' | 'project') => Promise<ApiResponse<any>>;
  // Export settings
  exportSettings: (scope: 'global' | 'project') => Promise<ApiResponse<string>>;
  // Import settings
  importSettings: (
    scope: 'global' | 'project',
    settingsJson: string,
  ) => Promise<ApiResponse<any>>;
}
