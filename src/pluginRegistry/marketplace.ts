import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';

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

export class MarketplaceManager {
  #pluginsDir: string;

  constructor(opts: { pluginsDir: string }) {
    this.#pluginsDir = opts.pluginsDir;
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

  readMarketplaceJson(marketplaceDir: string): MarketplaceJson | null {
    const candidates = [
      path.join(marketplaceDir, '.claude-plugin', 'marketplace.json'),
      path.join(
        marketplaceDir,
        `.${path.basename(this.#pluginsDir)}-plugin`,
        'marketplace.json',
      ),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          const raw = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
          return MarketplaceJsonSchema.parse(raw);
        } catch {
          return null;
        }
      }
    }
    return null;
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
}
