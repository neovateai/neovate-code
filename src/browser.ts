import { join } from 'pathe';
import { isLocal } from './utils/isLocal';
import type { McpServerConfig } from './config';

export type BrowserConfig = {
  browser: boolean;
};

export function getChromeDevToolsMcpServerConfig(): Record<
  string,
  McpServerConfig
> {
  const mcpPath = isLocal()
    ? join(__dirname, '../mcps/chrome-devtools-mcp.mjs')
    : join(__dirname, 'mcps/chrome-devtools-mcp.mjs');

  return {
    'chrome-devtools': {
      command: 'node',
      args: [mcpPath],
      type: 'stdio',
    },
  };
}

export function mergeBrowserMcpServers(
  mcpServers: Record<string, McpServerConfig>,
  browserEnabled: boolean,
): Record<string, McpServerConfig> {
  if (!browserEnabled) {
    return mcpServers;
  }

  return { ...mcpServers, ...getChromeDevToolsMcpServerConfig() };
}
