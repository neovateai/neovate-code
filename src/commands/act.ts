import { Config } from '../config';
import { logError } from '../logger';
import { closeClients, createClients, getClientsTools } from '../mcp';
import { queryWithTools } from '../query';
import { withLogger } from '../tools';

export async function runAct(opts: { prompt: string; config: Config }) {
  const { config } = opts;
  const { model, stream, builtinTools, context, mcpConfig, systemPrompt } =
    config;
  const clients = await createClients(mcpConfig.mcpServers || {});
  const tools = withLogger({
    ...builtinTools,
    ...(await getClientsTools(clients)),
  });
  try {
    await queryWithTools({
      messages: [{ role: 'user', content: opts.prompt }],
      systemPrompt,
      model,
      stream,
      context,
      tools,
    });
  } catch (error: any) {
    logError('Error in act:');
    logError(error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
  } finally {
    await closeClients(clients);
  }
}
