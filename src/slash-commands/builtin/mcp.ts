import { type Context } from '../../context';
import type { LocalCommand } from '../types';

interface McpServerConfig {
  type?: string;
  command?: string;
  url?: string;
  disable?: boolean;
  [key: string]: any;
}

interface McpServerStatus {
  name: string;
  config: McpServerConfig;
  connected: boolean;
  error?: string;
  toolCount: number;
  tools: string[];
}

async function getServerStatus(
  context: Context,
  serverName: string,
  config: McpServerConfig,
): Promise<McpServerStatus> {
  try {
    // Get server status from the new async MCPManager
    const serverStatus = context.mcpManager.getServerStatus(serverName);
    const serverError = context.mcpManager.getServerError(serverName);

    // Check if server is configured but disabled
    if (config.disable) {
      return {
        name: serverName,
        config,
        connected: false,
        error: 'Server disabled in configuration',
        toolCount: 0,
        tools: [],
      };
    }

    // Check if server exists
    if (!context.mcpManager.hasServer(serverName)) {
      return {
        name: serverName,
        config,
        connected: false,
        error: 'Server not found in manager',
        toolCount: 0,
        tools: [],
      };
    }

    const isConnected = serverStatus === 'connected';
    let toolCount = 0;
    let tools: string[] = [];
    let error: string | undefined = serverError;

    if (isConnected) {
      try {
        // Try to get tools from this server
        const serverTools = await context.mcpManager.getTools([serverName]);
        toolCount = serverTools.length;
        tools = serverTools.map((tool) => tool.name);
      } catch (err) {
        // If tool retrieval fails, still show as connected but with 0 tools
        toolCount = 0;
        tools = [];
        error = err instanceof Error ? err.message : 'Failed to get tools';
      }
    }

    return {
      name: serverName,
      config,
      connected: isConnected,
      error,
      toolCount,
      tools,
    };
  } catch (error) {
    return {
      name: serverName,
      config,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      toolCount: 0,
      tools: [],
    };
  }
}

function formatServerStatus(
  server: McpServerStatus,
  verbose: boolean = false,
): string {
  let statusIcon: string;
  let statusText: string;

  if (server.config.disable) {
    statusIcon = '⏸️';
    statusText = 'Disabled';
  } else if (server.connected) {
    statusIcon = '✅';
    statusText = 'Connected';
  } else if (server.error) {
    statusIcon = '❌';
    statusText = 'Error';
  } else {
    statusIcon = '⚠️';
    statusText = 'Disconnected';
  }

  if (!verbose) {
    let line = `${statusIcon} ${server.name} (${statusText}) - ${server.toolCount} tools`;
    if (server.error && statusText === 'Error') {
      line += `: ${server.error}`;
    }
    return line;
  }

  // Verbose format
  if (server.error && statusText === 'Error') {
    statusText = `Error: ${server.error}`;
  }

  let details = `${server.name}:\n`;
  details += `  Status: ${statusIcon} ${statusText}\n`;

  if (server.config.command) {
    details += `  Command: ${server.config.command}\n`;
  }

  if (server.config.url) {
    details += `  URL: ${server.config.url}\n`;
  }

  details += `  Tool Count: ${server.toolCount}\n`;

  if (server.tools.length > 0) {
    details += `  Available Tools: ${server.tools.join(', ')}\n`;
  }

  return details;
}

function parseArgs(args: string): {
  verbose: boolean;
  tools: boolean;
  server?: string;
} {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  const result = {
    verbose: false,
    tools: false,
    server: undefined as string | undefined,
  };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '--verbose' || part === '-v') {
      result.verbose = true;
    } else if (part === '--tools' || part === '-t') {
      result.tools = true;
    } else if (part === '--server' || part === '-s') {
      if (i + 1 < parts.length) {
        result.server = parts[i + 1];
        i++; // skip the next argument
      }
    }
  }

  return result;
}
export function createMcpCommand(opts: { context: Context }) {
  const productName = opts.context.productName.toLowerCase();
  return {
    type: 'local',
    name: 'mcp',
    description: 'Display MCP server status and available tools',
    async call(args: string, context: Context) {
      const { verbose, tools, server: targetServer } = parseArgs(args);

      // get the configured servers list
      const configuredServers = context.config.mcpServers || {};
      const serverNames = Object.keys(configuredServers);

      if (serverNames.length === 0) {
        return `No MCP servers configured.

Use \`${productName} mcp add <name> <command>\` to add a server.`;
      }

      // if a specific server is specified
      if (targetServer) {
        if (!configuredServers[targetServer]) {
          return `Error: MCP server "${targetServer}" not found.

Available servers: ${serverNames.join(', ')}`;
        }

        const serverStatus = await getServerStatus(
          context,
          targetServer,
          configuredServers[targetServer],
        );

        return formatServerStatus(serverStatus, true);
      }

      // Get overall MCP status
      const mcpStatus = context.getMcpStatus();

      // get all server statuses
      const serverStatuses = await Promise.all(
        serverNames.map((name) =>
          getServerStatus(context, name, configuredServers[name]),
        ),
      );

      let result = 'MCP Server Status:\n\n';

      // Show overall initialization status
      if (!mcpStatus.isReady) {
        result += `⏳ MCP Manager Status: ${mcpStatus.isLoading ? 'Initializing...' : 'Not Ready'}\n\n`;
      }

      // show server status
      serverStatuses.forEach((server) => {
        result += formatServerStatus(server, verbose) + '\n';
        if (verbose) {
          result += '\n';
        }
      });

      if (tools) {
        result += '\nAvailable Tools:\n';
        serverStatuses.forEach((server) => {
          if (server.connected && server.tools.length > 0) {
            result += `  - ${server.name}: ${server.tools.join(', ')}\n`;
          }
        });
      }

      // show statistics
      const connectedCount = serverStatuses.filter((s) => s.connected).length;
      const failedCount = serverStatuses.filter(
        (s) => s.error && !s.config.disable,
      ).length;
      const totalTools = serverStatuses.reduce(
        (sum, s) => sum + s.toolCount,
        0,
      );
      const disabledCount = serverStatuses.filter(
        (s) => s.config.disable,
      ).length;
      const connectingCount =
        serverNames.length - connectedCount - failedCount - disabledCount;

      result += `\n📊 Summary:\n`;
      result += `   Total: ${serverNames.length} servers configured\n`;
      result += `   Connected: ${connectedCount}\n`;
      if (connectingCount > 0) {
        result += `   Connecting: ${connectingCount}\n`;
      }
      if (failedCount > 0) {
        result += `   Failed: ${failedCount}\n`;
      }
      if (disabledCount > 0) {
        result += `   Disabled: ${disabledCount}\n`;
      }
      result += `   Available Tools: ${totalTools}`;

      if (connectedCount === 0 && serverNames.length > 0) {
        result += `\n\n💡 Tip: If a server is not connected, check its configuration or use \`${productName} mcp --server <name>\` for more details.`;
      }

      return result;
    },
  } as LocalCommand;
}
