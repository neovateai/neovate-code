import {
  MCPServerStdio,
  MCPServerStreamableHttp,
  getAllMcpTools,
} from '@openai/agents';

export interface MCPConfig {
  type?: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export class MCPManager {
  private servers: Map<string, MCPServerStdio | MCPServerStreamableHttp> =
    new Map();

  constructor(config: Record<string, MCPConfig>) {
    Object.entries(config).forEach(([key, config]) => {
      this.register(key, config);
    });
  }

  register(key: string, config: MCPConfig) {
    if (this.servers.has(key)) {
      throw new Error(`MCP server with config ${key} already exists`);
    }
    let server: MCPServerStdio | MCPServerStreamableHttp;
    if (config.type === 'stdio' || !config.type) {
      const env = config.env;
      if (env) {
        env.PATH = process.env.PATH || '';
      }
      server = new MCPServerStdio({
        command: config.command!,
        args: config.args,
        env,
      });
    } else if (config.type === 'sse') {
      server = new MCPServerStreamableHttp({
        url: config.url!,
      });
    } else {
      throw new Error(`Unknown MCP server type: ${config.type}`);
    }
    this.servers.set(key, server);
  }

  async connect() {
    await Promise.all(
      Array.from(this.servers.values()).map((server) => server.connect()),
    );
  }

  async getAllTools() {
    return getAllMcpTools(Array.from(this.servers.values()));
  }

  async getTools(keys: string[]) {
    const servers = keys
      .map((key) => this.servers.get(key))
      .filter(Boolean) as (MCPServerStdio | MCPServerStreamableHttp)[];
    return getAllMcpTools(servers);
  }

  async destroy() {
    await Promise.all(
      Array.from(this.servers.values()).map((server) => server.close()),
    );
    this.servers.clear();
  }
}
