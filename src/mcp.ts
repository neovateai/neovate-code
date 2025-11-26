import { experimental_createMCPClient } from '@ai-sdk/mcp';
import createDebug from 'debug';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'pathe';
import type { ImagePart, TextPart } from './message';
import type { Tool } from './tool';
import { safeStringify } from './utils/safeStringify';

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

const debug = createDebug('neovate:mcp');

type MCPServerStatus =
  | 'pending'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'disconnected';

interface ServerState {
  config: MCPConfig;
  status: MCPServerStatus;
  error?: string;
  tools?: Record<string, any>;
  client?: any; // Store client for cleanup
  retryCount: number;
  isTemporaryError?: boolean;
}

export class MCPManager {
  private servers: Map<string, ServerState> = new Map();
  private configs: Record<string, MCPConfig> = {};
  private isInitialized: boolean = false;
  private initPromise?: Promise<void>;
  private initLock: boolean = false;

  static create(mcpServers: Record<string, MCPConfig>): MCPManager {
    debug('create MCPManager', mcpServers);
    const manager = new MCPManager();
    manager.configs = mcpServers || {};

    // Initialize servers state without connecting
    for (const [key, config] of Object.entries(mcpServers || {})) {
      if (config.disable) {
        debug(`Skipping disabled MCP server: ${key}`);
        continue;
      }
      manager.servers.set(key, {
        config,
        status: 'pending',
        retryCount: 0,
      });
    }

    return manager;
  }

  async initAsync(): Promise<void> {
    // Return existing promise if initialization is already in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    // Double-check locking pattern for thread safety
    if (this.initLock) {
      // Wait for lock to be released and check if initialization completed
      while (this.initLock) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      if (this.isInitialized) {
        return;
      }
    }
    // Acquire lock
    this.initLock = true;
    try {
      // Check again in case another thread completed initialization
      if (this.isInitialized) {
        return;
      }
      this.initPromise = this._performInit();
      await this.initPromise;
    } finally {
      // Release lock
      this.initLock = false;
    }
  }

  private async _performInit(): Promise<void> {
    debug('Starting async MCP initialization');
    const connectionPromises: Promise<void>[] = [];

    for (const [key, config] of Object.entries(this.configs)) {
      if (config.disable) {
        continue;
      }

      const connectionPromise = this._connectServer(key, config);
      connectionPromises.push(connectionPromise);
    }

    // Wait for all connections to complete (success or failure)
    await Promise.allSettled(connectionPromises);
    this.isInitialized = true;
    debug('MCP initialization completed');
  }

