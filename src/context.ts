import { Tool } from '@openai/agents';
import createDebug from 'debug';
import { createRequire } from 'module';
import resolve from 'resolve';
import { Config, ConfigManager } from './config';
import { PRODUCT_NAME } from './constants';
import { MCPManager } from './mcp';
import {
  Plugin,
  PluginApplyOpts,
  PluginHookType,
  PluginManager,
} from './plugin';

const debug = createDebug('takumi:context');

type ContextOpts = CreateContextOpts & {
  config: Config;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
};

interface CreateContextOpts {
  cwd: string;
  argvConfig?: Partial<Config>;
  productName?: string;
  version?: string;
}

export class Context {
  cwd: string;
  productName: string;
  version: string;
  config: Config;
  pluginManager: PluginManager;
  mcpManager: MCPManager;
  mcpTools: Tool[];
  constructor(opts: ContextOpts) {
    this.cwd = opts.cwd;
    this.productName = opts.productName || PRODUCT_NAME;
    this.version = opts.version || '0.0.0';
    this.config = opts.config;
    this.pluginManager = opts.pluginManager;
    this.mcpManager = opts.mcpManager;
    this.mcpTools = opts.mcpTools;
  }

  async apply(applyOpts: Omit<PluginApplyOpts, 'pluginContext'>) {
    return this.pluginManager.apply({
      ...applyOpts,
      pluginContext: this,
    });
  }

  async destroy() {
    await this.mcpManager.destroy();
  }
}

export async function createContext(opts: CreateContextOpts): Promise<Context> {
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
  ];
  const plugins = normalizePlugins(opts.cwd, pluginsConfigs);
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

  const mcpManager = new MCPManager(resolvedConfig.mcpServers);
  await mcpManager.connect();
  const mcpTools = await mcpManager.getAllTools();
  debug('mcpManager connected');

  return new Context({
    ...opts,
    config: resolvedConfig,
    pluginManager,
    mcpManager,
    mcpTools,
  });
}

function normalizePlugins(cwd: string, plugins: (string | Plugin)[]) {
  const require = createRequire(import.meta.url);
  return plugins.map((plugin) => {
    if (typeof plugin === 'string') {
      const pluginPath = resolve.sync(plugin, { basedir: cwd });
      const pluginObject = require(pluginPath);
      return pluginObject.default || pluginObject;
    }
    return plugin;
  });
}
