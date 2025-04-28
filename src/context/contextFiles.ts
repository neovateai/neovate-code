// File context management module
import * as fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { logDebug, logError } from '../utils/logger';

interface FileContent {
  path: string;
  content: string;
}

interface CacheEntry {
  mtime: number;
  size: number;
  content: string;
}

/**
 * LRU cache implementation for storing file contents
 * @param maxSize Maximum number of entries in the cache
 */
class LRUFileCache {
  private maxSize: number;
  private cache: Map<string, CacheEntry>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Move to the end of the cache to mark as recently used
      this.cache.delete(key);
      this.cache.set(key, entry);
    }
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    // Remove existing entry to update its position in the cache
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, entry);

    // Evict least recently used entry if cache exceeds capacity
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
}

// Cache for storing file contents to avoid repeated disk reads
const FILE_CONTENTS_CACHE = new LRUFileCache(1000);

// Default list of glob patterns to ignore when scanning files
const DEFAULT_IGNORE_PATTERNS = `
# Binaries and large media
*.woff
*.exe
*.dll
*.bin
*.dat
*.pdf
*.png
*.jpg
*.jpeg
*.gif
*.bmp
*.tiff
*.ico
*.zip
*.tar
*.gz
*.rar
*.7z
*.mp3
*.mp4
*.avi
*.mov
*.wmv

# Build and distribution
build/*
dist/*

# Logs and temporary files
*.log
*.tmp
*.swp
*.swo
*.bak
*.old

# Python artifacts
*.egg-info/*
__pycache__/*
*.pyc
*.pyo
*.pyd
.pytest_cache/*
.ruff_cache/*
venv/*
.venv/*
env/*

# Rust artifacts
target/*
Cargo.lock

# Node.js artifacts
*.tsbuildinfo
node_modules/*
package-lock.json

# Environment files
.env/*

# Git
.git/*

# OS specific files
.DS_Store
Thumbs.db

# Hidden files
.*/*
.*
`;

/**
 * Loads and compiles ignore patterns into regular expressions
 * @returns Array of compiled RegExp patterns
 */
export function loadIgnorePatterns(): Array<RegExp> {
  try {
    const raw = DEFAULT_IGNORE_PATTERNS;
    const lines = raw.split(/\r?\n/);
    const cleaned = lines
      .map((l: string) => l.trim())
      .filter((l: string) => l && !l.startsWith('#'));

    // Convert each pattern to a RegExp with a leading '*/'.
    const regs = cleaned.map((pattern: string) => {
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const finalRe = `^(?:(?:(?:.*/)?)(?:${escaped}))$`;
      return new RegExp(finalRe, 'i');
    });
    return regs;
  } catch {
    return [];
  }
}

/**
 * Checks if a given path is ignored by any of the compiled patterns
 * @param p Path to check
 * @param compiledPatterns Array of RegExp patterns
 * @returns Boolean indicating if path should be ignored
 */
