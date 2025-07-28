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
import { StagewiseAgent } from './stagewise';
import { SystemPromptBuilder } from './system-prompt-builder';
import { aisdk } from './utils/ai-sdk';
import { getEnv } from './utils/env';
import { getGitStatus } from './utils/git';
import { ModelInfo } from './utils/model';
import { relativeToHome } from './utils/path';

type Env = {
  hasInternetAccess: boolean;
  platform: string;
  nodeVersion: string;
  terminal: string | null;
};

const debug = createDebug('takumi:context');

type ContextOpts = CreateContextOpts & {
  config: Config;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
  git: string | null;
  ide: IDE;
  generalInfo: Record<string, string>;
  paths: Paths;
  slashCommands: SlashCommandRegistry;
  env: Env;
  stagewise?: StagewiseAgent;
};

type Paths = {
  globalConfigDir: string;
  projectConfigDir: string;
};

type ArgvConfig = Partial<Config> & {
  appendSystemPrompt?: string;
};

export interface CreateContextOpts {
  cwd: string;
  argvConfig?: ArgvConfig;
  productName?: string;
  version?: string;
  plugins?: Plugin[];
  traceFile?: string;
  stagewise?: boolean;
}

export class Context {
  cwd: string;
  productName: string;
  version: string;
  config: Config;
  argvConfig: ArgvConfig;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
  git: string | null;
  ide: IDE;
  history: string[];
  generalInfo: Record<string, string>;
  paths: Paths;
  slashCommands: SlashCommandRegistry;
  env: Env;
  modelInfo: ModelInfo;
  stagewise?: StagewiseAgent;
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
    this.env = opts.env;
    this.modelInfo = new ModelInfo(this);
    this.stagewise = opts.stagewise;
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
    await this.stagewise?.stop();
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

  // Placed after config so we can customize prompts based on the user's model
  opts.argvConfig = await apply({
    hook: 'argvConfig',
    args: [{}],
    memo: opts.argvConfig,
    type: PluginHookType.SeriesMerge,
  });

  debug('argvConfig', opts.argvConfig);

  const env = await getEnv();
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

  const ide = new IDE();

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

  const context = new Context({
    cwd: opts.cwd,
    productName: opts.productName,
    version: opts.version,
    argvConfig: opts.argvConfig,
    plugins: opts.plugins,
    traceFile: opts.traceFile,
    config: resolvedConfig,
    pluginManager,
    mcpManager,
    mcpTools,
    git: gitStatus,
    ide,
    generalInfo,
    paths,
    slashCommands,
    env,
  });

  // Initialize Stagewise agent if enabled
  if (opts.stagewise) {
    try {
      const stagewise = new StagewiseAgent({
        context,
      });
      await stagewise.start();
      context.stagewise = stagewise;
      debug(`Stagewise agent started on port ${stagewise.port}`);
    } catch (error) {
      debug('Failed to start Stagewise agent:', error);
    }
  }

  return context;
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
