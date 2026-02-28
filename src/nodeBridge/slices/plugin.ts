import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import fs from 'fs';
import path from 'pathe';
import type { Context } from '../../context';
import type { MessageBus } from '../../messageBus';
import { PluginInstaller } from '../../pluginRegistry/installer';
import type { MarketplaceSource } from '../../pluginRegistry/marketplace';
import { MarketplaceManager } from '../../pluginRegistry/marketplace';
import { PluginRegistry } from '../../pluginRegistry/registry';

function getPluginsDir(context: Context): string {
  return path.join(context.paths.globalConfigDir, 'plugins');
}

function getMarketplaceManager(context: Context): MarketplaceManager {
  return new MarketplaceManager({ pluginsDir: getPluginsDir(context) });
}

function getRegistry(context: Context): PluginRegistry {
  return new PluginRegistry({
    registryPath: path.join(getPluginsDir(context), 'installed_plugins.json'),
  });
}

function getInstaller(context: Context): PluginInstaller {
  return new PluginInstaller({
    pluginsRoot: path.join(getPluginsDir(context), 'installed'),
  });
}

export function registerPluginHandlers(
  messageBus: MessageBus,
  getContext: (cwd: string) => Promise<Context>,
) {
  messageBus.registerHandler('plugin.list', async (data) => {
    const { cwd } = data;
    const context = await getContext(cwd);
    const registry = getRegistry(context);
    const all = registry.getAll();
    return {
      success: true,
      data: {
        plugins: Object.values(all).map((p) => ({
          name: p.name,
          version: p.version,
          scope: p.scope,
          enabled: p.enabled,
          installedAt: p.installedAt,
          marketplace: p.marketplace,
        })),
      },
    };
  });

  messageBus.registerHandler('plugin.install', async (data) => {
    const { cwd, pluginName, marketplaceName, scope: installScope } = data;
    try {
      const context = await getContext(cwd);
      const registry = getRegistry(context);
      const manager = getMarketplaceManager(context);
      const installer = getInstaller(context);

      const scopeMap: Record<string, 'global' | 'project' | 'local'> = {
        user: 'global',
        project: 'project',
        local: 'local',
      };
      const resolvedScope = scopeMap[installScope || 'user'] || 'global';

      const alreadyInstalled = Object.values(registry.getAll()).find(
        (p) => p.name === pluginName && p.marketplace === marketplaceName,
      );
      if (alreadyInstalled) {
        return {
          success: false,
          error: `Plugin "${pluginName}" is already installed.`,
        };
      }

      const known = manager.getKnownMarketplaces();
      const marketplaceEntry = known[marketplaceName];
      if (!marketplaceEntry) {
        return {
          success: false,
          error: `Marketplace "${marketplaceName}" not found.`,
        };
      }

      const marketplaceJson = manager.readMarketplaceJson(
        marketplaceEntry.installLocation,
      );
      if (!marketplaceJson) {
        return {
          success: false,
          error: `Cannot read marketplace.json for "${marketplaceName}".`,
        };
      }

      const pluginDef = marketplaceJson.plugins.find(
        (p) => p.name === pluginName,
      );
      if (!pluginDef) {
        return {
          success: false,
          error: `Plugin "${pluginName}" not found in marketplace "${marketplaceName}".`,
        };
      }

      let installPath: string;
      if (typeof pluginDef.source === 'string') {
        const sourcePath = path.resolve(
          marketplaceEntry.installLocation,
          pluginDef.source,
        );
        installPath = path.join(
          getPluginsDir(context),
          'installed',
          pluginName,
        );

        fs.mkdirSync(path.dirname(installPath), { recursive: true });
        if (fs.existsSync(installPath)) {
          const stats = fs.lstatSync(installPath);
          if (stats.isSymbolicLink()) {
            fs.unlinkSync(installPath);
          } else {
            fs.rmSync(installPath, { recursive: true });
          }
        }
        fs.symlinkSync(sourcePath, installPath);
      } else {
        const result = await installer.install({
          name: pluginName,
          source: { type: 'git', url: pluginDef.source.url },
          scope: resolvedScope,
        });
        installPath = result.installPath;
      }

      registry.register({
        name: pluginName,
        source: { type: 'local', path: installPath },
        scope: resolvedScope,
        installPath,
        version: pluginDef.version,
        marketplace: marketplaceName,
        installedAt: new Date().toISOString(),
        enabled: true,
      });

      return {
        success: true,
        data: { name: pluginName, version: pluginDef.version },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  messageBus.registerHandler('plugin.uninstall', async (data) => {
    const { cwd, pluginName, marketplace } = data;
    try {
      const context = await getContext(cwd);
      const registry = getRegistry(context);
      const installed = registry.get(pluginName, marketplace);
      if (!installed) {
        return { success: false, error: `Plugin "${pluginName}" not found.` };
      }
      const installer = getInstaller(context);
      await installer.uninstall(installed.installPath);
      registry.unregister(pluginName, marketplace);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  messageBus.registerHandler('plugin.enable', async (data) => {
    const { cwd, pluginName, marketplace } = data;
    const context = await getContext(cwd);
    const registry = getRegistry(context);
    if (!registry.get(pluginName, marketplace)) {
      return { success: false, error: `Plugin "${pluginName}" not found.` };
    }
    registry.setEnabled(pluginName, true, marketplace);
    return { success: true };
  });

  messageBus.registerHandler('plugin.disable', async (data) => {
    const { cwd, pluginName, marketplace } = data;
    const context = await getContext(cwd);
    const registry = getRegistry(context);
    if (!registry.get(pluginName, marketplace)) {
      return { success: false, error: `Plugin "${pluginName}" not found.` };
    }
    registry.setEnabled(pluginName, false, marketplace);
    return { success: true };
  });

  messageBus.registerHandler('plugin.discover', async (data) => {
    const { cwd, marketplaceName } = data;
    const context = await getContext(cwd);
    const manager = getMarketplaceManager(context);
    const registry = getRegistry(context);
    const installedPlugins = registry.getAll();

    const known = manager.getKnownMarketplaces();
    const marketplaceNames = marketplaceName
      ? [marketplaceName]
      : Object.keys(known);

    const plugins: Array<{
      name: string;
      description?: string;
      marketplace: string;
      category?: string;
      tags?: string[];
      installed: boolean;
      enabled?: boolean;
    }> = [];

    for (const mktName of marketplaceNames) {
      const entry = known[mktName];
      if (!entry) continue;
      const mktJson = manager.readMarketplaceJson(entry.installLocation);
      if (!mktJson) continue;

      for (const p of mktJson.plugins) {
        const installedPlugin = Object.values(installedPlugins).find(
          (ip) => ip.name === p.name && ip.marketplace === mktName,
        );
        plugins.push({
          name: p.name,
          description: p.description,
          marketplace: mktName,
          category: p.category,
          tags: p.tags,
          installed: !!installedPlugin,
          enabled: installedPlugin?.enabled,
        });
      }
    }

    return {
      success: true,
      data: { plugins, total: plugins.length },
    };
  });

  messageBus.registerHandler('plugin.marketplace.list', async (data) => {
    const { cwd } = data;
    const context = await getContext(cwd);
    const manager = getMarketplaceManager(context);
    const known = manager.getKnownMarketplaces();

    const marketplaces = Object.entries(known).map(([name, entry]) => {
      const mktJson = manager.readMarketplaceJson(entry.installLocation);
      return {
        name,
        source: entry.source,
        installLocation: entry.installLocation,
        lastUpdated: entry.lastUpdated,
        pluginCount: mktJson?.plugins.length || 0,
        description: mktJson?.description || mktJson?.metadata?.description,
        owner: mktJson?.owner?.name,
      };
    });

    return { success: true, data: { marketplaces } };
  });

  messageBus.registerHandler('plugin.marketplace.add', async (data) => {
    const { cwd, source } = data;
    try {
      const context = await getContext(cwd);
      const manager = getMarketplaceManager(context);

      const isLocalPath =
        source.startsWith('/') ||
        source.startsWith('./') ||
        source.startsWith('../') ||
        source.startsWith('~');

      if (isLocalPath) {
        const resolvedPath = path.resolve(source);
        if (!fs.existsSync(resolvedPath)) {
          return {
            success: false,
            error: `Path not found: ${resolvedPath}`,
          };
        }

        const mktJson = manager.readMarketplaceJson(resolvedPath);
        if (!mktJson) {
          return {
            success: false,
            error: 'Directory does not contain a valid marketplace.json.',
          };
        }

        const name =
          path.basename(resolvedPath).replace(/\.git$/, '') || 'unknown';
        const installLocation = path.join(manager.marketplacesDir, name);

        if (fs.existsSync(installLocation)) {
          return {
            success: false,
            error: `Marketplace "${name}" already exists.`,
          };
        }

        fs.mkdirSync(path.dirname(installLocation), { recursive: true });
        fs.symlinkSync(resolvedPath, installLocation);

        const marketplaceSource: MarketplaceSource = {
          source: 'url',
          url: resolvedPath,
        };
        manager.addMarketplace(name, marketplaceSource, installLocation);

        return {
          success: true,
          data: { name, pluginCount: mktJson.plugins.length },
        };
      }

      let gitUrl: string;
      if (/^(https?:\/\/|git@|git:\/\/|ssh:\/\/)/.test(source)) {
        gitUrl = source;
      } else if (/^[^/]+\/[^/]+$/.test(source)) {
        gitUrl = `https://github.com/${source}.git`;
      } else {
        return {
          success: false,
          error: `Invalid source format: "${source}". Use owner/repo, a git URL, or a local path.`,
        };
      }

      let name: string;
      if (source.startsWith('git@')) {
        const colonPath = source.split(':').pop() || '';
        name =
          colonPath
            .split('/')
            .pop()
            ?.replace(/\.git$/, '') || 'unknown';
      } else {
        name =
          source
            .split('/')
            .pop()
            ?.replace(/\.git$/, '') || 'unknown';
      }

      const installLocation = path.join(manager.marketplacesDir, name);

      if (fs.existsSync(installLocation)) {
        return {
          success: false,
          error: `Marketplace "${name}" already exists.`,
        };
      }

      fs.mkdirSync(path.dirname(installLocation), { recursive: true });
      await execAsync(
        `git clone --depth 1 ${gitUrl} ${installLocation}`.replace(/\s+/g, ' '),
      );

      const mktJson = manager.readMarketplaceJson(installLocation);
      if (!mktJson) {
        fs.rmSync(installLocation, { recursive: true, force: true });
        return {
          success: false,
          error: 'Cloned repo does not contain a valid marketplace.json.',
        };
      }

      const marketplaceSource: MarketplaceSource = {
        source: 'git',
        url: gitUrl,
      };

      manager.addMarketplace(name, marketplaceSource, installLocation);

      return {
        success: true,
        data: { name, pluginCount: mktJson.plugins.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  messageBus.registerHandler('plugin.marketplace.remove', async (data) => {
    const { cwd, name } = data;
    try {
      const context = await getContext(cwd);
      const manager = getMarketplaceManager(context);
      const known = manager.getKnownMarketplaces();
      const entry = known[name];
      if (!entry) {
        return {
          success: false,
          error: `Marketplace "${name}" not found.`,
        };
      }
      if (
        fs.existsSync(entry.installLocation) &&
        !fs.lstatSync(entry.installLocation).isSymbolicLink()
      ) {
        fs.rmSync(entry.installLocation, { recursive: true, force: true });
      }
      manager.removeMarketplace(name);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  messageBus.registerHandler('plugin.marketplace.update', async (data) => {
    const { cwd, name } = data;
    try {
      const context = await getContext(cwd);
      const manager = getMarketplaceManager(context);
      const known = manager.getKnownMarketplaces();
      const entry = known[name];
      if (!entry) {
        return {
          success: false,
          error: `Marketplace "${name}" not found.`,
        };
      }
      await execAsync('git pull', {
        cwd: entry.installLocation,
      });
      manager.updateMarketplaceTimestamp(name);
      const mktJson = manager.readMarketplaceJson(entry.installLocation);
      return {
        success: true,
        data: { name, pluginCount: mktJson?.plugins.length || 0 },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
