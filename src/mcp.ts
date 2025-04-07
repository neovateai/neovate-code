import {
  MCPTransport,
  Tool,
  experimental_createMCPClient as createMCPClient,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;
/**
 *
    type: 'stdio',
    command: 'node',
    args: ['src/stdio/dist/server.js'],

    or

    type: 'sse',
    url: 'https://my-server.com/sse',
 *
 */
type MCPServer =
  | {
      type?: 'stdio';
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  | {
      type?: 'sse';
      url: string;
      env?: Record<string, string>;
    };

export async function createClients(
  servers: Record<string, MCPServer | MCPTransport>,
): Promise<Record<string, MCPClient>> {
  const clients: Record<string, MCPClient> = {};
  for (let [name, server] of Object.entries(servers)) {
    // Check if server has 'command' property to determine its type
    if ('command' in server) {
      server = new StdioMCPTransport({
        command: server.command,
        args: server.args,
      });
    } else if ('url' in server) {
      server.type = 'sse';
    }
    clients[name] = await createMCPClient({
      transport: server as any,
    });
  }
  return clients;
}

export async function getClientsTools(clients: Record<string, MCPClient>) {
  const tools: Record<string, Tool> = {};
  for (const [name, client] of Object.entries(clients)) {
    const clientTools = await client.tools();
    for (const [toolName, tool] of Object.entries(clientTools)) {
      tools[serializeToolName(name, toolName)] = tool;
    }
  }
  return tools;
}

function serializeToolName(name: string, toolName: string) {
  let ret = `mcp---${name}---${toolName}`;
  // replace all non-alphanumeric characters with a dash
  ret = ret.replace(/[^a-zA-Z0-9]/g, '-');
  return ret;
}

export function deserializeToolName(name: string) {
  return name.replace(/^mcp---(.*)---(.*)$/, '[MCP] $1/$2');
}

export async function closeClients(clients: Record<string, MCPClient>) {
  await Promise.all(Object.values(clients).map((client) => client.close()));
}
