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
    // Check if the server exists in MCPManager and is connected
    const isConnected = context.mcpManager.hasServer(serverName);
    let toolCount = 0;
    let tools: string[] = [];

    if (isConnected) {
      try {
        // Try to get tools from this server
        const serverTools = await context.mcpManager.getTools([serverName]);
        toolCount = serverTools.length;
        tools = serverTools.map((tool) => tool.name);
      } catch (error) {
        // If tool retrieval fails, still show as connected but with 0 tools
        toolCount = 0;
        tools = [];
      }
    }

    return {
      name: serverName,
      config,
      connected: isConnected,
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
  const statusIcon = server.connected ? '✅' : server.error ? '❌' : '⚠️';
  const statusText = server.connected
    ? 'Connected'
    : server.error
      ? `Error: ${server.error}`
      : 'Disconnected';

  if (!verbose) {
    return `${statusIcon} ${server.name} (${statusText}) - ${server.toolCount} tools`;
  }

  let details = `${server.name}:
`;
  details += `  Status: ${statusIcon} ${statusText}
`;

  if (server.config.type) {
    details += `  Type: ${server.config.type}
`;
  }

  if (server.config.command) {
    details += `  Command: ${server.config.command}
`;
  }

  if (server.config.url) {
    details += `  URL: ${server.config.url}
`;
  }

  if (server.config.disable) {
    details += `  Status: Disabled
`;
  }

  details += `  Tool Count: ${server.toolCount}
`;

  if (server.tools.length > 0) {
    details += `  Available Tools: ${server.tools.join(', ')}
`;
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

      // get all server statuses
      const serverStatuses = await Promise.all(
        serverNames.map((name) =>
          getServerStatus(context, name, configuredServers[name]),
        ),
      );

      let result = 'MCP server status:\n\n';

      if (tools) {
        // show all tools list
        const allTools: string[] = [];
        serverStatuses.forEach((server) => {
          if (server.connected && server.tools.length > 0) {
            allTools.push(`${server.name}: ${server.tools.join(', ')}`);
          }
        });

        if (allTools.length > 0) {
          result += 'Available tools:\n';
          allTools.forEach((toolInfo) => {
            result += `  ${toolInfo}\n`;
          });
          result += '\n';
        } else {
          result += 'No available tools.\n\n';
        }
      }

      // show server status
      serverStatuses.forEach((server) => {
        result += formatServerStatus(server, verbose) + '\n';
        if (verbose) {
          result += '\n';
        }
      });

      // show statistics
      const connectedCount = serverStatuses.filter((s) => s.connected).length;
      const totalTools = serverStatuses.reduce(
        (sum, s) => sum + s.toolCount,
        0,
      );
      const disabledCount = serverStatuses.filter(
        (s) => s.config.disable,
      ).length;

      result += `
Total: ${serverNames.length} servers configured`;
      if (disabledCount > 0) {
        result += `, ${disabledCount} disabled`;
      }
      result += `, ${connectedCount} connected, ${totalTools} tools available`;

      if (connectedCount === 0 && serverNames.length > 0) {
        result += `

💡 Tip: If the server is not connected, please check the configuration or use \`${productName} mcp list\` to view the detailed configuration.`;
      }

      return result;
    },
  } as LocalCommand;
}
