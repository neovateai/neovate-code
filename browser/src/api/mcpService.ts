import { mcpRequest } from '@/utils/request';

export const mcpService = {
  // Get server list
  async getServers(global = false) {
    return await mcpRequest.get(`/mcp/servers?global=${global}`);
  },

  // Get single server
  async getServer(name: string, global = false) {
    return await mcpRequest.get(`/mcp/servers/${name}?global=${global}`);
  },

  // Add server
  async addServer(config: {
    name: string;
    command?: string;
    args?: string[];
    url?: string;
    transport?: string;
    env?: string;
    global?: boolean;
  }) {
    return await mcpRequest.post(`/mcp/servers`, config);
  },

  // Update server
  async updateServer(
    name: string,
    config: {
      command?: string;
      args?: string[];
      url?: string;
      transport?: string;
      env?: string;
      global?: boolean;
    },
  ) {
    return await mcpRequest.patch(`/mcp/servers/${name}`, config);
  },

  // Remove server
  async removeServer(name: string, global = false) {
    return await mcpRequest.delete(`/mcp/servers/${name}?global=${global}`);
  },
};
