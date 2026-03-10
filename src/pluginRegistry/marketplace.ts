import { exec } from 'child_process';
import fs from 'fs';
import path from 'pathe';
import { promisify } from 'util';
import { z } from 'zod';
import { resolveMarketplacePath } from './pluginDirResolver';

const execAsync = promisify(exec);

export const MarketplaceSourceSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('git'), url: z.string() }),
  z.object({ source: z.literal('url'), url: z.string() }),
]);
export type MarketplaceSource = z.infer<typeof MarketplaceSourceSchema>;

export const KnownMarketplaceEntrySchema = z.object({
  source: MarketplaceSourceSchema,
  installLocation: z.string(),
  lastUpdated: z.string(),
});
export type KnownMarketplaceEntry = z.infer<typeof KnownMarketplaceEntrySchema>;

export const KnownMarketplacesSchema = z.record(
  z.string(),
  KnownMarketplaceEntrySchema,
);
export type KnownMarketplaces = z.infer<typeof KnownMarketplacesSchema>;

export const MarketplacePluginSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  author: z
    .union([
      z.string(),
      z.object({ name: z.string(), email: z.string().optional() }),
    ])
    .optional(),
  source: z.union([
    z.string(),
    z.object({ source: z.literal('url'), url: z.string() }),
  ]),
  category: z.string().optional(),
  homepage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  strict: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  lspServers: z.record(z.string(), z.any()).optional(),
  mcpServers: z.record(z.string(), z.any()).optional(),
});
export type MarketplacePlugin = z.infer<typeof MarketplacePluginSchema>;

export const MarketplaceJsonSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  owner: z
    .object({ name: z.string(), email: z.string().optional() })
    .optional(),
  metadata: z
    .object({
      description: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
  plugins: z.array(MarketplacePluginSchema),
});
export type MarketplaceJson = z.infer<typeof MarketplaceJsonSchema>;

export const InstallCountsCacheSchema = z.object({
  version: z.number(),
  fetchedAt: z.string(),
  counts: z.array(
    z.object({
      plugin: z.string(),
      unique_installs: z.number(),
    }),
  ),
});
export type InstallCountsCache = z.infer<typeof InstallCountsCacheSchema>;

export type MarketplaceDeclaration = {
  name: string;
  source: string;
};

export class MarketplaceManager {
  #pluginsDir: string;
  #productName: string;

  constructor(opts: { pluginsDir: string; productName: string }) {
    this.#pluginsDir = opts.pluginsDir;
    this.#productName = opts.productName;
  }

