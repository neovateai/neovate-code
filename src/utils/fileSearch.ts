import { AsyncFzf } from 'fzf';
import { listDirectory } from './list';

// ============================================================================
// Types
// ============================================================================

export interface SearchOptions {
  pattern: string;
  maxResults?: number;
  signal?: AbortSignal;
}

export interface SearchResult {
  paths: string[];
  hasMore: boolean;
  totalMatched: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
}

export interface FileSearchConfig {
  cwd: string;
  maxFiles?: number;
  cache?: CacheConfig;
  useGitignore?: boolean;
  disableFuzzy?: boolean;
}

// ============================================================================
// Error Classes
// ============================================================================

export class SearchAbortError extends Error {
  constructor() {
    super('Search aborted');
    this.name = 'SearchAbortError';
  }
}

export class SearchTimeoutError extends Error {
  constructor() {
    super('Search timeout');
    this.name = 'SearchTimeoutError';
  }
}

// ============================================================================
// File Cache
// ============================================================================

class FileCache {
  private cache = new Map<
    string,
    {
      files: string[];
      timestamp: number;
      fzf?: AsyncFzf<readonly string[]>;
    }
  >();

  private maxEntries = 10;

  get(cwd: string, ttl: number): string[] | null {
    const entry = this.cache.get(cwd);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      this.cache.delete(cwd);
      return null;
    }

    return entry.files;
  }

  set(cwd: string, files: string[], fzf?: AsyncFzf<readonly string[]>) {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cwd, {
      files,
      timestamp: Date.now(),
      fzf,
    });
  }

  getFzf(cwd: string): AsyncFzf<readonly string[]> | null {
    return this.cache.get(cwd)?.fzf ?? null;
  }

  setFzf(cwd: string, fzf: AsyncFzf<readonly string[]>) {
    const entry = this.cache.get(cwd);
    if (entry) {
      entry.fzf = fzf;
    }
  }

  invalidate(cwd: string) {
    this.cache.delete(cwd);
  }

  cleanup(ttl: number) {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const globalCache = new FileCache();

// ============================================================================
// Core Functions
// ============================================================================

async function crawlAllFiles(cwd: string, maxFiles: number): Promise<string[]> {
  try {
    const fs = await import('fs');
    if (!fs.existsSync(cwd)) {
      console.warn(`Directory does not exist: ${cwd}`);
      return [];
    }

    try {
      fs.accessSync(cwd, fs.constants.R_OK);
    } catch (error) {
      console.warn(`No read permission for: ${cwd}`);
      return [];
    }

    return listDirectory(cwd, cwd, maxFiles);
  } catch (error) {
    console.error('Failed to crawl files:', error);
    return [];
  }
}

function sortResults(paths: string[], _pattern: string): string[] {
  return paths.sort((a, b) => {
    const aIsDir = a.endsWith('/');
    const bIsDir = b.endsWith('/');

    if (aIsDir !== bIsDir) {
      return aIsDir ? -1 : 1;
    }

    return a < b ? -1 : a > b ? 1 : 0;
  });
}

function simpleStringMatch(
  files: string[],
  pattern: string,
  maxResults: number,
): string[] {
  const lowerPattern = pattern.toLowerCase();
  const matched = files
    .filter((file) => file.toLowerCase().includes(lowerPattern))
    .slice(0, maxResults);
  return sortResults(matched, pattern);
}

async function fuzzySearch(
  files: string[],
  pattern: string,
  options: { signal?: AbortSignal; maxResults?: number; cwd?: string },
): Promise<string[]> {
  const { signal, maxResults = 100, cwd } = options;

  if (!pattern || pattern.trim() === '') {
    const sorted = [...files].sort();
    return sorted.slice(0, maxResults);
  }

  if (signal?.aborted) {
    throw new SearchAbortError();
  }

  let fzf = cwd ? globalCache.getFzf(cwd) : null;

  if (!fzf) {
    const fuzzyVersion = files.length > 20000 ? 'v1' : 'v2';
    fzf = new AsyncFzf(files, {
      fuzzy: fuzzyVersion,
      limit: maxResults * 3,
    });

    if (cwd && files.length > 1000) {
      globalCache.setFzf(cwd, fzf);
    }
  }

  const results = await fzf.find(pattern);

  return results.map((result) => result.item).slice(0, maxResults * 2);
}

async function fuzzySearchWithTimeout(
  files: string[],
  pattern: string,
  options: {
    signal?: AbortSignal;
    maxResults?: number;
    timeout?: number;
    cwd?: string;
  },
): Promise<string[]> {
  const { signal, maxResults = 100, timeout = 10000, cwd } = options;

  if (signal?.aborted) {
    throw new SearchAbortError();
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new SearchTimeoutError()), timeout);
  });

  const searchPromise = fuzzySearch(files, pattern, {
    signal,
    maxResults,
    cwd,
  });

  try {
    return await Promise.race([searchPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof SearchTimeoutError) {
      console.warn('Fuzzy search timeout, falling back to simple match');
      return simpleStringMatch(files, pattern, maxResults);
    }
    throw error;
  }
}

// ============================================================================
// Main Export
// ============================================================================

export async function searchFiles(
  config: FileSearchConfig,
  options: SearchOptions,
): Promise<SearchResult> {
  const { cwd, maxFiles = 50000, cache, disableFuzzy = false } = config;
  const { pattern, maxResults = 100, signal } = options;

  const cacheTtl = cache?.ttl ?? 60000;

  // 1. Try to get from cache
  let allFiles = globalCache.get(cwd, cacheTtl);

  // 2. Cache miss, crawl files
  if (!allFiles) {
    allFiles = await crawlAllFiles(cwd, maxFiles);
    globalCache.set(cwd, allFiles);
  }

  // 3. Execute search
  let matched: string[];

  if (disableFuzzy) {
    matched = simpleStringMatch(allFiles, pattern, maxResults * 2);
  } else {
    matched = await fuzzySearchWithTimeout(allFiles, pattern, {
      signal,
      maxResults: maxResults * 2,
      cwd,
    });
  }

  // 4. Sort and truncate
  const sorted = sortResults(matched, pattern);
  const paths = sorted.slice(0, maxResults);

  return {
    paths,
    hasMore: sorted.length > maxResults,
    totalMatched: sorted.length,
  };
}

export function invalidateCache(cwd: string) {
  globalCache.invalidate(cwd);
}

export function cleanupCache(ttl: number = 60000) {
  globalCache.cleanup(ttl);
}
