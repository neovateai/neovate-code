const API_BASE = '/api';

export const mcpService = {
  // Get server list
  async getServers(global = false) {
    const response = await fetch(`${API_BASE}/mcp/servers?global=${global}`);
    if (!response.ok) {
      throw new Error('Failed to fetch servers');
    }
    return response.json();
  },

  // Get single server
  async getServer(name: string, global = false) {
    const response = await fetch(
      `${API_BASE}/mcp/servers/${name}?global=${global}`,
    );
    if (!response.ok) {
      throw new Error('Failed to fetch server');
    }
    return response.json();
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
    const response = await fetch(`${API_BASE}/mcp/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error('Failed to add server');
    }
    return response.json();
  },

  // Remove server
  async removeServer(name: string, global = false) {
    const response = await fetch(
      `${API_BASE}/mcp/servers/${name}?global=${global}`,
      {
        method: 'DELETE',
      },
    );
    if (!response.ok) {
      throw new Error('Failed to remove server');
    }
    return response.json();
  },
};
