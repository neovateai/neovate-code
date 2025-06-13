import { MCPServerStdio, getAllMcpTools, withTrace } from '@openai/agents';

export async function runTest() {
  await withTrace('takumi', async () => {
    const server = new MCPServerStdio({
      command: 'npx',
      args: ['-y', '@browsermcp/mcp@latest'],
      env: {
        PATH: process.env.PATH || '',
        // ...process.env,
      },
    });
    await server.connect();
    // const tools = await server.listTools();
    // console.log('---- tools', tools);
    const allTools = await getAllMcpTools([server]);
    console.log('---- allTools', allTools);
    await server.close();
  });
}
