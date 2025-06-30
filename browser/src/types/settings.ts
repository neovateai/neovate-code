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
  // Current configuration scope
  currentScope: 'global' | 'project';
  // Configuration data
  globalSettings: Partial<AppSettings>;
  projectSettings: Partial<AppSettings>;
  // Merged effective configuration
  effectiveSettings: AppSettings;
  // Available models list
  availableModels: ModelOption[];
  // Available plugins list
  availablePlugins: string[];
  // Loading state
  loading: boolean;
  loaded: boolean;
  // Whether there are unsaved changes
  hasUnsavedChanges: boolean;
}

export interface SettingsResponse {
  success: boolean;
  data?: { success: boolean } | AppSettings | string;
  error?: string;
}