  private async _connectServer(key: string, config: MCPConfig): Promise<void> {
    const serverState = this.servers.get(key);
    if (!serverState) return;

    try {
      debug(`Connecting MCP server: ${key}`);
      serverState.status = 'connecting';

      // Test connection and fetch tools
      const { client, tools } = await this._testConnectionAndFetchTools(config);

      serverState.status = 'connected';
      serverState.client = client;
      serverState.tools = tools;
      serverState.error = undefined;

      debug(
        `MCP server connected successfully: ${key}, tools: ${Object.keys(tools).length}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debug(`Failed to connect MCP server ${key}: ${errorMessage}`);

      // Classify error types for better handling
      const isTemporaryError = this._isTemporaryError(error);

      serverState.status = 'failed';
      serverState.error = errorMessage;
      serverState.retryCount += 1;
      serverState.isTemporaryError = isTemporaryError;

      // Ensure no client reference is left on failure
      serverState.client = undefined;
      serverState.tools = undefined;
    }
  }

  async getAllTools(): Promise<Tool[]> {
    const allTools: Tool[] = [];
    const toolNames = new Set<string>();

    for (const [serverName, serverState] of this.servers.entries()) {
      if (serverState.status !== 'connected' || !serverState.tools) {
        continue;
      }

      for (const [toolName, toolDef] of Object.entries(serverState.tools)) {
        const fullToolName = `mcp__${serverName}__${toolName}`;

        if (toolNames.has(fullToolName)) {
          throw new Error(`Duplicate tool name found: ${fullToolName}`);
        }

        toolNames.add(fullToolName);
        allTools.push(
          this.#convertAiSdkToolToLocal(
            toolName,
            toolDef,
            serverName,
            serverState.config,
          ),
        );
      }
    }

    return allTools;
  }

  async getTools(keys: string[]): Promise<Tool[]> {
    const allTools: Tool[] = [];
    const toolNames = new Set<string>();

    for (const key of keys) {
      const serverState = this.servers.get(key);
      if (
        !serverState ||
        serverState.status !== 'connected' ||
        !serverState.tools
      ) {
        continue;
      }

      for (const [toolName, toolDef] of Object.entries(serverState.tools)) {
        const fullToolName = `mcp__${key}__${toolName}`;

        if (toolNames.has(fullToolName)) {
          throw new Error(`Duplicate tool name found: ${fullToolName}`);
        }

        toolNames.add(fullToolName);
        allTools.push(
          this.#convertAiSdkToolToLocal(
            toolName,
            toolDef,
            key,
            serverState.config,
          ),
        );
      }
    }

    return allTools;
  }

  async destroy() {
    // Close all client connections
    const closePromises = Array.from(this.servers.values())
      .filter((state) => state.client)
      .map((state) =>
        state.client.close().catch((err: Error) => {
          debug('Error closing client during destroy:', err);
        }),
      );

    await Promise.allSettled(closePromises);
    this.servers.clear();
    this.isInitialized = false;
    this.initPromise = undefined;
  }

  getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  hasServer(name: string): boolean {
    return this.servers.has(name);
  }

  getServerStatus(name: string): MCPServerStatus | undefined {
    return this.servers.get(name)?.status;
  }

  getServerError(name: string): string | undefined {
    return this.servers.get(name)?.error;
  }

  async getAllServerStatus(): Promise<
    Record<
      string,
      { status: MCPServerStatus; error?: string; toolCount: number }
    >
  > {
    await this.initAsync();

    const result: Record<
      string,
      { status: MCPServerStatus; error?: string; toolCount: number }
    > = {};
    for (const [name, state] of this.servers.entries()) {
      result[name] = {
        status: state.status,
        error: state.error,
        toolCount: state.tools ? Object.keys(state.tools).length : 0,
      };
    }
    return result;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  isLoading(): boolean {
    return !!this.initPromise && !this.isInitialized;
  }

  async retryConnection(serverName: string): Promise<void> {
    const config = this.configs[serverName];
    if (!config) {
      throw new Error(`Server ${serverName} not found in configuration`);
    }

    const serverState = this.servers.get(serverName);
    if (!serverState) {
      throw new Error(`Server ${serverName} state not found`);
    }

    // Log reconnection attempt
    debug(`Attempting to reconnect MCP server: ${serverName}`);

    // Close existing client if any
    if (serverState.client) {
      try {
        await serverState.client.close();
      } catch (error) {
        debug(`Error closing existing client for ${serverName}:`, error);
      }
    }

    // Reset state and retry
    serverState.client = undefined;
    serverState.tools = undefined;
    serverState.error = undefined;
    serverState.status = 'connecting';

    await this._connectServer(serverName, config);

    // Verify reconnection result
    const newState = this.servers.get(serverName);
    if (newState?.status !== 'connected') {
      throw new Error(newState?.error || 'Reconnection failed');
    }

    debug(`Successfully reconnected MCP server: ${serverName}`);
  }

  private async _createClient(config: MCPConfig) {
    if (config.command) {
      // Stdio transport (for local servers only)
      const env = config.env
        ? { ...config.env, PATH: process.env.PATH || '' }
        : undefined;

      const { Experimental_StdioMCPTransport } = await import(
        '@ai-sdk/mcp/mcp-stdio'
      );

      return experimental_createMCPClient({
        transport: new Experimental_StdioMCPTransport({
          command: config.command,
          args: config.args,
          env,
        }),
      });
    } else if (config.url) {
      // HTTP or SSE transport
      const transportType = config.type || 'http'; // Default to HTTP

      return experimental_createMCPClient({
        transport: {
          type: transportType === 'sse' ? 'sse' : 'http',
          url: config.url,
          headers: config.headers,
        },
      });
    } else {
      throw new Error('MCP config must have either command or url configured');
    }
  }

  private async _testConnectionAndFetchTools(
    config: MCPConfig,
  ): Promise<{ client: any; tools: Record<string, any> }> {
    const client = await this._createClient(config);
    try {
      const tools = await client.tools();
      return { client, tools };
    } catch (error) {
      // Close client on error
      await client.close().catch((err) => {
        debug('Error closing client after connection failure:', err);
      });
      throw error;
    }
  }

  private _isTemporaryError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    // Network-related temporary errors
    const temporaryErrors = [
      'timeout',
      'connection refused',
      'network error',
      'temporary',
      'try again',
      'rate limit',
      'too many requests',
      'service unavailable',
      'socket hang up',
      'econnreset',
      'enotfound',
      'econnrefused',
      'etimedout',
    ];

    // Configuration or permanent errors
    const permanentErrors = [
      'command not found',
      'no such file',
      'permission denied',
      'invalid configuration',
      'malformed',
      'syntax error',
      'authentication failed',
      'unauthorized',
    ];

    // Check for permanent errors first (higher priority)
    if (permanentErrors.some((permanent) => message.includes(permanent))) {
      return false;
    }

    // Check for temporary errors
    if (temporaryErrors.some((temporary) => message.includes(temporary))) {
      return true;
    }

    // Default to temporary for unknown errors (safer for retries)
    return true;
  }

  #convertAiSdkToolToLocal(
    toolName: string,
    toolDef: any,
    serverName: string,
    config: MCPConfig,
  ): Tool {
    return {
      name: `mcp__${serverName.replace(/[^a-zA-Z0-9_-]/g, '')}__${toolName}`,
      description: toolDef.description,
      getDescription: ({ params }) => {
        return formatParamsDescription(params as Record<string, any>);
      },
      parameters: toolDef.inputSchema.jsonSchema,
      execute: async (params) => {
        try {
          // toolDef is already a Tool from AI SDK with an execute method
          const result = await toolDef.execute(params || {});

          const returnDisplay = `Tool ${toolName} executed successfully${params ? `, parameters: ${JSON.stringify(params)}` : ''}`;
          const llmContent = convertMcpResultToLlmContent(result);

          return {
            llmContent,
            returnDisplay,
          };
        } catch (error) {
          return {
            isError: true,
            llmContent: error instanceof Error ? error.message : String(error),
          };
        }
      },
      approval: {
        category: 'network',
      },
    };
  }
}

export function parseMcpConfig(
  mcpConfigArgs: string[],
  cwd: string,
): Record<string, MCPConfig> {
  const mcpServers: Record<string, MCPConfig> = {};
  for (const configItem of mcpConfigArgs) {
    let configData: unknown;
    try {
      // Try to parse as JSON string first
      configData = JSON.parse(configItem);
    } catch (e) {
      // If JSON parsing fails, treat as file path
      const configPath = resolve(cwd, configItem);
      if (!existsSync(configPath)) {
        throw new Error(`MCP config file not found: ${configPath}`);
      }
      try {
        const fileContent = readFileSync(configPath, 'utf-8');
        configData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error(
          `Failed to parse MCP config file ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    // Extract mcpServer object from the config data
    if (!configData || typeof configData !== 'object') {
      throw new Error('MCP config must be a valid JSON object');
    }
    const configObj = configData as Record<string, unknown>;
    if (!configObj.mcpServers || typeof configObj.mcpServers !== 'object') {
      throw new Error('MCP config must contain an "mcpServers" object');
    }
    Object.assign(
      mcpServers,
      configObj.mcpServers as Record<string, MCPConfig>,
    );
  }

  return mcpServers;
}

function formatParamsDescription(params: Record<string, any>): string {
  if (!params || typeof params !== 'object') {
    return '';
  }
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return '';
  }
  return entries
    .filter(([key, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      return `${key}: ${safeStringify(value)}`;
    })
    .join(', ');
}

export function convertMcpResultToLlmContent(
  result: any,
): string | (TextPart | ImagePart)[] {
  // Support mcp spec data types
  // ref: https://modelcontextprotocol.io/specification/2025-06-18/server/tools#data-types
  let llmContent: any = result;
  const isTextPart = (part: object) => {
    return 'type' in part && part.type === 'text' && 'text' in part;
  };
  const isImagePart = (part: object) => {
    return (
      'type' in part &&
      part.type === 'image' &&
      'data' in part &&
      'mimeType' in part
    );
  };
  const isPart = (part: object) => {
    return isTextPart(part) || isImagePart(part);
  };
  if (typeof llmContent === 'object') {
    if (isPart(llmContent as object)) {
      llmContent = [llmContent];
    } else {
      llmContent = safeStringify(llmContent);
    }
  } else if (Array.isArray(llmContent)) {
    const hasPart = llmContent.some((part) => isPart(part));
    if (hasPart) {
      llmContent = llmContent.map((part) => {
        if (isPart(part)) {
          return part;
        } else {
          return { type: 'text', text: safeStringify(part) };
        }
      });
    } else {
      llmContent = safeStringify(llmContent);
    }
  } else if (typeof llmContent === 'string') {
    // keep llmContent as string
  } else {
    llmContent = String(llmContent);
  }
  return llmContent;
}
