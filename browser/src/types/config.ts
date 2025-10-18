export type ApprovalMode = 'default' | 'autoEdit' | 'yolo';

export type CommitConfig = {
  language: string;
};

export type McpStdioServerConfig = {
  type: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
  disable?: boolean;
};
export type McpSSEServerConfig = {
  type: 'sse';
  url: string;
  disable?: boolean;
  headers?: Record<string, string>;
};
export type McpHttpServerConfig = {
  type: 'http';
  url: string;
  disable?: boolean;
  headers?: Record<string, string>;
};
export type McpServerConfig =
  | McpStdioServerConfig
  | McpSSEServerConfig
  | McpHttpServerConfig;

export interface ProviderConfig {
  id: string;
  env: string[];
  name: string;
  apiEnv?: string[];
  api?: string;
  doc: string;
  models: Record<string, any>;
  options?: {
    baseURL?: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
}

export type Config = {
  model: string;
  planModel: string;
  language: string;
  quiet: boolean;
  approvalMode: ApprovalMode;
  plugins: string[];
  mcpServers: Record<string, McpServerConfig>;
  provider?: Record<string, ProviderConfig>;
  systemPrompt?: string;
  todo?: boolean;
  /**
   * Controls whether automatic conversation compression is enabled.
   * When set to false, conversation history will accumulate and context limit will be exceeded.
   *
   * @default true
   */
  autoCompact?: boolean;
  commit?: CommitConfig;
  outputStyle?: string;
  outputFormat?: 'text' | 'stream-json' | 'json';
  autoUpdate?: boolean;
  browser?: boolean;
};
