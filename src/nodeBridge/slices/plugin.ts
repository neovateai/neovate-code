import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import fs from 'fs';
import path from 'pathe';
import { ConfigManager } from '../../config';
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

function getConfigManager(context: Context): ConfigManager {
  return new ConfigManager(context.cwd, context.productName, {});
}

async function getMdFileNames(dir: string): Promise<string[]> {
  try {
    const exists = await fs.promises
      .access(dir)
      .then(() => true)
      .catch(() => false);
    if (!exists) return [];

    const files = await fs.promises.readdir(dir);
    return files
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''));
  } catch (error) {
    console.warn(`Failed to read directory ${dir}: ${error}`);
    return [];
  }
}

export function registerPluginHandlers(
  messageBus: MessageBus,
  getContext: (cwd: string) => Promise<Context>,
) {
  messageBus.registerHandler('plugin.list', async (data) => {
    const { cwd } = data;
    const context = await getContext(cwd);
    const registry = getRegistry(context);
    const configManager = getConfigManager(context);
    const enabledPlugins = configManager.config.enabledPlugins || {};
    const all = registry.getAll();
    return {
      success: true,
      data: {
        plugins: Object.entries(all).map(([key, p]) => ({
          name: p.name,
          version: p.version,
          scope: p.scope,
          enabled: enabledPlugins[key] === true,
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

      const pluginKey = marketplaceName
        ? `${pluginName}@${marketplaceName}`
        : pluginName;

      registry.register({
        name: pluginName,
        source: { type: 'local', path: installPath },
        scope: resolvedScope,
        installPath,
        version: pluginDef.version,
        marketplace: marketplaceName,
        installedAt: new Date().toISOString(),
      });

      const configManager = getConfigManager(context);
      configManager.setPluginEnabled(resolvedScope, pluginKey, true);

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
      const pluginKey = marketplace
        ? `${pluginName}@${marketplace}`
        : pluginName;
      const installer = getInstaller(context);
      await installer.uninstall(installed.installPath);
      registry.unregister(pluginName, marketplace);
      const configManager = getConfigManager(context);
      configManager.removePluginEnabled(pluginKey);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  messageBus.registerHandler('plugin.detail', async (data) => {
    const { cwd, pluginName, marketplace } = data;
    try {
      const context = await getContext(cwd);
      const registry = getRegistry(context);
      const configManager = getConfigManager(context);
      const enabledPlugins = configManager.config.enabledPlugins || {};
      const installed = registry.get(pluginName, marketplace);
      if (!installed) {
        return { success: false, error: `Plugin "${pluginName}" not found.` };
      }

      const pluginKey = marketplace
        ? `${pluginName}@${marketplace}`
        : pluginName;

      let description: string | undefined;
      let author: string | undefined;
      if (marketplace) {
        const manager = getMarketplaceManager(context);
        const known = manager.getKnownMarketplaces();
        const entry = known[marketplace];
        if (entry) {
          const mktJson = manager.readMarketplaceJson(entry.installLocation);
          const pluginDef = mktJson?.plugins.find((p) => p.name === pluginName);
          if (pluginDef) {
            description = pluginDef.description;
            author =
              typeof pluginDef.author === 'string'
                ? pluginDef.author
                : pluginDef.author?.name;
          }
        }
      }

      const components = {
        commands: [] as string[],
        agents: [] as string[],
        skills: [] as string[],
        mcpServers: [] as string[],
      };

      const manifestPath = path.join(
        installed.installPath,
        '.claude-plugin',
        'plugin.json',
      );

      const manifestExists = await fs.promises
        .access(manifestPath)
        .then(() => true)
        .catch(() => false);

      if (manifestExists) {
        try {
          const manifestContent = await fs.promises.readFile(
            manifestPath,
            'utf-8',
          );
          const manifest = JSON.parse(manifestContent);

          if (!description && manifest.description) {
            description = manifest.description;
          }
          if (!author && manifest.author) {
            author =
              typeof manifest.author === 'string'
                ? manifest.author
                : manifest.author?.name;
          }

          const commandsDir = path.join(installed.installPath, 'commands');
          components.commands = await getMdFileNames(commandsDir);

          if (manifest.commands) {
            const dirs = Array.isArray(manifest.commands)
              ? manifest.commands
              : [manifest.commands];
            for (const d of dirs) {
              const absDir = path.resolve(installed.installPath, d);

              if (!absDir.startsWith(installed.installPath)) {
                console.warn(
                  `Skipping unsafe command directory path: ${d} (resolved to ${absDir})`,
                );
                continue;
              }

              if (absDir === path.join(installed.installPath, 'commands')) {
                continue;
              }

              const dirExists = await fs.promises
                .access(absDir)
                .then(() => true)
                .catch(() => false);

              if (dirExists) {
                const mdFiles = await getMdFileNames(absDir);
                for (const cmdName of mdFiles) {
                  if (!components.commands.includes(cmdName)) {
                    components.commands.push(cmdName);
                  }
                }
              }
            }
          }

          const agentsDir = path.join(installed.installPath, 'agents');
          components.agents = await getMdFileNames(agentsDir);

          const skillsDir = path.join(installed.installPath, 'skills');
          const skillsDirExists = await fs.promises
            .access(skillsDir)
            .then(() => true)
            .catch(() => false);

          if (skillsDirExists) {
            const entries = await fs.promises.readdir(skillsDir, {
              withFileTypes: true,
            });
            components.skills = entries
              .filter((e) => e.isDirectory())
              .map((e) => e.name);
          }

          if (manifest.mcpServers) {
            if (typeof manifest.mcpServers === 'object') {
              components.mcpServers = Object.keys(manifest.mcpServers);
            }
          }

          const mcpPath = path.join(installed.installPath, '.mcp.json');
          const mcpExists = await fs.promises
            .access(mcpPath)
            .then(() => true)
            .catch(() => false);

          if (mcpExists) {
            try {
              const mcpContent = await fs.promises.readFile(mcpPath, 'utf-8');
              const content = JSON.parse(mcpContent);
              const servers = content.mcpServers || content;
              for (const key of Object.keys(servers)) {
                if (!components.mcpServers.includes(key)) {
                  components.mcpServers.push(key);
                }
              }
            } catch (error) {
              console.warn(
                `Failed to read .mcp.json for plugin "${pluginName}": ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        } catch (error) {
          console.warn(
            `Failed to parse plugin manifest for "${pluginName}": ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      return {
        success: true,
        data: {
          name: pluginName,
          version: installed.version,
          scope: installed.scope,
          enabled: enabledPlugins[pluginKey] === true,
          marketplace,
          description,
          author,
          installedAt: installed.installedAt,
          components,
        },
      };
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
    const installed = registry.get(pluginName, marketplace);
    if (!installed) {
      return { success: false, error: `Plugin "${pluginName}" not found.` };
    }
    const pluginKey = marketplace ? `${pluginName}@${marketplace}` : pluginName;
    const configManager = getConfigManager(context);
    configManager.setPluginEnabled(installed.scope, pluginKey, true);
    return { success: true };
  });

  messageBus.registerHandler('plugin.disable', async (data) => {
    const { cwd, pluginName, marketplace } = data;
    const context = await getContext(cwd);
    const registry = getRegistry(context);
    const installed = registry.get(pluginName, marketplace);
    if (!installed) {
      return { success: false, error: `Plugin "${pluginName}" not found.` };
    }
    const pluginKey = marketplace ? `${pluginName}@${marketplace}` : pluginName;
    const configManager = getConfigManager(context);
    configManager.setPluginEnabled(installed.scope, pluginKey, false);
    return { success: true };
  });

  messageBus.registerHandler('plugin.discover', async (data) => {
    const { cwd, marketplaceName } = data;
    const context = await getContext(cwd);
    const manager = getMarketplaceManager(context);
    const registry = getRegistry(context);
    const configManager = getConfigManager(context);
    const enabledPlugins = configManager.config.enabledPlugins || {};
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
        const installedKey = Object.keys(installedPlugins).find((key) => {
          const ip = installedPlugins[key];
          return ip.name === p.name && ip.marketplace === mktName;
        });
        const isInstalled = !!installedKey;
        plugins.push({
          name: p.name,
          description: p.description,
          marketplace: mktName,
          category: p.category,
          tags: p.tags,
          installed: isInstalled,
          enabled: installedKey
            ? enabledPlugins[installedKey] === true
            : undefined,
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
