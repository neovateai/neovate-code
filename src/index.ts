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
import { keywordContextPlugin } from './plugins/keyword-context';
import { sessionPlugin } from './plugins/session';
import { Context } from './types';
import * as logger from './utils/logger';

const require = createRequire(import.meta.url);

// Private export may be deprecated in the future
export { createOpenAI as _createOpenAI } from '@ai-sdk/openai';

async function buildContext(
  opts: RunCliOpts & { argv: any; command: string },
): Promise<Context> {
  dotenv.config();
  const { argv, command } = opts;
  const cwd = opts.root ?? process.cwd();
  const sessionId = randomUUID().slice(0, 4);
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, `.${opts.productName.toLowerCase()}`);
  const configPath = path.join(configDir, 'config.json');
  const sessionPathDir = opts.sessionPath ?? path.join(configDir, 'sessions');
  const sessionPath = path.join(
    sessionPathDir,
    `${opts.productName}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}-${sessionId}.json`,
  );
  const config = await getConfig({ argv, productName: opts.productName, cwd });
  const buildinPlugins = [sessionPlugin, keywordContextPlugin];
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
  logger.logIntro({
    productName: opts.productName,
    version: require('../package.json').version,
  });
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
  logger.logGeneralInfo({
    infos: {
      log: sessionPath.replace(homeDir, '~'),
      workspace: cwd,
      model: resolvedConfig.model,
      ...(resolvedConfig.smallModel !== resolvedConfig.model && {
        'small model': resolvedConfig.smallModel,
      }),
      ...(!resolvedConfig.stream && { stream: 'false' }),
      ...(resolvedConfig.mcpConfig.mcpServers && {
        mcp: Object.keys(resolvedConfig.mcpConfig.mcpServers).join(', '),
      }),
    },
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
  let context: Context | null = null;
  const start = Date.now();
  try {
    const argv = yargsParser(process.argv.slice(2), {
      alias: {
        m: 'model',
        v: 'version',
        q: 'quiet',
      },
      boolean: ['plan', 'stream', 'quiet'],
    });
    let command = argv._[0] as string;
    if (argv.version) {
      command = 'version';
    }
    if (command === 'version') {
      const productName = opts.productName.toLowerCase();
      console.log(`${productName}@${require('../package.json').version}`);
      return;
    }
    context = await buildContext({ ...opts, argv, command });
    switch (command) {
      case 'plan':
        logger.logCommand({ command: 'plan' });
        await (await import('./commands/plan.js')).runPlan({ context });
        break;
      case 'init':
        logger.logCommand({ command: 'init' });
        await (await import('./commands/init.js')).runInit({ context });
        break;
      case 'commit':
        logger.logCommand({ command: 'commit' });
        await (await import('./commands/commit.js')).runCommit({ context });
        break;
      case 'watch':
        logger.logCommand({ command: 'watch' });
        await (await import('./commands/watch.js')).runWatch({ context });
        break;
      case 'ask':
        logger.logCommand({ command: 'ask' });
        const prompt = argv._[1] as string;
        await (await import('./commands/ask.js')).runAsk({ context, prompt });
        break;
      default:
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
      // TODO: fix hard code
      await closeClients(context.mcpClients);
      logger.logOutro();
      process.exit(0);
    }
  } catch (error: any) {
    if (context) {
      await context.pluginManager.apply({
        hook: 'cliEnd',
        args: [{ startTime: start, endTime: Date.now(), error }],
        type: PluginHookType.Series,
        pluginContext: context.pluginContext,
      });
    }
    logger.logError({ error: error.message });
    if (process.env.DEBUG) {
      console.error(error);
    }
  } finally {
    if (context) {
      await closeClients(context.mcpClients);
    }
  }
}