  get knownMarketplacesPath(): string {
    return path.join(this.#pluginsDir, 'known_marketplaces.json');
  }

  get installCountsCachePath(): string {
    return path.join(this.#pluginsDir, 'install-counts-cache.json');
  }

  get marketplacesDir(): string {
    return path.join(this.#pluginsDir, 'marketplaces');
  }

  getKnownMarketplaces(): KnownMarketplaces {
    if (!fs.existsSync(this.knownMarketplacesPath)) return {};
    try {
      const raw = JSON.parse(
        fs.readFileSync(this.knownMarketplacesPath, 'utf-8'),
      );
      return KnownMarketplacesSchema.parse(raw);
    } catch {
      return {};
    }
  }

  saveKnownMarketplaces(data: KnownMarketplaces): void {
    const dir = path.dirname(this.knownMarketplacesPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.knownMarketplacesPath,
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  addMarketplace(
    name: string,
    source: MarketplaceSource,
    installLocation: string,
  ): void {
    const known = this.getKnownMarketplaces();
    known[name] = {
      source,
      installLocation,
      lastUpdated: new Date().toISOString(),
    };
    this.saveKnownMarketplaces(known);
  }

  removeMarketplace(name: string): void {
    const known = this.getKnownMarketplaces();
    delete known[name];
    this.saveKnownMarketplaces(known);
  }

  updateMarketplaceTimestamp(name: string): void {
    const known = this.getKnownMarketplaces();
    if (known[name]) {
      known[name].lastUpdated = new Date().toISOString();
      this.saveKnownMarketplaces(known);
    }
  }

  private cleanInstallLocationIfOrphan(
    installLocation: string,
    name: string,
  ): void {
    if (!fs.existsSync(installLocation)) return;
    const known = this.getKnownMarketplaces();
    if (known[name]) {
      throw new Error(`Marketplace "${name}" already exists.`);
    }
    if (fs.lstatSync(installLocation).isSymbolicLink()) {
      fs.unlinkSync(installLocation);
    } else {
      fs.rmSync(installLocation, { recursive: true, force: true });
    }
  }

  readMarketplaceJson(marketplaceDir: string): MarketplaceJson | null {
    const mpPath = resolveMarketplacePath(marketplaceDir, this.#productName);
    if (!mpPath) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(mpPath, 'utf-8'));
      return MarketplaceJsonSchema.parse(raw);
    } catch {
      return null;
    }
  }

  getInstallCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    if (!fs.existsSync(this.installCountsCachePath)) return counts;
    try {
      const raw = JSON.parse(
        fs.readFileSync(this.installCountsCachePath, 'utf-8'),
      );
      const parsed = InstallCountsCacheSchema.parse(raw);
      for (const entry of parsed.counts) {
        counts.set(entry.plugin, entry.unique_installs);
      }
    } catch {
      // ignore
    }
    return counts;
  }

  async addFromSource(
    name: string,
    source: string,
  ): Promise<{ name: string; pluginCount: number }> {
    const isLocalPath =
      source.startsWith('/') ||
      source.startsWith('./') ||
      source.startsWith('../') ||
      source.startsWith('~') ||
      /^[a-zA-Z]:[\/]/.test(source);

    if (isLocalPath) {
      const resolvedPath = path.resolve(source);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Path not found: ${resolvedPath}`);
      }

      const mktJson = this.readMarketplaceJson(resolvedPath);
      if (!mktJson) {
        throw new Error('Directory does not contain a valid marketplace.json.');
      }

      const registryName = mktJson.name || name;
      const installLocation = path.join(this.marketplacesDir, name);
      this.cleanInstallLocationIfOrphan(installLocation, registryName);

      if (registryName !== name) {
        const known = this.getKnownMarketplaces();
        if (known[registryName]) {
          throw new Error(`Marketplace "${registryName}" already exists.`);
        }
      }

      fs.mkdirSync(path.dirname(installLocation), { recursive: true });
      fs.symlinkSync(resolvedPath, installLocation);

      const marketplaceSource: MarketplaceSource = {
        source: 'url',
        url: resolvedPath,
      };
      this.addMarketplace(registryName, marketplaceSource, installLocation);

      return { name: registryName, pluginCount: mktJson.plugins.length };
    }

    let gitUrl: string;
    if (/^(https?:\/\/|git@|git:\/\/|ssh:\/\/)/.test(source)) {
      gitUrl = source;
    } else if (/^[^/]+\/[^/]+$/.test(source)) {
      gitUrl = `https://github.com/${source}.git`;
    } else {
      throw new Error(
        `Invalid source format: "${source}". Use owner/repo, a git URL, or a local path.`,
      );
    }

    const installLocation = path.join(this.marketplacesDir, name);
    this.cleanInstallLocationIfOrphan(installLocation, name);

    fs.mkdirSync(path.dirname(installLocation), { recursive: true });
    await execAsync(
      `git clone --depth 1 ${gitUrl} ${installLocation}`.replace(/\s+/g, ' '),
    );

    const mktJson = this.readMarketplaceJson(installLocation);
    if (!mktJson) {
      fs.rmSync(installLocation, { recursive: true, force: true });
      throw new Error('Cloned repo does not contain a valid marketplace.json.');
    }

    const registryName = mktJson.name || name;
    if (registryName !== name) {
      const known = this.getKnownMarketplaces();
      if (known[registryName]) {
        fs.rmSync(installLocation, { recursive: true, force: true });
        throw new Error(`Marketplace "${registryName}" already exists.`);
      }
    }
    const marketplaceSource: MarketplaceSource = {
      source: 'git',
      url: gitUrl,
    };
    this.addMarketplace(registryName, marketplaceSource, installLocation);

    return { name: registryName, pluginCount: mktJson.plugins.length };
  }

  async ensureMarketplaces(declarations: MarketplaceDeclaration[]): Promise<{
    added: string[];
    skipped: string[];
    failed: Array<{ name: string; error: string }>;
  }> {
    const added: string[] = [];
    const skipped: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    const known = this.getKnownMarketplaces();

    for (const decl of declarations) {
      if (known[decl.name]) {
        skipped.push(decl.name);
        continue;
      }
      try {
        await this.addFromSource(decl.name, decl.source);
        added.push(decl.name);
      } catch (error) {
        failed.push({
          name: decl.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { added, skipped, failed };
  }
}
