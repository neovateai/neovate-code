import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import { runAct } from './commands/act';
import { runInit } from './commands/init';
import { runPlan } from './commands/plan';
import { getConfig } from './config';
import * as logger from './logger';
import { PluginManager } from './plugin/plugin_manager';

async function buildContext() {
  dotenv.config();
  const cwd = process.cwd();
  const argv = yargsParser(process.argv.slice(2));
  const command = argv._[0] as string;
  const config = await getConfig({ argv });
  const plugins = [...(config.plugins || [])];
  const pluginManager = new PluginManager(plugins);
  const pluginContext = {
    config,
    cwd,
    command,
    logger,
  };
  return {
    argv,
    command,
    cwd,
    config,
    pluginManager,
    pluginContext,
  };
}

export async function runCli() {
  const context = await buildContext();
  const { command } = context;
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
      await runAct({ context });
      break;
  }
}
