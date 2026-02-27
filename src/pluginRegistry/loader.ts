import { createJiti } from 'jiti';
import fs from 'fs';
import path from 'pathe';
import { OutputStyle } from '../outputStyle';
import type { Plugin } from '../plugin';
import type { InstalledPlugin, PluginManifest } from './types';
import { PluginManifestSchema } from './types';

export class PluginLoader {
  async loadInstalled(installed: InstalledPlugin): Promise<Plugin> {
    const manifestPath = path.join(installed.installPath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin manifest not found: ${manifestPath}`);
    }
    const manifest = PluginManifestSchema.parse(
      JSON.parse(fs.readFileSync(manifestPath, 'utf-8')),
    );
    return this.#manifestToPlugin(manifest, installed.installPath);
  }

  async #manifestToPlugin(
    manifest: PluginManifest,
    pluginRoot: string,
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

    if (manifest.skills?.length) {
      const skillPaths = manifest.skills.map((s) =>
        path.resolve(pluginRoot, s),
      );
      const existingSkill = plugin.skill;
      plugin.skill = async function (this: any) {
        const base = existingSkill ? await existingSkill.call(this) : [];
        return [...base, ...skillPaths];
      };
    }

    if (manifest.outputStyles?.length) {
      const stylePaths = manifest.outputStyles.map((s) =>
        path.resolve(pluginRoot, s),
      );
      const existingOutputStyle = plugin.outputStyle;
      plugin.outputStyle = async function (this: any) {
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

    if (manifest.commands?.length) {
      const cmdPaths = manifest.commands.map((c) =>
        path.resolve(pluginRoot, c),
      );
      const existingSlashCommand = plugin.slashCommand;
      plugin.slashCommand = async function (this: any) {
        const base = existingSlashCommand
          ? await existingSlashCommand.call(this)
          : [];
        const jiti = createJiti(import.meta.url);
        const cmds = await Promise.all(
          cmdPaths.map(async (p) => {
            return (await jiti.import(p, { default: true })) as any;
          }),
        );
        return [...base, ...cmds.flat()];
      };
    }

    if (manifest.mcpServers && Object.keys(manifest.mcpServers).length > 0) {
      const mcpConfig = manifest.mcpServers;
      const existingConfig = plugin.config;
      plugin.config = async function (this: any, opts) {
        const base = existingConfig
          ? await existingConfig.call(this, opts)
          : {};
        return {
          ...base,
          mcpServers: {
            ...((base as any).mcpServers || {}),
            ...mcpConfig,
          },
        };
      };
    }

    if (manifest.agents?.length) {
      (plugin as any).__agentPaths = manifest.agents.map((a) =>
        path.resolve(pluginRoot, a),
      );
    }

    return plugin;
  }
}
