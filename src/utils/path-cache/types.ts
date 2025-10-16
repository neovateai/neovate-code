export interface CacheEntry {
  paths: string[];
  timestamp: number;
  cwd: string;
}

export interface PathSearchOptions {
  cwd: string;
  maxFiles?: number;
  signal?: AbortSignal;
}

export interface PathSearchResult {
  paths: string[];
  fromCache: boolean;
  truncated: boolean;
}

export interface SearchCacheKey {
  cwd: string;
  query: string;
}

export const CACHE_CONFIG = {
  MEMORY_TTL: 10000,
  MAX_SEARCH_CACHE_SIZE: 100,
  DEBOUNCE_DELAY: 200,
  SCAN_TIMEOUT: 10000,
} as const;
