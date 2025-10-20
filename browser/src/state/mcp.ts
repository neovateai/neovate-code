import { message } from 'antd';
import { proxy } from 'valtio';
import type { NodeBridgeResponse } from '@/types/chat';
import type { McpServerConfig } from '@/types/config';
import type { McpManagerData, McpServerWithStatus } from '@/types/mcp';
import { state as chatState } from './chat';
import { actions as bridge } from './client';
import { actions as configActions } from './config';

export type McpServerItemConfig = McpServerConfig & {
  name: string;
};

interface McpState {
  mcpServers: McpServerItemConfig[];
  recommendedMcpServices: McpServerItemConfig[];
  managerData: McpManagerData | null;
  activeServers: Record<string, McpServerWithStatus>;
  loading: boolean;
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
  managerData: null,
  activeServers: {},
  loading: false,
});

interface ServerData {
  status: string;
  error?: string;
  toolCount: number;
  tools: string[];
}

export const actions = {
  async getList() {
    state.loading = true;
    try {
      const response = (await bridge.request('mcp.list', {
        cwd: chatState.cwd,
      })) as NodeBridgeResponse<McpManagerData>;
      if (response.success) {
        state.managerData = response.data;
        state.activeServers = response.data.activeServers;
      }
    } finally {
      state.loading = false;
    }
  },

  async addServer(
    name: string,
    config: McpServerItemConfig,
    scope: 'project' | 'global',
  ) {
    const currentServers =
      scope === 'global'
        ? state.managerData?.globalServers || {}
        : state.managerData?.projectServers || {};

    const updatedServers = {
      ...currentServers,
      [name]: config,
    };

    await bridge.request('config.set', {
      cwd: chatState.cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
    });

    await this.getList();
  },

  async updateServer(
    name: string,
    config: McpServerItemConfig,
    scope: 'project' | 'global',
  ) {
    await this.addServer(name, config, scope);
  },

  async removeServer(name: string, scope: 'project' | 'global') {
    await bridge.request('config.remove', {
      cwd: chatState.cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      values: [name],
    });

    await this.getList();
  },

  async toggleServer(
    name: string,
    scope: 'project' | 'global',
    disabled: boolean,
  ) {
    const currentServers =
      scope === 'global'
        ? state.managerData?.globalServers || {}
        : state.managerData?.projectServers || {};

    const server = currentServers[name];
    if (!server) return;

    const updatedServer: McpServerItemConfig = {
      ...server,
      disable: disabled,
    };

    if (!disabled) {
      delete updatedServer.disable;
    }

    const updatedServers = {
      ...currentServers,
      [name]: updatedServer,
    };

    await bridge.request('config.set', {
      cwd: chatState.cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
    });

    await this.getList();
  },

  async reconnectServer(serverName: string) {
    await bridge.request('mcp.reconnect', {
      cwd: chatState.cwd,
      serverName,
    });

    await this.getList();
  },

  // Legacy methods for backward compatibility
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
