import createDebug from 'debug';
import { EventEmitter } from 'events';

const debug = createDebug('takumi:dataSource');

export interface SourceOptions<T> {
  fetcher: () => Promise<T>;
  ttl?: number;
  dependencies?: string[];
  onInvalidate?: () => void;
  transform?: (data: T) => T;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

interface FetchContext {
  key: string;
  force?: boolean;
}

type Middleware = (
  context: FetchContext,
  next: () => Promise<any>,
) => Promise<any>;

interface Stats {
  hits: number;
  misses: number;
  fetches: number;
  invalidations: number;
}

export class DataSource<
  T extends Record<string, any> = Record<string, any>,
> extends EventEmitter {
  private sources = new Map<keyof T, SourceOptions<any>>();
  private cache = new Map<keyof T, CacheEntry<any>>();
  private fetchingPromises = new Map<keyof T, Promise<any>>();
  private middlewares: Middleware[] = [];
  private stats: Stats = {
    hits: 0,
    misses: 0,
    fetches: 0,
    invalidations: 0,
  };

  constructor() {
    super();
  }

  /**
   * Register a data source
   */
  register<K extends keyof T>(key: K, options: SourceOptions<T[K]>): this {
    debug(`Registering source: ${String(key)}`);
    this.sources.set(key, options);
    return this;
  }

  /**
   * Unregister a data source
   */
  unregister<K extends keyof T>(key: K): this {
    debug(`Unregistering source: ${String(key)}`);
    this.sources.delete(key);
    this.cache.delete(key);
    this.fetchingPromises.delete(key);
    return this;
  }

  /**
   * Get data from a source (single key)
   */
  async get<K extends keyof T>(
    key: K,
    options?: { force?: boolean },
  ): Promise<T[K]>;
  /**
   * Get data from multiple sources (array of keys)
   */
  async get<K extends keyof T>(
    keys: K[],
    options?: { force?: boolean },
  ): Promise<Pick<T, K>>;
  async get<K extends keyof T>(
    keyOrKeys: K | K[],
    options: { force?: boolean } = {},
  ): Promise<T[K] | Pick<T, K>> {
    if (Array.isArray(keyOrKeys)) {
      return this.getMultiple(keyOrKeys, options);
    }
    return this.getSingle(keyOrKeys, options);
  }

  private async getSingle<K extends keyof T>(
    key: K,
    options: { force?: boolean } = {},
  ): Promise<T[K]> {
    const source = this.sources.get(key);
    if (!source) {
      throw new Error(`Source not registered: ${String(key)}`);
    }

    // Check if we're already fetching this data
    const existingPromise = this.fetchingPromises.get(key);
    if (existingPromise && !options.force) {
      debug(`Reusing existing fetch promise for: ${String(key)}`);
      return existingPromise;
    }

    // Check cache
    if (!options.force) {
      const cached = this.getFromCache(key);
      if (cached !== undefined) {
        this.stats.hits++;
        debug(`Cache hit for: ${String(key)}`);
        return cached;
      }
    }

    this.stats.misses++;
    debug(`Cache miss for: ${String(key)}, fetching...`);

    // Fetch data with middleware
    const fetchPromise = this.executeFetch(key, source, options);
    this.fetchingPromises.set(key, fetchPromise);

    try {
      const data = await fetchPromise;
      return data;
    } finally {
      this.fetchingPromises.delete(key);
    }
  }

  private async getMultiple<K extends keyof T>(
    keys: K[],
    options: { force?: boolean } = {},
  ): Promise<Pick<T, K>> {
    const promises = keys.map((key) =>
      this.getSingle(key, options).then((data) => ({ key, data })),
    );

    const results = await Promise.all(promises);
    const data = {} as Pick<T, K>;

    for (const { key, data: value } of results) {
      (data as any)[key] = value;
    }

    return data;
  }

  private async executeFetch<K extends keyof T>(
    key: K,
    source: SourceOptions<T[K]>,
    options: { force?: boolean },
  ): Promise<T[K]> {
    const context: FetchContext = { key: String(key), force: options.force };

    // Build middleware chain
    let index = 0;
    const next = async (): Promise<T[K]> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        return middleware(context, next);
      }

      // Actual fetch
      this.stats.fetches++;
      debug(`Fetching data for: ${String(key)}`);

      let data = await source.fetcher();

      // Apply transform if provided
      if (source.transform) {
        data = source.transform(data);
      }

      // Update cache
      this.setCache(key, data, source.ttl);

      // Emit event
      this.emit('fetched', key, data);
      this.emit(`fetched:${String(key)}`, data);

      return data;
    };

