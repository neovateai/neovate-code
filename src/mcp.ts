import {
  MCPServerStdio,
  MCPServerStreamableHttp,
  getAllMcpTools,
} from '@openai/agents';
import createDebug from 'debug';

export interface MCPConfig {
  type?: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

const debug = createDebug('takumi:mcp');

type MCP = MCPServerStdio | MCPServerStreamableHttp;

export class MCPManager {
  private servers: Map<string, MCP> = new Map();
  constructor(servers: Map<string, MCP>) {
    this.servers = servers;
  }

  static async create(
    mcpServers: Record<string, MCPConfig>,
  ): Promise<MCPManager> {
    debug('create MCPManager', mcpServers);
    const servers = new Map<string, MCPServerStdio | MCPServerStreamableHttp>();
    for (const [key, config] of Object.entries(mcpServers)) {
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
      } else {
        server = new MCPServerStreamableHttp({
          url: config.url!,
        });
      }
      servers.set(key, server);
    }
    debug('mcp servers created', servers);
    await Promise.all(
      Array.from(servers.values()).map((server) => server.connect()),
    );
    debug('mcp servers connected');
    return new MCPManager(servers);
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
