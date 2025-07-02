import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { ModelProvider, Tool } from '@openai/agents';
import createDebug from 'debug';
import { createJiti } from 'jiti';
import { homedir } from 'os';
import path from 'path';
import resolve from 'resolve';
import { Config, ConfigManager } from './config';
import { PRODUCT_NAME } from './constants';
import { IDE } from './ide';
import { MCPManager } from './mcp';
import {
  Plugin,
  PluginApplyOpts,
  PluginHookType,
  PluginManager,
} from './plugin';
import { getModel } from './provider';
import {
  SlashCommandRegistry,
  createSlashCommandRegistry,
} from './slash-commands';
import { SystemPromptBuilder } from './system-prompt-builder';
import { aisdk } from './utils/ai-sdk';
import { getGitStatus } from './utils/git';
import { relativeToHome } from './utils/path';

const debug = createDebug('takumi:context');

type ContextOpts = CreateContextOpts & {
  config: Config;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
  git: string | null;
  ide: IDE | null;
  generalInfo: Record<string, string>;
  paths: Paths;
  slashCommands: SlashCommandRegistry;
};

type Paths = {
  globalConfigDir: string;
  projectConfigDir: string;
};

export interface CreateContextOpts {
  cwd: string;
  argvConfig?: Partial<Config>;
  productName?: string;
  version?: string;
  plugins?: Plugin[];
  traceFile?: string;
}

export class Context {
  cwd: string;
  productName: string;
  version: string;
  config: Config;
  argvConfig: Partial<Config>;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
  git: string | null;
  ide: IDE | null;
  history: string[];
  generalInfo: Record<string, string>;
  paths: Paths;
  slashCommands: SlashCommandRegistry;
  constructor(opts: ContextOpts) {
    this.cwd = opts.cwd;
    this.productName = opts.productName || PRODUCT_NAME;
    this.version = opts.version || '0.0.0';
    this.config = opts.config;
    this.argvConfig = opts.argvConfig || {};
    this.pluginManager = opts.pluginManager;
    this.mcpManager = opts.mcpManager;
    this.mcpTools = opts.mcpTools;
    this.git = opts.git;
    this.ide = opts.ide;
    this.generalInfo = opts.generalInfo;
    this.history = [];
    this.paths = opts.paths;
    this.slashCommands = opts.slashCommands;
  }

  static async create(opts: CreateContextOpts) {
    const context = await createContext(opts);
    return context;
  }

  getModelProvider(): ModelProvider {
    return {
      getModel: async (modelName?: string) => {
        const model = await this.apply({
          hook: 'model',
          args: [
            { modelName, aisdk, createOpenAI, createDeepSeek, createAnthropic },
          ],
          type: PluginHookType.First,
        });
        return model || (await getModel(modelName));
      },
    };
  }

  addHistory(prompt: string) {
    this.history.push(prompt);
  }

  async buildSystemPrompts() {
    // TODO: improve performance by caching
    const systemPromptBuilder = new SystemPromptBuilder(this);
    return await systemPromptBuilder.buildSystemPrompts();
  }

  async apply(applyOpts: Omit<PluginApplyOpts, 'pluginContext'>) {
    return this.pluginManager.apply({
      ...applyOpts,
      pluginContext: this,
    });
  }

  async destroy() {
    await this.mcpManager.destroy();
    await this.ide?.disconnect();
  }
}

async function createContext(opts: CreateContextOpts): Promise<Context> {
  const productName = opts.productName || PRODUCT_NAME;
  const lowerProductName = productName.toLowerCase();
  const paths = {
    globalConfigDir: path.join(homedir(), `.${lowerProductName}`),
    projectConfigDir: path.join(opts.cwd, `.${lowerProductName}`),
  };

  debug('createContext', opts);
  const configManager = new ConfigManager(
    opts.cwd,
    productName,
    opts.argvConfig || {},
  );
  const initialConfig = configManager.config;
  debug('initialConfig', initialConfig);

  const buildinPlugins: Plugin[] = [];
  const pluginsConfigs: (string | Plugin)[] = [
    ...buildinPlugins,
    ...(initialConfig.plugins || []),
    ...(opts.plugins || []),
  ];
  const plugins = await normalizePlugins(opts.cwd, pluginsConfigs);
  debug('plugins', plugins);
  const pluginManager = new PluginManager(plugins);

  const apply = async (hookOpts: any) => {
    return pluginManager.apply({ ...hookOpts, pluginContext: tempContext });
  };
  const tempContext = {
    ...opts,
    pluginManager,
    config: initialConfig,
    apply,
  };

  const resolvedConfig = await apply({
    hook: 'config',
    args: [],
    memo: initialConfig,
    type: PluginHookType.SeriesMerge,
  });
  debug('resolvedConfig', resolvedConfig);
  tempContext.config = resolvedConfig;
  await apply({
    hook: 'configResolved',
    args: [{ resolvedConfig }],
    type: PluginHookType.Series,
  });

  const generalInfo = await apply({
    hook: 'generalInfo',
    args: [],
    memo: {
      ...(opts.traceFile && { 'Log File': relativeToHome(opts.traceFile) }),
      Workspace: relativeToHome(opts.cwd),
      Model: resolvedConfig.model,
      ...(resolvedConfig.smallModel !== resolvedConfig.model && {
        'Small Model': resolvedConfig.smallModel,
      }),
      ...(resolvedConfig.planModel !== resolvedConfig.model && {
        'Planning Model': resolvedConfig.planModel,
      }),
    },
    type: PluginHookType.SeriesMerge,
  });
  debug('generalInfo', generalInfo);

  const mcpManager = await MCPManager.create(resolvedConfig.mcpServers);
  const mcpTools = await mcpManager.getAllTools();
  debug('mcpManager created');
  debug('mcpTools', mcpTools);

  const gitStatus = await getGitStatus({ cwd: opts.cwd });
  debug('git status', gitStatus);

  let ide: IDE | null = null;
  const ide2 = new IDE();
  const idePort = await ide2.findPort();
  debug('ide port', idePort);
  if (idePort) {
    try {
      await ide2.connect();
      ide = ide2;
      debug('ide connected');
    } catch (e) {
      debug('Failed to connect to IDE');
    }
  }

  // Create a temporary context for slash command registry initialization
  const tempContextForSlash = {
    ...opts,
    config: resolvedConfig,
    pluginManager,
    mcpManager,
    mcpTools,
    git: gitStatus,
    ide,
    generalInfo,
    paths,
    apply: async (hookOpts: any) => {
      return pluginManager.apply({
        ...hookOpts,
        pluginContext: tempContextForSlash,
      });
    },
  } as any;

  const slashCommands = await createSlashCommandRegistry(tempContextForSlash);

  return new Context({
    ...opts,
    config: resolvedConfig,
    pluginManager,
    mcpManager,
    mcpTools,
    git: gitStatus,
    ide,
    generalInfo,
    paths,
    slashCommands,
  });
}

function normalizePlugins(cwd: string, plugins: (string | Plugin)[]) {
  const jiti = createJiti(import.meta.url);
  return Promise.all(
    plugins.map(async (plugin) => {
      if (typeof plugin === 'string') {
        const pluginPath = resolve.sync(plugin, { basedir: cwd });
        return (await jiti.import(pluginPath, {
          default: true,
        })) as Plugin;
      }
      return plugin;
    }),
  );
}
