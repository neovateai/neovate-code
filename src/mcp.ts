import {
  type FunctionTool,
  type MCPServer,
  MCPServerSSE,
  MCPServerStdio,
  MCPServerStreamableHttp,
  type Tool,
  mcpToFunctionTool,
} from '@openai/agents';
import createDebug from 'debug';

export interface MCPConfig {
  type?: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  disable?: boolean;
  /**
   * The timeout for tool calls in milliseconds.
   */
  timeout?: number;
  headers?: Record<string, string>;
}

const debug = createDebug('takumi:mcp');

type MCP = MCPServerStdio | MCPServerStreamableHttp | MCPServerSSE;

export class MCPManager {
  private servers: Map<string, MCP> = new Map();
  constructor(servers: Map<string, MCP>) {
    this.servers = servers;
  }

  static async create(
    mcpServers: Record<string, MCPConfig>,
  ): Promise<MCPManager> {
    debug('create MCPManager', mcpServers);
    const servers = new Map<string, MCP>();
    for (const [key, config] of Object.entries(mcpServers)) {
      if (config.disable) {
        debug(`Skipping disabled MCP server: ${key}`);
        continue;
      }
      let server: MCPServerStdio | MCPServerStreamableHttp | MCPServerSSE;
      if (config.command) {
        const env = config.env;
        if (env) {
          env.PATH = process.env.PATH || '';
        }
        server = new MCPServerStdio({
          command: config.command!,
          args: config.args,
          env,
          timeout: config.timeout,
        });
      } else if (config.url) {
        const requestInit = config.headers
          ? { requestInit: { headers: config.headers } }
          : {};
        if (config.type === 'sse') {
          server = new MCPServerSSE({
            url: config.url!,
            timeout: config.timeout,
            ...requestInit,
          });
        } else {
          server = new MCPServerStreamableHttp({
            url: config.url!,
            timeout: config.timeout,
            ...requestInit,
          });
        }
      } else {
        throw new Error(
          `MCP server ${key} must have either command or url configured`,
        );
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
    return this.getAllMcpTools(Array.from(this.servers.values()));
  }

  async getTools(keys: string[]) {
    const servers = keys
      .map((key) => this.servers.get(key))
      .filter(Boolean) as MCP[];
    return this.getAllMcpTools(servers);
  }

  async destroy() {
    await Promise.all(
      Array.from(this.servers.values()).map((server) => server.close()),
    );
    this.servers.clear();
  }

  async getAllMcpTools<TContext = UnknownContext>(
    mcpServers: MCPServer[],
    convertSchemasToStrict: boolean = false,
  ): Promise<Tool<TContext>[]> {
    // @see https://github.com/openai/openai-agents-js/issues/295
    const allTools: Tool<TContext>[] = [];
    const toolNames = new Set<string>();
    for (const server of mcpServers) {
      const serverTools = await this.getFunctionToolsFromServer(
        server,
        convertSchemasToStrict,
      );
      const serverToolNames = new Set(serverTools.map((t) => t.name));
      const intersection = [...serverToolNames].filter((n) => toolNames.has(n));
      if (intersection.length > 0) {
        throw new Error(
          `Duplicate tool names found across MCP servers: ${intersection.join(', ')}`,
        );
      }
      for (const t of serverTools) {
        toolNames.add(t.name);
        allTools.push(t);
      }
    }
    return allTools;
  }

  async getFunctionToolsFromServer<TContext = UnknownContext>(
    server: MCPServer,
    convertSchemasToStrict: boolean,
  ) {
    const mcpTools = await server.listTools();
    const tools: FunctionTool<TContext, any, string>[] = mcpTools.map((t) =>
      mcpToFunctionTool(t, server, convertSchemasToStrict),
    );
    return tools;
  }
}

type UnknownContext = unknown;