    return next();
  }

  private getFromCache<K extends keyof T>(key: K): T[K] | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (entry.ttl !== undefined) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        debug(`Cache expired for: ${String(key)}`);
        this.cache.delete(key);
        return undefined;
      }
    }

    return entry.data;
  }

  private setCache<K extends keyof T>(key: K, data: T[K], ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    debug(`Cache set for: ${String(key)}${ttl ? ` (TTL: ${ttl}ms)` : ''}`);
  }

  /**
   * Invalidate cache for specific key(s)
   */
  invalidate<K extends keyof T>(key: K): void;
  invalidate<K extends keyof T>(keys: K[]): void;
  invalidate<K extends keyof T>(keyOrKeys: K | K[]): void {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];

    for (const key of keys) {
      this.invalidateSingle(key);
    }
  }

  private invalidateSingle<K extends keyof T>(key: K): void {
    debug(`Invalidating cache for: ${String(key)}`);
    this.stats.invalidations++;

    const source = this.sources.get(key);
    if (source?.onInvalidate) {
      source.onInvalidate();
    }

    this.cache.delete(key);
    this.emit('invalidated', key);
    this.emit(`invalidated:${String(key)}`);

    // Invalidate dependencies
    this.invalidateDependents(key);
  }

  private invalidateDependents<K extends keyof T>(key: K): void {
    for (const [depKey, source] of this.sources.entries()) {
      if (source.dependencies?.includes(String(key))) {
        debug(
          `Invalidating dependent: ${String(depKey)} (depends on ${String(key)})`,
        );
        this.invalidateSingle(depKey);
      }
    }
  }

  /**
   * Invalidate all cached data
   */
  invalidateAll(): void {
    debug('Invalidating all cache');
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      this.invalidateSingle(key);
    }
  }

  /**
   * Force refresh data (alias for get with force: true)
   */
  async refresh<K extends keyof T>(key: K): Promise<T[K]>;
  async refresh<K extends keyof T>(keys: K[]): Promise<Pick<T, K>>;
  async refresh<K extends keyof T>(
    keyOrKeys: K | K[],
  ): Promise<T[K] | Pick<T, K>> {
    return this.get(keyOrKeys as any, { force: true });
  }

  /**
   * Subscribe to data changes
   */
  subscribe<K extends keyof T>(
    key: K,
    listener: (data: T[K]) => void,
  ): () => void {
    const eventName = `fetched:${String(key)}`;
    this.on(eventName, listener);

    // Return unsubscribe function
    return () => {
      this.off(eventName, listener);
    };
  }

  /**
   * Add middleware
   */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Get cache statistics
   */
  getStats(): Readonly<Stats> {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      fetches: 0,
      invalidations: 0,
    };
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Check if a source is registered
   */
  hasSource<K extends keyof T>(key: K): boolean {
    return this.sources.has(key);
  }

  /**
   * Get all registered source keys
   */
  getSourceKeys(): Array<keyof T> {
    return Array.from(this.sources.keys());
  }

  /**
   * Clear cache without triggering invalidation handlers
   */
  clearCache(): void {
    debug('Clearing cache');
    this.cache.clear();
  }

  /**
   * Destroy the DataSource and clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.sources.clear();
    this.cache.clear();
    this.fetchingPromises.clear();
    this.middlewares = [];
    this.resetStats();
  }
}

// Export built-in source factories
export { createGitSource } from './sources/gitSource';
export { createConfigSource } from './sources/configSource';
export { createFileTreeSource } from './sources/fileTreeSource';
export { createSystemSource } from './sources/systemSource';
export { createWorkspaceSource } from './sources/workspaceSource';
