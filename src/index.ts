import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import { runAct } from './commands/act';
import { runInit } from './commands/init';
import { runPlan } from './commands/plan';
import { getConfig } from './config';
import * as logger from './logger';
import { logError } from './logger';
import { closeClients, createClients } from './mcp';
import { PluginManager } from './plugin/plugin_manager';
import type { Plugin } from './plugin/types';

async function buildContext(opts: RunCliOpts) {
  dotenv.config();
  const cwd = process.cwd();
  const argv = yargsParser(process.argv.slice(2));
  const command = argv._[0] as string;
  const config = await getConfig({ argv, productName: opts.productName });
  const plugins = [...(config.plugins || [])];
  const pluginManager = new PluginManager(plugins);
  const pluginContext = {
    config,
    cwd,
    command,
    logger,
  };
  const mcpClients = await createClients(config.mcpConfig.mcpServers || {});
  return {
    argv,
    command,
    cwd,
    config,
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
      default:
        logger.logPrompt(command);
        await runAct({ context, prompt: command });
        break;
    }
  } catch (error: any) {
    logError('Error:');
    logError(error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
  } finally {
    await closeClients(context.mcpClients);
  }
}
