import assert from 'assert';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import yargsParser from 'yargs-parser';
import { getConfig } from './config';
import { closeClients, createClients } from './mcp';
import { PluginHookType, PluginManager } from './pluginManager/pluginManager';
import type { Plugin } from './pluginManager/types';
import { sessionPlugin } from './plugins/session';
import * as logger from './utils/logger';

const require = createRequire(import.meta.url);

// Private export may be deprecated in the future
export { createOpenAI as _createOpenAI } from '@ai-sdk/openai';

async function buildContext(opts: RunCliOpts) {
  dotenv.config();
  const cwd = opts.root ?? process.cwd();
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
  const sessionId = randomUUID();
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, `.${opts.productName.toLowerCase()}`);
  const configPath = path.join(configDir, 'config.json');
  const sessionPathDir = opts.sessionPath ?? path.join(configDir, 'sessions');
  const sessionPath =
    opts.sessionPath ??
    path.join(
      sessionPathDir,
      `${opts.productName}-${format(new Date(), 'yyyy-MM-dd_HH_mm_ss')}-${sessionId}.json`,
    );
  const config = await getConfig({ argv, productName: opts.productName, cwd });
  const buildinPlugins = [sessionPlugin];
  const plugins = [
    ...buildinPlugins,
    ...(config.plugins || []),
    ...(opts.plugins || []),
  ];
  const pluginManager = new PluginManager(plugins);
  const paths = {
    configDir,
    configPath,
    sessionPath,
  };
  const pluginContext = {
    argv,
    config,
    cwd,
    command,
    logger,
    paths,
    sessionId,
  };
  // hook: cliStart
  await pluginManager.apply({
    hook: 'cliStart',
    args: [],
    type: PluginHookType.Series,
    pluginContext,
  });
  // hook: config
  const resolvedConfig = await pluginManager.apply({
    hook: 'config',
    args: [],
    type: PluginHookType.SeriesMerge,
    memo: config,
    pluginContext,
  });
  // hook: configResolved
  await pluginManager.apply({
    hook: 'configResolved',
    args: [{ resolvedConfig }],
    type: PluginHookType.Series,
    pluginContext,
  });
  assert(resolvedConfig.model, 'Model is required');
  assert(resolvedConfig.smallModel, 'Small model is required');
  const mcpClients = await createClients(config.mcpConfig.mcpServers || {});
  return {
    argv,
    command,
    cwd,
    config: resolvedConfig,
    pluginManager,
    pluginContext,
    mcpClients,
    paths,
    sessionId,
  };
}

interface RunCliOpts {
  plugins: Plugin[];
  productName: string;
  root?: string;
  sessionPath?: string;
}

export async function runCli(opts: RunCliOpts) {
  const context = await buildContext(opts);
  const { command, argv } = context;
  const start = Date.now();
  try {
    switch (command) {
      case 'plan':
        logger.logPrompt('/plan');
        await (await import('./commands/plan.js')).runPlan({ context });
        break;
      case 'init':
        logger.logPrompt('/init');
        await (await import('./commands/init.js')).runInit({ context });
        break;
      case 'commit':
        logger.logPrompt('/commit');
        await (await import('./commands/commit.js')).runCommit({ context });
        break;
      case 'version':
        console.log(require('../package.json').version);
        break;
      case 'watch':
        logger.logPrompt('/watch');
        await (await import('./commands/watch.js')).runWatch({ context });
        break;
      case 'ask':
        logger.logPrompt('/ask');
        const askPrompt = argv._.slice(1).join(' ');
        await (
          await import('./commands/ask.js')
        ).runAsk({ context, prompt: askPrompt });
        break;
      default:
        logger.logPrompt(command);
        await (
          await import('./commands/act.js')
        ).runAct({ context, prompt: command });
        break;
    }
    // hook: cliEnd
    await context.pluginManager.apply({
      hook: 'cliEnd',
      args: [{ startTime: start, endTime: Date.now(), error: null }],
      type: PluginHookType.Series,
      pluginContext: context.pluginContext,
    });
    if (command !== 'watch') {
      process.exit(0);
    }
  } catch (error: any) {
    logger.logError('Error:');
    logger.logError(error.message);
    await context.pluginManager.apply({
      hook: 'cliEnd',
      args: [{ startTime: start, endTime: Date.now(), error }],
      type: PluginHookType.Series,
      pluginContext: context.pluginContext,
    });
    if (process.env.DEBUG) {
      console.error(error);
    }
  } finally {
    await closeClients(context.mcpClients);
  }
}
