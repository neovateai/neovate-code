import createDebug from 'debug';
import { createRequire } from 'module';
import resolve from 'resolve';
import { Config, ConfigManager } from './config';
import { PRODUCT_NAME } from './constants';
import {
  Plugin,
  PluginApplyOpts,
  PluginHookType,
  PluginManager,
} from './plugin';

const debug = createDebug('takumi:context');

interface ContextOpts {
  argvConfig?: Partial<Config>;
  cwd?: string;
  productName?: string;
  version?: string;
}

export class Context {
  cwd: string;
  productName: string;
  version: string;
  #config: Config;
  #pluginManager: PluginManager | null = null;
  #resolvedConfig: Config | null = null;
  constructor(opts: ContextOpts = {}) {
    this.cwd = opts.cwd || process.cwd();
    const productName = opts.productName || PRODUCT_NAME;
    this.productName = productName;
    this.version = opts.version || '0.0.0';
    const configManager = new ConfigManager(
      this.cwd,
      productName,
      opts.argvConfig || {},
    );
    this.#config = configManager.config;
  }

  get config() {
    if (!this.#resolvedConfig) {
      throw new Error('Config not resolved');
    }
    return this.#resolvedConfig;
  }

  async apply(applyOpts: Omit<PluginApplyOpts, 'pluginContext'>) {
    if (!this.#pluginManager) {
      throw new Error('Plugin manager not initialized');
    }
    return this.#pluginManager.apply({
      ...applyOpts,
      pluginContext: this,
    });
  }

  async init() {
    const buildinPlugins: Plugin[] = [];
    const pluginsConfigs: (string | Plugin)[] = [
      ...buildinPlugins,
      ...(this.#config.plugins || []),
    ];
    const plugins = normalizePlugins(this.cwd, pluginsConfigs);
    this.#pluginManager = new PluginManager(plugins);

    const config = this.#config;
    debug('config', config);
    const resolvedConfig = await this.apply({
      hook: 'config',
      args: [],
      memo: config,
      type: PluginHookType.SeriesMerge,
    });
    await this.apply({
      hook: 'configResolved',
      args: [{ resolvedConfig }],
      type: PluginHookType.Series,
    });
    debug('resolvedConfig', resolvedConfig);
    this.#resolvedConfig = resolvedConfig;
  }
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
