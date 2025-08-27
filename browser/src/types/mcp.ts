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