export function shouldIgnorePath(
  p: string,
  compiledPatterns: Array<RegExp>,
): boolean {
  const normalized = path.resolve(p);
  for (const regex of compiledPatterns) {
    if (regex.test(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Retrieves file contents for specified paths, handling directories recursively
 * @param opts Options containing ignore patterns and file paths
 * @returns Array of file contents with their paths
 */
export async function getFileContents(opts: {
  ignorePatterns: Array<RegExp>;
  files: string[];
}): Promise<Array<FileContent>> {
  const { ignorePatterns, files } = opts;
  const candidateFiles: Array<string> = [];

  // Process files and directories, respecting ignore patterns
  const queue: Array<string> = [...files];
  while (queue.length > 0) {
    const currentPath = queue.pop()!;
    try {
      const stat = await fs.stat(currentPath);
      if (stat.isDirectory()) {
        const dirents = await fs.readdir(currentPath, { withFileTypes: true });
        for (const dirent of dirents) {
          const resolved = path.resolve(currentPath, dirent.name);
          // Skip symlinks for safety
          const lstat = await fs.lstat(resolved);
          if (lstat.isSymbolicLink()) {
            continue;
          }
          if (dirent.isDirectory()) {
            if (!shouldIgnorePath(resolved, ignorePatterns)) {
              queue.push(resolved);
            }
          } else if (dirent.isFile()) {
            if (!shouldIgnorePath(resolved, ignorePatterns)) {
              candidateFiles.push(resolved);
            }
          }
        }
      } else if (stat.isFile()) {
        if (!shouldIgnorePath(currentPath, ignorePatterns)) {
          candidateFiles.push(currentPath);
        }
      }
    } catch (error) {
      // Skip inaccessible paths
      continue;
    }
  }

  const fileContents: Array<FileContent> = [];
  const seenPaths = new Set<string>();

  // Read file contents, using cache when possible
  for (const filePath of candidateFiles) {
    seenPaths.add(filePath);
    let st: fsSync.Stats | null = null;
    try {
      st = await fs.stat(filePath);
    } catch {
      continue;
    }
    if (!st) {
      continue;
    }

    const cEntry = FILE_CONTENTS_CACHE.get(filePath);
    if (
      cEntry &&
      Math.abs(cEntry.mtime - st.mtime.getTime()) < 1 &&
      cEntry.size === st.size
    ) {
      // Use cached content if file hasn't changed
      fileContents.push({ path: filePath, content: cEntry.content });
    } else {
      // Read file and update cache
      try {
        const buf = await fs.readFile(filePath);
        const content = buf.toString('utf-8');
        FILE_CONTENTS_CACHE.set(filePath, {
          mtime: st.mtime.getTime(),
          size: st.size,
          content,
        });
        fileContents.push({ path: filePath, content });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  // Clean up cache entries for files that no longer exist
  const currentKeys = [...FILE_CONTENTS_CACHE.keys()];
  for (const key of currentKeys) {
    if (!seenPaths.has(key)) {
      FILE_CONTENTS_CACHE.delete(key);
    }
  }

  // Sort files by path for consistent output
  fileContents.sort((a, b) => a.path.localeCompare(b.path));
  return fileContents;
}

/**
 * Renders file contents as XML for context processing
 * @param files Array of file contents
 * @returns XML string representation of files
 */
export function renderFilesToXml(files: Array<FileContent>): string {
  const fileContents = files
    .map(
      (fc) => `
    <file>
      <path>${fc.path}</path>
      <content><![CDATA[${fc.content}]]></content>
    </file>`,
    )
    .join('');

  return `<files>This section contains the contents of the repository's files.\n${fileContents}\n</files>`;
}

// TODO: Need to support @src
const FILE_PATTERN = /@([^\s"]+(?:\.[a-zA-Z0-9]+|\/[^\s"]+))(?:\s|"|$)/g;

const IGNORE_KEYWORDS = ['@codebase', '@bigfish'];

/**
 * Extracts file references from a prompt string
 * @param opts Options containing prompt and current working directory
 * @returns Array of file paths
 */
export async function getFilesByPrompt(opts: {
  prompt?: string;
  cwd: string;
}): Promise<string[]> {
  const { prompt, cwd } = opts;
  if (!prompt) {
    return [];
  }

  // Check if the prompt contains file reference markers and doesn't contain ignore keywords
  if (
    !prompt.includes('@') ||
    IGNORE_KEYWORDS.some((keyword) => prompt.includes(keyword))
  ) {
    return [];
  }

  const fileMatches = prompt.match(FILE_PATTERN);
  if (!fileMatches) {
    return [];
  }

  // Process found file references
  const promptFiles = (
    await Promise.all(
      fileMatches.map(async (fileRef) => {
        // Skip invalid references
        if (!fileRef?.startsWith('@')) {
          return null;
        }

        // Extract and parse file path
        const cleanPath = fileRef.replace('@', '').trim();
        const filePath = path.resolve(cwd, cleanPath);

        try {
          const stat = await fs.stat(filePath);
          return stat.isFile() || stat.isDirectory() ? filePath : null;
        } catch (error: any) {
          logError({
            error: `[file-context] File path does not exist: ${filePath}, error: ${error.message}`,
          });
          return null;
        }
      }),
    )
  ).filter((item) => item !== null);

  // Record results and return
  if (promptFiles.length > 0) {
    logDebug(
      `[file-context] Detected file references: ${promptFiles.join(', ')}`,
    );
    return promptFiles;
  }

  logDebug(`[file-context] No valid file references detected`);
  return [];
}

/**
 * Gets file context for specified files
 * @param files Array of file paths to process
 * @returns XML string containing file contents
 */
export async function getFileContext(files: string[]): Promise<string> {
  const ignorePatterns = loadIgnorePatterns();
  const fileContents = await getFileContents({
    files,
    ignorePatterns,
  });
  const xml = renderFilesToXml(fileContents);
  logDebug(
    `[file-context] Generated file context with ${fileContents.length} files`,
  );
  return xml;
}
