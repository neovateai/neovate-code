import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { ModelProvider, Tool } from '@openai/agents';
import createDebug from 'debug';
import { createJiti } from 'jiti';
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
import { SystemPromptBuilder } from './system-prompt-builder';
import { aisdk } from './utils/ai-sdk';
import { getGitStatus } from './utils/git';

const debug = createDebug('takumi:context');

type ContextOpts = CreateContextOpts & {
  config: Config;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
  git: string | null;
  ide: IDE | null;
};

interface CreateContextOpts {
  cwd: string;
  argvConfig?: Partial<Config>;
  productName?: string;
  version?: string;
  plugins?: Plugin[];
}

export class Context {
  cwd: string;
  productName: string;
  version: string;
  config: Config;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
  git: string | null;
  ide: IDE | null;
  userPrompts: string[];
  constructor(opts: ContextOpts) {
    this.cwd = opts.cwd;
    this.productName = opts.productName || PRODUCT_NAME;
    this.version = opts.version || '0.0.0';
    this.config = opts.config;
    this.pluginManager = opts.pluginManager;
    this.mcpManager = opts.mcpManager;
    this.mcpTools = opts.mcpTools;
    this.git = opts.git;
    this.ide = opts.ide;
    this.userPrompts = [];
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

  addUserPrompt(prompt: string) {
    this.userPrompts.push(prompt);
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
  debug('createContext', opts);
  const configManager = new ConfigManager(
    opts.cwd,
    opts.productName || PRODUCT_NAME,
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

  return new Context({
    ...opts,
    config: resolvedConfig,
    pluginManager,
    mcpManager,
    mcpTools,
    git: gitStatus,
    ide,
  });
}

function normalizePlugins(cwd: string, plugins: (string | Plugin)[]) {
  const jiti = createJiti(import.meta.url);
  return Promise.all(
    plugins.map(async (plugin) => {
      if (typeof plugin === 'string') {
        const pluginPath = resolve.sync(plugin, { basedir: cwd });
        return await jiti.import(pluginPath, {
          default: true,
        });
      }
      return plugin;
    }),
  );
}
