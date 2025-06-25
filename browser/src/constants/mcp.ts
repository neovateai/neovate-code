import type { PresetMcpService } from '@/types/mcp';

/**
 * MCP (Message Control Protocol) related constants
 */

// LocalStorage keys
export const MCP_STORAGE_KEYS = {
  KNOWN_SERVICES: 'takumi-known-mcp-services',
  SERVICE_CONFIGS: 'takumi-mcp-service-configs',
} as const;

// Default values
export const MCP_DEFAULTS = {
  TRANSPORT_TYPE: 'stdio' as const,
  SCOPE: 'project' as const,
  INPUT_MODE: 'json' as const,
} as const;

// Figma API key related constants
export const FIGMA_CONFIG = {
  API_KEY_ARG: '--figma-api-key',
  DEFAULT_API_KEY: 'YOUR-KEY',
} as const;

// Preset MCP services configuration
export const PRESET_MCP_SERVICES: Omit<
  PresetMcpService,
  'description' | 'apiKeyLabel' | 'apiKeyPlaceholder'
>[] = [
  {
    key: 'playwright',
    name: '@playwright mcp',
    config: {
      name: '@playwright mcp',
      command: 'npx',
      args: ['@playwright/mcp@latest'],
    },
  },
  {
    key: 'figma',
    name: 'Framelink Figma MCP',
    requiresApiKey: true,
    config: {
      name: 'Framelink Figma MCP',
      command: 'npx',
      args: [
        '-y',
        'figma-developer-mcp',
        `${FIGMA_CONFIG.API_KEY_ARG}=${FIGMA_CONFIG.DEFAULT_API_KEY}`,
        '--stdio',
      ],
    },
  },
];

// MCP service key prefixes
export const MCP_KEY_PREFIXES = {
  GLOBAL: 'global',
  PROJECT: 'project',
  DISABLED_GLOBAL: 'disabled-global',
  DISABLED_PROJECT: 'disabled-project',
  PRESET: 'preset',
} as const;

// MCP menu item keys
export const MCP_MENU_KEYS = {
  MANAGE: 'manage',
  SERVICES_HEADER: 'services-header',
  NO_SERVICES: 'no-services',
} as const;

// Helper function to get preset services with translations
export const getPresetMcpServicesWithTranslations = (
  t: (key: any) => string,
): PresetMcpService[] => [
  {
    ...PRESET_MCP_SERVICES[0],
    description: t('mcp.playwrightDescription'),
  },
  {
    ...PRESET_MCP_SERVICES[1],
    description: t('mcp.figmaDescription'),
    apiKeyLabel: t('mcp.figmaApiKeyLabel'),
    apiKeyPlaceholder: t('mcp.apiKeyPlaceholder'),
  },
];

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
