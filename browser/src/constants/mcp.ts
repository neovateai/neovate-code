import type { McpConfigItem } from '@/types/mcp';

// Default values
export const MCP_DEFAULTS = {
  TRANSPORT_TYPE: 'stdio' as const,
  SCOPE: 'project' as const,
  INPUT_MODE: 'json' as const,
} as const;

// Preset service names for identification
export const PRESET_SERVICE_NAMES = new Set([
  '@playwright mcp',
  'Framelink Figma MCP',
]);

// MCP service key prefixes
export const MCP_KEY_PREFIXES = {
  GLOBAL: 'global',
  PROJECT: 'project',
  DISABLED_GLOBAL: 'disabled-global',
  DISABLED_PROJECT: 'disabled-project',
} as const;

// MCP menu item keys
export const MCP_MENU_KEYS = {
  MANAGE: 'manage',
  SERVICES_HEADER: 'services-header',
  NO_SERVICES: 'no-services',
} as const;

export const getJsonExample = () => {
  return JSON.stringify(
    {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['@playwright/mcp@latest'],
        },
        'figma-mcp': {
          command: 'npx',
          args: [
            '-y',
            'figma-developer-mcp',
            '--figma-api-key=YOUR-KEY',
            '--stdio',
          ],
        },
      },
    },
    null,
    2,
  );
};

export const getSimpleJsonExample = () => {
  return JSON.stringify(
    {
      playwright: {
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
      'figma-mcp': {
        command: 'npx',
        args: [
          '-y',
          'figma-developer-mcp',
          '--figma-api-key=YOUR-KEY',
          '--stdio',
        ],
      },
    },
    null,
    2,
  );
};

export const getSingleServerExample = () => {
  return JSON.stringify(
    {
      name: 'my-server',
      command: 'npx',
      args: ['-y', '@example/mcp-server'],
      env: { API_KEY: 'your-key' },
    },
    null,
    2,
  );
};

export const getSseJsonExample = () => {
  return JSON.stringify(
    {
      name: 'my-sse-server',
      transport: 'sse',
      url: 'http://localhost:3000',
    },
    null,
    2,
  );
};

// Create default MCP configuration item
export const createDefaultMcpConfig = (): McpConfigItem => ({
  id: Date.now().toString(),
  scope: 'project',
  inputMode: 'json',
  name: '',
  transport: MCP_DEFAULTS.TRANSPORT_TYPE,
  command: '',
  args: '',
  url: '',
  env: '',
  jsonConfig: '',
});
