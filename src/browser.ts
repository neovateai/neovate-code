import { join, dirname } from 'pathe';
import { isLocal } from './utils/isLocal';
import type { McpServerConfig } from './config';
import { fileURLToPath } from 'url';

export type BrowserConfig = {
  browser: boolean;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

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
