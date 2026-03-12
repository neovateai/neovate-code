import fs from 'fs';
import path from 'pathe';
import type { InstalledPlugin, PluginRegistryFile, PluginScope } from './types';
import { PluginRegistryFileSchema } from './types';

export class PluginRegistry {
  #filePath: string;
  #data: PluginRegistryFile;

  constructor(opts: { registryPath: string }) {
    this.#filePath = opts.registryPath;
    this.#data = this.#load();
  }

  getAll(): Record<string, InstalledPlugin> {
    return { ...this.#data.plugins };
  }

  getByScope(scope: PluginScope): InstalledPlugin[] {
    return Object.values(this.#data.plugins).filter((p) => p.scope === scope);
  }

  #pluginKey(plugin: { name: string; marketplace?: string }): string {
    return plugin.marketplace
      ? `${plugin.name}@${plugin.marketplace}`
      : plugin.name;
  }

  get(name: string, marketplace?: string): InstalledPlugin | undefined {
    if (marketplace) {
      return this.#data.plugins[`${name}@${marketplace}`];
    }
    return this.#data.plugins[name];
  }

  register(plugin: InstalledPlugin) {
    this.#data.plugins[this.#pluginKey(plugin)] = plugin;
    this.#save();
  }

  unregister(name: string, marketplace?: string) {
    const key = marketplace ? `${name}@${marketplace}` : name;
    delete this.#data.plugins[key];
    this.#save();
  }

  updateEntry(
    name: string,
    updates: Partial<InstalledPlugin>,
    marketplace?: string,
  ) {
    const key = marketplace ? `${name}@${marketplace}` : name;
    const plugin = this.#data.plugins[key];
    if (plugin) {
      Object.assign(plugin, updates, {
        lastUpdated: new Date().toISOString(),
      });
      this.#save();
    }
  }

  #load(): PluginRegistryFile {
    if (!fs.existsSync(this.#filePath)) {
      return { version: 1, plugins: {} };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(this.#filePath, 'utf-8'));
      return PluginRegistryFileSchema.parse(raw);
    } catch {
      return { version: 1, plugins: {} };
    }
  }

  #save() {
    const dir = path.dirname(this.#filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.#filePath,
      JSON.stringify(this.#data, null, 2),
      'utf-8',
    );
  }
}
