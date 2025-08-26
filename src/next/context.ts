import fs from 'fs';
import { createJiti } from 'jiti';
import path from 'path';
import resolve from 'resolve';
import { type Config, ConfigManager } from '../config';
import {
  type Plugin,
  type PluginApplyOpts,
  PluginHookType,
  PluginManager,
} from '../plugin';
import { Paths } from './paths';

type ContextOpts = {
  cwd: string;
  productName: string;
  version: string;
  config: Config;
  pluginManager: PluginManager;
  paths: Paths;
  argvConfig: Record<string, any>;
};

type ContextCreateOpts = {
  cwd: string;
  productName: string;
  version: string;
  argvConfig: Record<string, any>;
  plugins: (string | Plugin)[];
};

export class Context {
  cwd: string;
  productName: string;
  version: string;
  config: Config;
  paths: Paths;
  #pluginManager: PluginManager;
  #argvConfig: Record<string, any>;

  constructor(opts: ContextOpts) {
    this.cwd = opts.cwd;
    this.productName = opts.productName;
    this.version = opts.version;
    this.config = opts.config;
    this.paths = opts.paths;
    this.#pluginManager = opts.pluginManager;
    this.#argvConfig = opts.argvConfig;
  }

  async apply(applyOpts: Omit<PluginApplyOpts, 'pluginContext'>) {
    return this.#pluginManager.apply({
      ...applyOpts,
      pluginContext: this,
    });
  }

  async destroy() {
    await this.apply({
      hook: 'destroy',
      args: [],
      type: PluginHookType.Parallel,
    });
  }

  static async create(opts: ContextCreateOpts) {
    const { cwd, version } = opts;
    const productName = opts.productName.toLowerCase();
    const paths = new Paths({
      productName,
      cwd,
    });
    const configManager = new ConfigManager(
      cwd,
      productName,
      opts.argvConfig || {},
    );
    const initialConfig = configManager.config;
    const buildInPlugins: Plugin[] = [];
    const globalPlugins = scanPlugins(
      path.join(paths.globalConfigDir, 'plugins'),
    );
    const projectPlugins = scanPlugins(
      path.join(paths.projectConfigDir, 'plugins'),
    );
    const pluginsConfigs: (string | Plugin)[] = [
      ...buildInPlugins,
      ...globalPlugins,
      ...projectPlugins,
      ...(initialConfig.plugins || []),
      ...(opts.plugins || []),
    ];
    const plugins = await normalizePlugins(opts.cwd, pluginsConfigs);
    const pluginManager = new PluginManager(plugins);
    const apply = async (hookOpts: any) => {
      return pluginManager.apply({ ...hookOpts, pluginContext: tempContext });
    };
    const tempContext = {
      ...opts,
      config: initialConfig,
      apply,
      pluginManager,
    };
    const resolvedConfig = await apply({
      hook: 'config',
      args: [{ config: initialConfig }],
      memo: initialConfig,
      type: PluginHookType.SeriesMerge,
    });
    tempContext.config = resolvedConfig;
    await apply({
      hook: 'configResolved',
      args: [{ resolvedConfig }],
      type: PluginHookType.Series,
    });
    const argvConfig = await apply({
      hook: 'argvConfig',
      args: [{}],
      memo: { ...opts.argvConfig },
      type: PluginHookType.SeriesMerge,
    });
    return new Context({
      cwd,
      productName,
      version,
      pluginManager,
      argvConfig,
      config: resolvedConfig,
      paths,
    });
  }
}

function normalizePlugins(cwd: string, plugins: (string | Plugin)[]) {
  let jiti: any = null;
  return Promise.all(
    plugins.map(async (plugin) => {
      if (typeof plugin === 'string') {
        const pluginPath = resolve.sync(plugin, { basedir: cwd });
        if (!jiti) {
          jiti = createJiti(import.meta.url);
        }
        return (await jiti.import(pluginPath, {
          default: true,
        })) as Plugin;
      }
      return plugin;
    }),
  );
}

function scanPlugins(pluginDir: string): string[] {
  try {
    if (!fs.existsSync(pluginDir)) {
      return [];
    }
    const files = fs.readdirSync(pluginDir);
    return files
      .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))
      .map((file) => path.join(pluginDir, file));
  } catch (error) {
    return [];
  }
}
