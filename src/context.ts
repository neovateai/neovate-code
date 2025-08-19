import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { type ModelProvider, type Tool } from '@openai/agents';
import createDebug from 'debug';
import fs from 'fs';
import { createJiti } from 'jiti';
import { homedir } from 'os';
import path from 'path';
import resolve from 'resolve';
import { type Config, ConfigManager } from './config';
import { PRODUCT_NAME } from './constants';
import { IDE } from './ide';
import { MCPManager } from './mcp';
import { OutputStyleManager } from './output-style';
import {
  type Plugin,
  type PluginApplyOpts,
  PluginHookType,
  PluginManager,
} from './plugin';
import { createJsonlPlugin } from './plugins/jsonl';
import { createStagewisePlugin } from './plugins/stagewise';
import { getModel } from './provider';
import {
  type SlashCommandRegistry,
  createSlashCommandRegistry,
} from './slash-commands';
import { SystemPromptBuilder } from './system-prompt-builder';
import { aisdk } from './utils/ai-sdk';
import { getEnv } from './utils/env';
import { getGitStatus, getLlmGitStatus } from './utils/git';
import { ModelInfo } from './utils/model';
import { parseJsonlHistory } from './utils/parseJsonl';
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
  outputStyleManager: OutputStyleManager;
  env: Env;
};

type Paths = {
  globalConfigDir: string;
  projectConfigDir: string;
  traceFile?: string;
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
  mcp?: boolean;
  stagewise?: boolean;
  history?: string[];
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
  outputStyleManager: OutputStyleManager;
  env: Env;
  modelInfo: ModelInfo;

  approvalMemory: {
    proceedOnce: Set<string>;
    proceedAlways: Set<string>;
    proceedAlwaysTool: Set<string>;
  };

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
    this.history = opts.history || [];
    this.paths = opts.paths;
    this.slashCommands = opts.slashCommands;
    this.outputStyleManager = opts.outputStyleManager;
    this.env = opts.env;
    this.modelInfo = new ModelInfo(this);

    this.approvalMemory = {
      proceedOnce: new Set(),
      proceedAlways: new Set(),
      proceedAlwaysTool: new Set(),
    };
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

  async getMcpTools(): Promise<Tool[]> {
    // Ensure MCP initialization is complete
    await this.mcpManager.initAsync();
    return this.mcpManager.getAvailableTools();
  }

  getMcpStatus() {
    return {
      isReady: this.mcpManager.isReady(),
      isLoading: this.mcpManager.isLoading(),
      servers: this.mcpManager.getAllServerStatus(),
    };
  }

  async destroy() {
    await this.mcpManager.destroy();
    await this.ide?.disconnect();
    await this.apply({
      hook: 'destroy',
      args: [],
      type: PluginHookType.Parallel,
    });
  }
}

async function createContext(opts: CreateContextOpts): Promise<Context> {
  const productName = opts.productName || PRODUCT_NAME;
  const lowerProductName = productName.toLowerCase();
  const paths = {
    globalConfigDir: path.join(homedir(), `.${lowerProductName}`),
    projectConfigDir: path.join(opts.cwd, `.${lowerProductName}`),
    traceFile: opts.traceFile,
  };
  const gitStatus = await getGitStatus({ cwd: opts.cwd });

  debug('createContext', opts);
  const configManager = new ConfigManager(
    opts.cwd,
    productName,
    opts.argvConfig || {},
  );
  const initialConfig = configManager.config;
  debug('initialConfig', initialConfig);

  const buildinPlugins: Plugin[] = [];
  if (opts.traceFile) {
    buildinPlugins.push(
      createJsonlPlugin({
        filePath: opts.traceFile,
        cwd: opts.cwd,
        version: opts.version || '0.0.0',
        gitBranch: gitStatus?.branch,
      }),
    );
  }
  if (opts.stagewise) {
    buildinPlugins.push(createStagewisePlugin({}));
  }
  // Scan for plugins in directories
  const globalPluginsDir = path.join(paths.globalConfigDir, 'plugins');
  const localPluginsDir = path.join(paths.projectConfigDir, 'plugins');
  const globalPlugins = scanPluginDirectory(globalPluginsDir);
  const localPlugins = scanPluginDirectory(localPluginsDir);

  const pluginsConfigs: (string | Plugin)[] = [
    ...buildinPlugins,
    ...globalPlugins,
    ...localPlugins,
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
    args: [{ config: initialConfig }],
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

  const mcpManager = MCPManager.create(
    opts.mcp ? resolvedConfig.mcpServers : {},
  );
  // Start async initialization in background
  if (opts.mcp && Object.keys(resolvedConfig.mcpServers).length > 0) {
    mcpManager.initAsync().catch((error) => {
      debug('MCP initialization failed:', error);
    });
  }
  // Initially empty, will be populated as servers connect
  const mcpTools: Tool[] = [];
  debug('mcpManager created (async initialization started)');

  const llmGitStatus = await getLlmGitStatus(gitStatus);
  debug('git status', gitStatus);

  const ide = new IDE();

  // Create a temporary context for slash command registry initialization
  const tempContextForSlash = {
    ...opts,
    config: resolvedConfig,
    pluginManager,
    mcpManager,
    mcpTools,
    git: llmGitStatus,
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

  // Create a temporary context for output style manager initialization
  const tempContextForOutputStyle = {
    ...tempContextForSlash,
    slashCommands,
  } as any;

  const outputStyleManager = new OutputStyleManager(tempContextForOutputStyle);

  // Load history from JSONL files when traceFile is provided
  let history = opts.history || [];
  if (opts.traceFile && !opts.history) {
    const traceDir = path.dirname(opts.traceFile);
    history = parseJsonlHistory(traceDir);
  }

  const context = new Context({
    cwd: opts.cwd,
    productName: opts.productName,
    version: opts.version,
    argvConfig: opts.argvConfig,
    plugins: opts.plugins,
    traceFile: opts.traceFile,
    history,
    config: resolvedConfig,
    pluginManager,
    mcpManager,
    mcpTools,
    git: llmGitStatus,
    ide,
    generalInfo,
    paths,
    slashCommands,
    outputStyleManager,
    env,
  });
  return context;
}

function scanPluginDirectory(pluginDir: string): string[] {
  try {
    if (!fs.existsSync(pluginDir)) {
      return [];
    }
    const files = fs.readdirSync(pluginDir);
    return files
      .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))
      .map((file) => path.join(pluginDir, file));
  } catch (error) {
    debug('Error scanning plugin directory %s: %s', pluginDir, error);
    return [];
  }
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
