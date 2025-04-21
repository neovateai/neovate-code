import { logError } from '../logger';
import { closeClients, createClients, getClientsTools } from '../mcp';
import { query } from '../query2';
import { Context } from '../types';

export async function runAct(opts: { context: Context }) {
  const { config, argv } = opts.context;
  const prompt = argv._[1] as string;
  const { model, stream, builtinTools, context, mcpConfig, systemPrompt } =
    config;
  const clients = await createClients(mcpConfig.mcpServers || {});
  const tools = {
    ...(process.env.CODE === 'none' ? {} : builtinTools),
    ...(await getClientsTools(clients)),
  };
  try {
    await query({
      prompt,
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
