import { request } from '@/utils/request';

export const mcpService = {
  // Get server list
  async getServers(global = false) {
    return await request.get(`/mcp/servers?global=${global}`);
  },

  // Get single server
  async getServer(name: string, global = false) {
    return await request.get(`/mcp/servers/${name}?global=${global}`);
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
    return await request.post(`/mcp/servers`, config);
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
    return await request.patch(`/mcp/servers/${name}`, config);
  },

  // Remove server
  async removeServer(name: string, global = false) {
    return await request.delete(`/mcp/servers/${name}?global=${global}`);
  },
};
