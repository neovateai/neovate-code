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
