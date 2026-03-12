import { createJiti } from 'jiti';
import fs from 'fs';
import { glob } from 'glob';
import path from 'pathe';
import { OutputStyle, loadPolishedMarkdownFiles } from '../outputStyle';
import type { Plugin } from '../plugin';
import { fileToPromptCommand } from '../slashCommand';
import type { InstalledPlugin, PluginManifest } from './types';
import { PluginManifestSchema } from './types';
import { resolveManifestPath } from './pluginDirResolver';
import type { ScopedAgentPath, ScopedSkillPath } from './scopedTypes';

interface DiscoveredComponents {
  commandDirs: string[];
  agentPaths: string[];
  skillPaths: string[];
  mcpConfig: Record<string, any> | null;
}

export class PluginLoader {
  #productName: string;

  constructor(productName: string) {
    this.#productName = productName;
  }

  async loadInstalled(installed: InstalledPlugin): Promise<Plugin> {
    const manifestPath = resolveManifestPath(
      installed.installPath,
      this.#productName,
    );
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin manifest not found at: ${manifestPath}`);
    }
    const manifest = PluginManifestSchema.parse(
      JSON.parse(fs.readFileSync(manifestPath, 'utf-8')),
    );
    const discovered = this.#discoverComponents(installed.installPath);
    const merged = this.#mergeComponents(
      discovered,
      manifest,
      installed.installPath,
    );
    return this.#manifestToPlugin(manifest, installed.installPath, merged);
  }

  #discoverComponents(pluginRoot: string): DiscoveredComponents {
    const result: DiscoveredComponents = {
      commandDirs: [],
      agentPaths: [],
      skillPaths: [],
      mcpConfig: null,
    };

    const commandsDir = path.join(pluginRoot, 'commands');
    if (fs.existsSync(commandsDir)) {
      result.commandDirs.push(commandsDir);
    }

    const agentsDir = path.join(pluginRoot, 'agents');
    if (fs.existsSync(agentsDir)) {
      const files = glob.sync('*.md', { cwd: agentsDir });
      result.agentPaths = files.map((f) => path.join(agentsDir, f));
    }

    const skillsDir = path.join(pluginRoot, 'skills');
    if (fs.existsSync(skillsDir)) {
      const files = glob.sync('*/SKILL.md', { cwd: skillsDir });
      result.skillPaths = files.map((f) => path.join(skillsDir, f));
    }

    const mcpPath = path.join(pluginRoot, '.mcp.json');
    if (fs.existsSync(mcpPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
        result.mcpConfig = content.mcpServers || content;
      } catch {}
    }

    return result;
  }

  #mergeComponents(
    discovered: DiscoveredComponents,
    manifest: PluginManifest,
    pluginRoot: string,
  ): DiscoveredComponents {
    const merged: DiscoveredComponents = {
      commandDirs: [...discovered.commandDirs],
      agentPaths: [...discovered.agentPaths],
      skillPaths: [...discovered.skillPaths],
      mcpConfig: discovered.mcpConfig ? { ...discovered.mcpConfig } : null,
    };

    if (manifest.commands) {
      const customPaths = Array.isArray(manifest.commands)
        ? manifest.commands
        : [manifest.commands];
      for (const p of customPaths) {
        const absDir = path.resolve(pluginRoot, p);
        if (fs.existsSync(absDir) && !merged.commandDirs.includes(absDir)) {
          merged.commandDirs.push(absDir);
        }
      }
    }

    if (manifest.agents) {
      const customPaths = Array.isArray(manifest.agents)
        ? manifest.agents
        : [manifest.agents];
      for (const p of customPaths) {
        const absPath = path.resolve(pluginRoot, p);
        if (fs.existsSync(absPath)) {
          const stat = fs.statSync(absPath);
          if (stat.isDirectory()) {
            const files = glob.sync('*.md', { cwd: absPath });
            for (const f of files) {
              const full = path.join(absPath, f);
              if (!merged.agentPaths.includes(full)) {
                merged.agentPaths.push(full);
              }
            }
          } else if (!merged.agentPaths.includes(absPath)) {
            merged.agentPaths.push(absPath);
          }
        }
      }
    }

    if (manifest.skills) {
      for (const p of manifest.skills) {
        const absPath = path.resolve(pluginRoot, p);
        if (!merged.skillPaths.includes(absPath)) {
          merged.skillPaths.push(absPath);
        }
      }
    }

    if (typeof manifest.mcpServers === 'string') {
      const mcpFilePath = path.resolve(pluginRoot, manifest.mcpServers);
      if (fs.existsSync(mcpFilePath)) {
        try {
          const content = JSON.parse(fs.readFileSync(mcpFilePath, 'utf-8'));
          const fileMcp = content.mcpServers || content;
          merged.mcpConfig = { ...(merged.mcpConfig || {}), ...fileMcp };
        } catch {}
      }
    } else if (manifest.mcpServers && typeof manifest.mcpServers === 'object') {
      merged.mcpConfig = {
        ...(merged.mcpConfig || {}),
        ...manifest.mcpServers,
      };
    }

    return merged;
  }

  async #manifestToPlugin(
    manifest: PluginManifest,
    pluginRoot: string,
    components: DiscoveredComponents,
  ): Promise<Plugin> {
    const plugin: Plugin = { name: manifest.name };

    if (manifest.main) {
      const mainPath = path.resolve(pluginRoot, manifest.main);
      const jiti = createJiti(import.meta.url);
      const mainPlugin = (await jiti.import(mainPath, {
        default: true,
      })) as Plugin;
      Object.assign(plugin, mainPlugin);
    }

    if (components.commandDirs.length > 0) {
      const existingSlashCommand = plugin.slashCommand;
      plugin.slashCommand = async function (this) {
        const base = existingSlashCommand
          ? await existingSlashCommand.call(this)
          : [];
        const scopedBase = base.map((cmd) => ({
          ...cmd,
          name: `${manifest.name}:${cmd.name}`,
        }));
        const cmds = components.commandDirs.flatMap((dir) =>
          loadPolishedMarkdownFiles(dir).map((f) => {
            const cmd = fileToPromptCommand(f, manifest.name);
            return { ...cmd, name: `${manifest.name}:${cmd.name}` };
          }),
        );
        return [...scopedBase, ...cmds];
      };
    }

    if (components.agentPaths.length > 0) {
      const existingAgent = plugin.agent;
      plugin.agent = async function (this) {
        const base = existingAgent ? await existingAgent.call(this) : [];
        const scopedBase = base.map((item) => {
          if (typeof item === 'string')
            return { path: item, pluginName: manifest.name } as ScopedAgentPath;
          if ('path' in item && 'pluginName' in item) return item;
          return { ...item, agentType: `${manifest.name}:${item.agentType}` };
        });
        const scopedPaths: ScopedAgentPath[] = components.agentPaths.map(
          (p) => ({
            path: p,
            pluginName: manifest.name,
          }),
        );
        return [...scopedBase, ...scopedPaths];
      };
    }

    if (components.skillPaths.length > 0) {
      const existingSkill = plugin.skill;
      plugin.skill = async function (this) {
        const base = existingSkill ? await existingSkill.call(this) : [];
        const scopedBase = base.map((item) =>
          typeof item === 'string'
            ? { path: item, pluginName: manifest.name }
            : item,
        );
        const scopedPaths: ScopedSkillPath[] = components.skillPaths.map(
          (p) => ({
            path: p,
            pluginName: manifest.name,
          }),
        );
        return [...scopedBase, ...scopedPaths];
      };
    }

    if (manifest.outputStyles?.length) {
      const stylePaths = manifest.outputStyles.map((s) =>
        path.resolve(pluginRoot, s),
      );
      const existingOutputStyle = plugin.outputStyle;
      plugin.outputStyle = async function (this) {
        const base = existingOutputStyle
          ? await existingOutputStyle.call(this)
          : [];
        const styles = stylePaths.map((p) => {
          const content = fs.readFileSync(p, 'utf-8');
          const name = path.basename(p, path.extname(p));
          return new OutputStyle({
            name,
            description: name,
            isCodingRelated: false,
            prompt: content,
          });
        });
        return [...base, ...styles];
      };
    }

    if (components.mcpConfig) {
      const mcpConfig = replacePluginRoot(components.mcpConfig, pluginRoot);
      const existingConfig = plugin.config;
      plugin.config = async function (this, opts) {
        const base = existingConfig
          ? await existingConfig.call(this, opts)
          : {};
        return {
          ...base,
          mcpServers: {
            ...(base.mcpServers || {}),
            ...mcpConfig,
          },
        };
      };
    }

    return plugin;
  }
}

function replacePluginRoot(obj: any, pluginRoot: string): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/\$\{PLUGIN_ROOT\}/g, pluginRoot)
      .replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, pluginRoot);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replacePluginRoot(item, pluginRoot));
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replacePluginRoot(value, pluginRoot);
    }
    return result;
  }
  return obj;
}
