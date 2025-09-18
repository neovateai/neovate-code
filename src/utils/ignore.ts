import fs from 'fs';
import { join, relative, sep } from 'pathe';

interface IgnoreCache {
  mtime: number;
  patterns: string[];
  negationPatterns: string[];
}

// Cache for parsed ignore patterns
const ignoreCache = new Map<string, IgnoreCache>();

function parseIgnoreFiles(
  rootPath: string,
  productName: string,
): {
  patterns: string[];
  negationPatterns: string[];
} {
  const gitignorePath = join(rootPath, '.gitignore');
  const productIgnorePath = join(
    rootPath,
    `.${productName.toLowerCase()}ignore`,
  );

  const cacheKey = `${rootPath}:${productName}`;

  try {
    // Check modification times for both files
    let gitignoreMtime = 0;
    let productIgnoreMtime = 0;

    try {
      const gitignoreStats = fs.statSync(gitignorePath);
      gitignoreMtime = gitignoreStats.mtimeMs;
    } catch (e) {
      // .gitignore doesn't exist or can't be read
    }

    try {
      const productIgnoreStats = fs.statSync(productIgnorePath);
      productIgnoreMtime = productIgnoreStats.mtimeMs;
    } catch (e) {
      // .takumiignore doesn't exist or can't be read
    }

    const combinedMtime = Math.max(gitignoreMtime, productIgnoreMtime);

    // Check cache first
    const cached = ignoreCache.get(cacheKey);
    if (cached && cached.mtime === combinedMtime) {
      return {
        patterns: cached.patterns,
        negationPatterns: cached.negationPatterns,
      };
    }

    const patterns: string[] = [];
    const negationPatterns: string[] = [];

    // Parse .gitignore first
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const { patterns: gitPatterns, negationPatterns: gitNegationPatterns } =
        parseIgnoreContent(gitignoreContent);
      patterns.push(...gitPatterns);
      negationPatterns.push(...gitNegationPatterns);
    } catch (e) {
      // .gitignore doesn't exist or can't be read
    }

    // Parse .takumiignore second (takes precedence)
    try {
      const takumiIgnoreContent = fs.readFileSync(productIgnorePath, 'utf8');
      const {
        patterns: takumiPatterns,
        negationPatterns: takumiNegationPatterns,
      } = parseIgnoreContent(takumiIgnoreContent);
      patterns.push(...takumiPatterns);
      negationPatterns.push(...takumiNegationPatterns);
    } catch (e) {
      // .takumiignore doesn't exist or can't be read
    }

    // Cache the results
    ignoreCache.set(cacheKey, {
      mtime: combinedMtime,
      patterns,
      negationPatterns,
    });

    return { patterns, negationPatterns };
  } catch (error) {
    // If both files don't exist or can't be read, return empty patterns
    return { patterns: [], negationPatterns: [] };
  }
}

/**
 * Parses ignore file content and returns patterns
 */
function parseIgnoreContent(content: string): {
  patterns: string[];
  negationPatterns: string[];
} {
  const lines = content.split('\n');
  const patterns: string[] = [];
  const negationPatterns: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Handle negation patterns (starting with !)
    if (trimmed.startsWith('!')) {
      const pattern = trimmed.slice(1);
      negationPatterns.push(normalizePattern(pattern));
      continue;
    }

    patterns.push(normalizePattern(trimmed));
  }

  return { patterns, negationPatterns };
}

/**
 * Normalizes ignore patterns for simple pattern matching
 */
function normalizePattern(pattern: string): string {
  let normalized = pattern;

  // Handle leading slash (root-relative patterns)
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }

  // Handle trailing slash (directory-only patterns)
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Simple pattern matching for ignore patterns
 * Supports basic wildcards * and ** but not full glob syntax
 */
function matchesPattern(filePath: string, pattern: string): boolean {
  // Exact match
  if (filePath === pattern) {
    return true;
  }

  // Handle ** (match any number of directories)
  if (pattern.includes('**')) {
    const parts = pattern.split('**');
    if (parts.length === 2) {
      const [prefix, suffix] = parts;
      const prefixMatch = prefix === '' || filePath.startsWith(prefix);
      const suffixMatch = suffix === '' || filePath.endsWith(suffix);
      return prefixMatch && suffixMatch;
    }
  }

  // Handle single * wildcard
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]*') + '$');
    return regex.test(filePath);
  }

  // Directory pattern - match if file is under the directory
  if (filePath.startsWith(pattern + '/')) {
    return true;
  }

  return false;
}

/**
 * Checks if a file or directory should be ignored based on ignore rules
 */
export function isIgnored(
  filePath: string,
  rootPath: string,
  productName: string = 'neovate',
): boolean {
  const { patterns, negationPatterns } = parseIgnoreFiles(
    rootPath,
    productName,
  );

  // If no patterns, nothing is ignored
  if (patterns.length === 0 && negationPatterns.length === 0) {
    return false;
  }

  // Get relative path from root
  const relativePath = relative(rootPath, filePath);

  // Normalize path separators for cross-platform compatibility
  const normalizedPath = relativePath.split(sep).join('/');

  // Check if any ignore pattern matches
  let isIgnoredByPattern = false;
  for (const pattern of patterns) {
    if (matchesPattern(normalizedPath, pattern)) {
      isIgnoredByPattern = true;
      break;
    }
  }

  // If not ignored by any pattern, it's not ignored
  if (!isIgnoredByPattern) {
    return false;
  }

  // Check negation patterns - these override ignore patterns
  for (const pattern of negationPatterns) {
    if (matchesPattern(normalizedPath, pattern)) {
      return false; // Negation pattern matches, so don't ignore
    }
  }

  return true; // Ignored by pattern and no negation applies
}

/**
 * Checks if a file or directory name should be ignored (for performance when you only have the name)
 */
export function isIgnoredByName(
  fileName: string,
  rootPath: string,
  productName: string = 'neovate',
  isDirectory: boolean = false,
): boolean {
  // For relative paths within the root directory
  const testPath = join(rootPath, fileName);
  return isIgnored(testPath, rootPath, productName);
}
