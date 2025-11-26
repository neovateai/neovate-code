import { proxy } from 'valtio';
import type { NodeBridgeResponse } from '@/types/chat';
import type { McpServerConfig } from '@/types/config';
import type { McpManagerData, McpServerWithStatus } from '@/types/mcp';
import { state as chatState } from './chat';
import { actions as bridge } from './client';

export type McpServerItemConfig = McpServerConfig & {
  name: string;
  scope: 'project' | 'global';
  env?: Record<string, string>;
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
  recommendedMcpServices: [],
  managerData: null,
  activeServers: {},
  loading: false,
});

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
    config: McpServerConfig,
    scope: 'project' | 'global',
    isRefreshList = true,
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

    if (isRefreshList) {
      await this.getList();
    }
  },

  async updateServer(
    name: string,
    config: McpServerConfig,
    scope: 'project' | 'global',
  ) {
    await this.addServer(name, config, scope);
  },

  async removeServer(name: string, scope: 'project' | 'global') {
    const currentServers =
      scope === 'global'
        ? state.managerData?.globalServers || {}
        : state.managerData?.projectServers || {};

    const { [name]: _, ...updatedServers } = currentServers;

    await bridge.request('config.set', {
      cwd: chatState.cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
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

  async refreshList() {
    await bridge.request('project.clearContext', {});
    await this.getList();
  },
};
