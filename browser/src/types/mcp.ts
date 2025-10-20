import { type McpServerItemConfig } from '@/state/mcp';
export interface McpManagerServer {
  key: string;
  name: string;
  scope: 'global' | 'project';
  command?: string;
  args?: string[];
  url?: string;
  type?: 'sse' | 'stdio';
  env?: Record<string, string>;
  installed: boolean;
  isPreset?: boolean;
}

// JSON configuration format for adding services
export interface JsonConfigFormat {
  mcpServers?: Record<string, McpServerItemConfig>;
  name?: string;
  command?: string;
  args?: string[];
  url?: string;
  transport?: 'sse' | 'stdio';
  env?: Record<string, string>;
}

// Form values for adding MCP services
export interface FormValues {
  jsonConfig?: string;
  name?: string;
  command?: string;
  args?: string;
  url?: string;
  transport?: 'sse' | 'stdio';
  env?: string;
}

export interface McpManagerProps {
  visible: boolean;
  onClose: () => void;
}

// MCP server scope type
export type McpServerScope = 'global' | 'project';

// MCP transport type
export type McpTransportType = 'sse' | 'stdio';

// API Response types
export interface McpServersResponse {
  success: true;
  servers: Record<string, McpServerItemConfig>;
  scope: 'global' | 'project';
}

export interface McpServerResponse {
  success: true;
  server: McpServerItemConfig;
  name: string;
}

export interface McpOperationResponse {
  success: true;
  message: string;
  server?: McpServerItemConfig;
}

// API Request types
export interface AddMcpServerRequest {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  transport?: string;
  env?: string;
  global?: boolean;
}

export interface UpdateMcpServerRequest {
  command?: string;
  args?: string[];
  url?: string;
  transport?: string;
  env?: string;
  global?: boolean;
}

// Hook types
export interface UseMcpServerLoaderOptions {
  onLoadError?: (error: Error) => void;
  onToggleError?: (error: Error, serverName: string) => void;
}

export interface UseMcpServerLoaderReturn {
  // Common state
  loading: boolean;

  // For McpDropdown
  mcpServers: McpServerItemConfig[];
  loadMcpServers: () => Promise<void>;
  handleToggleEnabled: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => Promise<void>;
  handleQuickAdd: (service: McpServerItemConfig) => Promise<void>;

  // For McpManager
  managerServers: McpManagerServer[];
  loadServers: () => Promise<void>;
  handleToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => Promise<void>;
  handleEditServer: (
    originalName: string,
    originalScope: string,
    newConfig: {
      name: string;
      command?: string;
      args?: string[];
      url?: string;
      transport?: string;
      env?: string;
      global?: boolean;
    },
  ) => Promise<void>;
  handleDeleteLocal: (serverName: string, scope: string) => void;
}

export interface UseMcpServicesOptions {
  onLoadError?: (error: Error) => void;
  onToggleError?: (error: Error, serverName: string) => void;
}

export interface UseMcpServicesReturn {
  allKnownServices: Set<string>;
  serviceConfigs: Map<string, McpServerItemConfig>;
  updateKnownServices: (newServices: Set<string>) => void;
  updateServiceConfigs: (newConfigs: Map<string, McpServerItemConfig>) => void;
  loadMcpData: () => Promise<{
    globalServers: Record<string, unknown>;
    projectServers: Record<string, unknown>;
  }>;
  handleToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
    onSuccess?: () => void | Promise<void>,
  ) => Promise<void>;
  initializeFromLocalStorage: () => {
    knownServices: Set<string>;
    configs: Map<string, McpServerItemConfig>;
  };
}

export interface McpServiceItemProps {
  server: McpServerItemConfig;
  onToggle: (serverName: string, enabled: boolean, scope: string) => void;
}

export interface McpServerTableProps {
  servers: McpManagerServer[];
  loading: boolean;
  onToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => void;
  onDeleteSuccess?: () => void;
  onDeleteLocal?: (serverName: string, scope: string) => void;
  onEditServer?: (server: McpManagerServer) => void;
}

export interface McpAddFormProps {
  visible: boolean;
  inputMode: 'json' | 'form';
  addScope: 'global' | 'project';
  onCancel: () => void;
  onSuccess: () => void;
  onInputModeChange: (mode: 'json' | 'form') => void;
  onScopeChange: (scope: 'global' | 'project') => void;
  editMode?: boolean;
  editingServer?: McpManagerServer;
  onEditServer?: (
    originalName: string,
    originalScope: string,
    newConfig: {
      name: string;
      command?: string;
      args?: string[];
      url?: string;
      transport?: string;
      env?: string;
      global?: boolean;
    },
  ) => Promise<void>;
}

export interface McpEditFormProps {
  visible: boolean;
  inputMode: 'json' | 'form';
  editScope: 'global' | 'project';
  editingServer: McpManagerServer;
  onCancel: () => void;
  onSuccess: () => void;
  onInputModeChange: (mode: 'json' | 'form') => void;
  onScopeChange: (scope: 'global' | 'project') => void;
}

// MCP configuration item for add form
export interface McpConfigItem {
  id: string;
  scope: 'global' | 'project';
  inputMode: 'json' | 'form';
  name: string;
  transport: string;
  command?: string;
  args?: string;
  url?: string;
  env?: string;
  jsonConfig?: string;
}

// MCP JSON Editor component props
export interface McpJsonEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: string;
  disabled?: boolean;
}
