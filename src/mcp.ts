import { experimental_createMCPClient, Tool } from 'ai';

type MCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;
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
type MCPServer = {
  type: 'stdio';
  command: string;
  args: string[];
} | {
  type: 'sse';
  url: string;
};

export async function createClients(servers: Record<string, MCPServer>): Promise<Record<string, MCPClient>> {
  const clients: Record<string, MCPClient> = {};
  for (const [name, server] of Object.entries(servers)) {
    clients[name] = await experimental_createMCPClient({
      transport: server,
    });
  }
  return clients;
}

export async function getClientsTools(clients: Record<string, MCPClient>) {
  const tools: Record<string, Tool> = {};
  for (const [name, client] of Object.entries(clients)) {
    const clientTools = await client.tools();
    for (const [toolName, tool] of Object.entries(clientTools)) {
      tools[`${name}-${toolName}`] = tool;
    }
  }
  return tools;
}

export async function closeClients(clients: Record<string, MCPClient>) {
  await Promise.all(
    Object.values(clients).map((client) => client.close()),
  );
}
