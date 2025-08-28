/**
 * MCP (Message Control Protocol) related type definitions
 */

// Basic MCP server configuration
export interface McpServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  type?: 'sse' | 'stdio';
  env?: Record<string, string>;
  scope?: 'global' | 'project';
}

// MCP server instance for dropdown component
export interface McpServer {
  key: string;
  name: string;
  config: McpServerConfig;
  installed: boolean;
  scope: 'global' | 'project';
}

// MCP server instance for manager component
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
}

// Preset MCP service configuration
export interface PresetMcpService {
  key: string;
  name: string;
  description: string;
  config: {
    name: string;
    command: string;
    args: string[];
  };
}

// JSON configuration format for adding services
export interface JsonConfigFormat {
  mcpServers?: Record<string, McpServerConfig>;
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

// Component props
export interface McpDropdownProps {
  loading?: boolean;
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
  servers: Record<string, McpServerConfig>;
  scope: 'global' | 'project';
}

export interface McpServerResponse {
  success: true;
  server: McpServerConfig;
  name: string;
}

export interface McpOperationResponse {
  success: true;
  message: string;
  server?: McpServerConfig;
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
  mcpServers: McpServer[];
  loadMcpServers: () => Promise<void>;
  handleToggleEnabled: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => Promise<void>;
  handleQuickAdd: (service: PresetMcpService) => Promise<void>;

  // For McpManager
  managerServers: McpManagerServer[];
  loadServers: () => Promise<void>;
  handleToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => Promise<void>;
}

export interface UseMcpServicesOptions {
  onLoadError?: (error: Error) => void;
  onToggleError?: (error: Error, serverName: string) => void;
}

export interface UseMcpServicesReturn {
  allKnownServices: Set<string>;
  serviceConfigs: Map<string, McpServerConfig>;
  updateKnownServices: (newServices: Set<string>) => void;
  updateServiceConfigs: (newConfigs: Map<string, McpServerConfig>) => void;
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
    configs: Map<string, McpServerConfig>;
  };
}

// Component Props types
export interface McpDropdownContentProps {
  mcpServers: McpServer[];
  presetMcpServices: PresetMcpService[];
  onToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => void;
  onQuickAdd: (service: PresetMcpService) => void;
  onOpenManager: () => void;
}

export interface McpServiceItemProps {
  server: McpServer;
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
}

export interface McpAddFormProps {
  visible: boolean;
  inputMode: 'json' | 'form';
  addScope: 'global' | 'project';
  onCancel: () => void;
  onSuccess: () => void;
  onInputModeChange: (mode: 'json' | 'form') => void;
  onScopeChange: (scope: 'global' | 'project') => void;
}
