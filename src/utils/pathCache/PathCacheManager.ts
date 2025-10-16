import { PathSearchEngine } from './PathSearchEngine';
import type { CacheEntry, PathSearchOptions, PathSearchResult } from './types';
import { CACHE_CONFIG } from './types';

export class PathCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private searchCache = new Map<string, string[]>();
  private searchEngine: PathSearchEngine;

  constructor(productName: string) {
    this.searchEngine = new PathSearchEngine(productName);
  }

  private getSearchKey(cwd: string, query: string): string {
    return `${cwd}:${query}`;
  }

  async search(cwd: string, query: string): Promise<string[]> {
    const searchKey = this.getSearchKey(cwd, query);

    const cached = this.searchCache.get(searchKey);
    if (cached) {
      return cached;
    }

    const { paths } = await this.getPaths(cwd);
    const lowerQuery = query.toLowerCase();
    const filtered = paths.filter((path) =>
      path.toLowerCase().includes(lowerQuery),
    );

    this.searchCache.set(searchKey, filtered);

    if (this.searchCache.size > CACHE_CONFIG.MAX_SEARCH_CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }

    return filtered;
  }

  async getPaths(
    cwd: string,
    options?: Omit<PathSearchOptions, 'cwd'>,
  ): Promise<PathSearchResult> {
    const cached = this.memoryCache.get(cwd);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_CONFIG.MEMORY_TTL) {
      return {
        paths: cached.paths,
        fromCache: true,
        truncated: false,
      };
    }

    const result = await this.searchEngine.scan({ cwd, ...options });

    this.memoryCache.set(cwd, {
      paths: result.paths,
      timestamp: now,
      cwd,
    });

    this.searchCache.clear();

    return result;
  }

  clearCache(cwd?: string): void {
    if (cwd) {
      this.memoryCache.delete(cwd);
      for (const key of this.searchCache.keys()) {
        if (key.startsWith(`${cwd}:`)) {
          this.searchCache.delete(key);
        }
      }
    } else {
      this.memoryCache.clear();
      this.searchCache.clear();
    }
  }
}
