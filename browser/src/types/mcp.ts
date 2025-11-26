import type { McpServerItemConfig } from '@/state/mcp';

export interface McpServerWithStatus {
  config: McpServerItemConfig;
  status: 'pending' | 'connecting' | 'connected' | 'failed' | 'disconnected';
  error?: string;
  toolCount: number;
  tools: string[];
  scope: 'project' | 'global';
}

export interface McpManagerData {
  projectServers: Record<string, McpServerItemConfig>;
  globalServers: Record<string, McpServerItemConfig>;
  activeServers: Record<string, McpServerWithStatus>;
  projectConfigPath: string;
  globalConfigPath: string;
  isReady: boolean;
  isLoading: boolean;
}

export interface McpScope {
  scope: 'project' | 'global';
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

export interface McpServiceItemProps {
  server: McpServerItemConfig;
  onToggle: (serverName: string, enabled: boolean, scope: string) => void;
}

// MCP configuration item for add form
export interface McpConfigItem {
  id: string;
  scope: 'global' | 'project';
  inputMode: 'json' | 'form';
  name: string;
  type: string;
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
