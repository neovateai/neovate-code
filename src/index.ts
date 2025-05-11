import assert from 'assert';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import yargsParser from 'yargs-parser';
import { getConfig } from './config';
import {
  AskQueryOptions,
  EditQueryOptions,
  askQuery,
  editQuery,
} from './llms/query';
import { closeClients, createClients } from './mcp';
import { PluginHookType, PluginManager } from './pluginManager/pluginManager';
import type { Command, Plugin } from './pluginManager/types';
import { keywordContextPlugin } from './plugins/keyword-context';
import { sessionPlugin } from './plugins/session';
import type { Context, PluginContext } from './types';
import * as logger from './utils/logger';

const require = createRequire(import.meta.url);

// Private export may be deprecated in the future
export { createOpenAI as _createOpenAI } from '@ai-sdk/openai';
export { Plugin, PluginContext, PluginHookType };
export { checkAndUpdate as _checkAndUpdate } from 'upgear';

async function buildContext(
  opts: RunCliOpts & { argv: any; command: string },
): Promise<Context> {
  dotenv.config();
  const pkg = await import('../package.json');
  const version = opts.version || pkg.version;
  logger.logIntro({
    productName: opts.productName,
    version,
  });
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
  const argsPlugins: Plugin[] = [];
  for (const plugin of argv.plugin || []) {
    const pluginPath = path.resolve(cwd, plugin);
    const pluginObject = require(pluginPath);
    argsPlugins.push(pluginObject.default || pluginObject);
  }
  const buildinPlugins = [sessionPlugin, keywordContextPlugin];
  const plugins = [
    ...buildinPlugins,
    ...(config.plugins || []),
    ...(opts.plugins || []),
    ...argsPlugins,
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
    paths,
    sessionId,
    logger,
    askQuery: (opts: Omit<AskQueryOptions, 'context'>) => {
      return askQuery({
        context,
        ...opts,
      });
    },
    editQuery: (opts: Omit<EditQueryOptions, 'context'>) => {
      return editQuery({
        context,
        ...opts,
      });
    },
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
  const defaultInfos = {
    log: sessionPath.replace(homeDir, '~'),
    workspace: cwd.replace(homeDir, '~'),
    ...(resolvedConfig.model && {
      model:
        typeof resolvedConfig.model === 'string'
          ? resolvedConfig.model
          : resolvedConfig.model.modelId,
    }),
    ...(resolvedConfig.smallModel &&
      resolvedConfig.smallModel !== resolvedConfig.model && {
        'small model':
          typeof resolvedConfig.smallModel === 'string'
            ? resolvedConfig.smallModel
            : resolvedConfig.smallModel.modelId,
      }),
    ...(!resolvedConfig.stream && { stream: 'false' }),
    ...(resolvedConfig.mcpConfig?.mcpServers && {
      mcp: Object.keys(resolvedConfig.mcpConfig.mcpServers).join(', '),
    }),
  };
  const infos = await pluginManager.apply({
    hook: 'generalInfo',
    args: [],
    type: PluginHookType.SeriesMerge,
    memo: defaultInfos,
    pluginContext,
  });
  logger.logGeneralInfo({
    infos,
  });
  if (command !== 'config') {
    assert(resolvedConfig.model, 'Model is required');
    assert(resolvedConfig.smallModel, 'Small model is required');
  }
  const mcpClients = await createClients(
    resolvedConfig.mcpConfig.mcpServers || {},
  );
  const context: Context = {
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
  return context;
}

interface RunCliOpts {
  plugins: Plugin[];
  productName: string;
  root?: string;
  sessionPath?: string;
  npmName?: string;
  version?: string;
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
        h: 'help',
        i: 'interactive',
      },
      array: ['plugin'],
      boolean: ['plan', 'stream', 'quiet', 'help', 'interactive'],
    });
    let command = argv._[0] as string;
    const pkg = await import('../package.json');
    if (argv.version || command === 'version') {
      const name = opts.npmName || opts.productName.toLowerCase();
      const version = opts.version || pkg.version;
      console.log(`${name}@${version}`);
      return;
    }
    if (argv.help || command === 'help') {
      await (
        await import('./commands/help.js')
      ).runHelp({
        productName: opts.productName,
      });
      return;
    }
    context = await buildContext({ ...opts, argv, command });
    const pluginCommands = await context.pluginManager.apply({
      hook: 'commands',
      args: [],
      memo: [],
      type: PluginHookType.SeriesMerge,
      pluginContext: context.pluginContext,
    });
    const matchedCommand = pluginCommands.find(
      (c: Command) => c.name === command,
    );
    if (matchedCommand) {
      logger.logCommand({ command });
      await matchedCommand.fn();
    } else {
      switch (command) {
        case 'plan':
          logger.logCommand({ command });
          await (await import('./commands/plan.js')).runPlan({ context });
          break;
        case 'init':
          logger.logCommand({ command });
          await (await import('./commands/init.js')).runInit({ context });
          break;
        case 'config':
          logger.logCommand({ command: 'config' });
          await (await import('./commands/config.js')).runConfig({ context });
          break;
        case 'commit':
          logger.logCommand({ command });
          await (await import('./commands/commit.js')).runCommit({ context });
          break;
        case 'watch':
          logger.logCommand({ command });
          await (await import('./commands/watch.js')).runWatch({ context });
          break;
        case 'test':
          logger.logCommand({ command });
          await (await import('./commands/test.js')).runTest({ context });
          break;
        case 'ask':
          logger.logCommand({ command });
          const prompt = argv._[1] as string;
          await (await import('./commands/ask.js')).runAsk({ context, prompt });
          break;
        case 'lint':
          logger.logCommand({ command });
          await (await import('./commands/lint.js')).runLint({ context });
          break;
        case 'run':
          logger.logCommand({ command });
          const runPrompt = argv._[1] as string;
          await (
            await import('./commands/run.js')
          ).runRun({ context, prompt: runPrompt });
          break;
        default:
          await (
            await import('./commands/act.js')
          ).runAct({ context, prompt: command });
          break;
      }
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
