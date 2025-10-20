import { message } from 'antd';
import { proxy } from 'valtio';
import type { NodeBridgeResponse } from '@/types/chat';
import type { McpServerConfig } from '@/types/config';
import { state as chatState } from './chat';
import { actions as bridge } from './client';
import { actions as configActions } from './config';

export type McpServerItemConfig = McpServerConfig & {
  name: string;
};

interface McpState {
  mcpServers: McpServerItemConfig[];
  recommendedMcpServices: McpServerItemConfig[];
}

export const state = proxy<McpState>({
  mcpServers: [],
  recommendedMcpServices: [
    {
      name: 'Context7',
      type: 'stdio' as const,
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp', '--api-key', 'YOUR_API_KEY'],
    },
    {
      name: 'Figma',
      command: 'npx',
      args: [
        '-y',
        'figma-developer-mcp',
        '--figma-api-key=YOUR-KEY',
        '--stdio',
      ],
      type: 'stdio' as const,
    },
  ],
});

interface ServerData {
  status: string;
  error?: string;
  toolCount: number;
  tools: string[];
}

export const actions = {
  getMcpStatus: async () => {
    const result = (await bridge.request('mcp.getStatus', {
      cwd: chatState.cwd,
    })) as NodeBridgeResponse<{
      servers: Record<string, ServerData>;
      configs: Record<string, McpServerConfig>;
      globalConfigPath: string;
      projectConfigPath: string;
      isReady: boolean;
      isLoading: boolean;
    }>;
    if (!result.success) {
      message.error(result.message || 'Failed to get MCP status');
      return;
    }

    state.mcpServers = Object.entries(result.data.configs).map(
      ([name, config]) => ({
        name,
        ...config,
      }),
    );
  },

  addMcpServer: async (server: McpServerItemConfig, isGlobal = false) => {
    try {
      const { name, ...config } = server;
      const currentServers = state.mcpServers.reduce(
        (acc, s) => {
          const { name: serverName, ...serverConfig } = s;
          acc[serverName] = serverConfig;
          return acc;
        },
        {} as Record<string, McpServerConfig>,
      );

      const newServers = {
        ...currentServers,
        [name]: config,
      };

      const success = await configActions.set(
        'mcpServers',
        newServers,
        isGlobal,
      );

      if (success) {
        await actions.getMcpStatus();
        message.success(`Added MCP server: ${name}`);
      }
      return success;
    } catch (error) {
      message.error(`Failed to add MCP server: ${error}`);
      return false;
    }
  },

  toggleMcpServer: async (server: McpServerItemConfig, isGlobal = false) => {
    try {
      const { name, disable, ...config } = server;
      const currentServers = state.mcpServers.reduce(
        (acc, s) => {
          const { name: serverName, ...serverConfig } = s;
          acc[serverName] = serverConfig;
          return acc;
        },
        {} as Record<string, McpServerConfig>,
      );

      const newServers = {
        ...currentServers,
        [name]: {
          ...config,
          disable: !disable,
        },
      };

      const success = await configActions.set(
        'mcpServers',
        newServers,
        isGlobal,
      );

      if (success) {
        await actions.getMcpStatus();
        message.success(
          `${disable ? 'Enabled' : 'Disabled'} MCP server: ${name}`,
        );
      }
      return success;
    } catch (error) {
      message.error(`Failed to toggle MCP server: ${error}`);
      return false;
    }
  },
};
