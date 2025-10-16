import { PathSearchEngine } from './PathSearchEngine';
import type { CacheEntry, PathSearchOptions, PathSearchResult } from './types';
import { CACHE_CONFIG } from './types';

export class PathCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private searchEngine: PathSearchEngine;

  constructor(productName: string) {
    this.searchEngine = new PathSearchEngine(productName);
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

    return result;
  }

  clearCache(cwd?: string): void {
    if (cwd) {
      this.memoryCache.delete(cwd);
    } else {
      this.memoryCache.clear();
    }
  }
}
