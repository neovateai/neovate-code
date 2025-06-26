export interface AppSettings {
  model?: string;
  smallModel?: string;
  planModel?: string;
  language: string;
  quiet: boolean;
  approvalMode: 'suggest' | 'auto-edit' | 'full-auto';
  plugins: string[];
}

export interface SettingsScope {
  type: 'global' | 'project';
  label: string;
  path: string;
}

export interface ModelOption {
  key: string;
  value: string;
}

export interface SettingsState {
  // 当前配置作用域
  currentScope: 'global' | 'project';
  // 配置数据
  globalSettings: Partial<AppSettings>;
  projectSettings: Partial<AppSettings>;
  // 合并后的有效配置
  effectiveSettings: AppSettings;
  // 可用模型列表
  availableModels: ModelOption[];
  // 可用插件列表
  availablePlugins: string[];
  // 加载状态
  loading: boolean;
  loaded: boolean;
  // 是否有未保存的更改
  hasUnsavedChanges: boolean;
}

export interface SettingsResponse {
  success: boolean;
  data?: any;
  error?: string;
}
