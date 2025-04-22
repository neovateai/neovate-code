import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import { runAct } from './commands/act';
import { runCommit } from './commands/commit';
import { runInit } from './commands/init';
import { runPlan } from './commands/plan';
import { getConfig } from './config';
import { closeClients, createClients } from './mcp';
import { PluginHookType, PluginManager } from './plugin/pluginManager';
import type { Plugin } from './plugin/types';
import * as logger from './utils/logger';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Private export may be deprecated in the future
export { createOpenAI as _createOpenAI } from '@ai-sdk/openai';

async function buildContext(opts: RunCliOpts) {
  dotenv.config();
  const cwd = process.cwd();
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      m: 'model',
      v: 'version',
    },
  });
  let command = argv._[0] as string;
  if (argv.version) {
    command = 'version';
  }
  const config = await getConfig({ argv, productName: opts.productName });
  const plugins = [...(config.plugins || []), ...(opts.plugins || [])];
  const pluginManager = new PluginManager(plugins);
  const pluginContext = {
    argv,
    config,
    cwd,
    command,
    logger,
  };
  // hook: config
  const resolvedConfig = await pluginManager.apply({
    hook: 'config',
    args: [{ context: pluginContext }],
    type: PluginHookType.SeriesMerge,
    memo: config,
    pluginContext,
  });
  // hook: configResolved
  await pluginManager.apply({
    hook: 'configResolved',
    args: [resolvedConfig],
    type: PluginHookType.Series,
    pluginContext,
  });
  const mcpClients = await createClients(config.mcpConfig.mcpServers || {});
  return {
    argv,
    command,
    cwd,
    config: resolvedConfig,
    pluginManager,
    pluginContext,
    mcpClients,
  };
}

interface RunCliOpts {
  plugins: Plugin[];
  productName: string;
}

export async function runCli(opts: RunCliOpts) {
  const context = await buildContext(opts);
  const { command } = context;
  try {
    switch (command) {
      case 'plan':
        logger.logPrompt('/plan');
        await runPlan({ context });
        break;
      case 'init':
        logger.logPrompt('/init');
        await runInit({ context });
        break;
      case 'commit':
        logger.logPrompt('/commit');
        await runCommit({ context });
        break;
      case 'version':
        console.log(require('../package.json').version);
        break;
      default:
        logger.logPrompt(command);
        await runAct({ context, prompt: command });
        break;
    }
  } catch (error: any) {
    logger.logError('Error:');
    logger.logError(error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
  } finally {
    await closeClients(context.mcpClients);
  }
}
