import fs from 'fs';
import { homedir } from 'os';
import { join, relative, sep } from 'pathe';

/**
 * Gets the global gitignore file path
 */
function getGlobalGitignorePath(): string | null {
  // Check common default locations
  const commonPaths = [
    join(homedir(), '.gitignore_global'),
    join(homedir(), '.config', 'git', 'ignore'),
    join(homedir(), '.gitignore'),
  ];

  for (const path of commonPaths) {
    try {
      if (fs.existsSync(path)) {
        return path;
      }
    } catch (_e) {
      // Continue to next path
    }
  }

  return null;
}

/**
 * Gets the repository-specific exclude file path
 */
function getRepoExcludePath(rootPath: string): string {
  return join(rootPath, '.git', 'info', 'exclude');
}

function parseIgnoreFiles(
  rootPath: string,
  productNames: string[],
): {
  patterns: string[];
  negationPatterns: string[];
} {
  const gitignorePath = join(rootPath, '.gitignore');
  const globalGitignorePath = getGlobalGitignorePath();
  const repoExcludePath = getRepoExcludePath(rootPath);

  const patterns: string[] = [];
  const negationPatterns: string[] = [];

  // Parse global gitignore first (lowest precedence)
  if (globalGitignorePath) {
    try {
      const globalContent = fs.readFileSync(globalGitignorePath, 'utf8');
      const {
        patterns: globalPatterns,
        negationPatterns: globalNegationPatterns,
      } = parseIgnoreContent(globalContent);
      patterns.push(...globalPatterns);
      negationPatterns.push(...globalNegationPatterns);
    } catch (_e) {
      // Global gitignore doesn't exist or can't be read
    }
  }

  // Parse .git/info/exclude second
  try {
    const repoExcludeContent = fs.readFileSync(repoExcludePath, 'utf8');
    const {
      patterns: excludePatterns,
      negationPatterns: excludeNegationPatterns,
    } = parseIgnoreContent(repoExcludeContent);
    patterns.push(...excludePatterns);
    negationPatterns.push(...excludeNegationPatterns);
  } catch (_e) {
    // .git/info/exclude doesn't exist or can't be read
  }

  // Parse .gitignore third
  try {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    const { patterns: gitPatterns, negationPatterns: gitNegationPatterns } =
      parseIgnoreContent(gitignoreContent);
    patterns.push(...gitPatterns);
    negationPatterns.push(...gitNegationPatterns);
  } catch (_e) {
    // .gitignore doesn't exist or can't be read
  }

  // Parse all product-specific ignore files (highest precedence)
  for (const productName of productNames) {
    const productIgnorePath = join(
      rootPath,
      `.${productName.toLowerCase()}ignore`,
    );
    try {
      const productIgnoreContent = fs.readFileSync(productIgnorePath, 'utf8');
      const {
        patterns: productPatterns,
        negationPatterns: productNegationPatterns,
      } = parseIgnoreContent(productIgnoreContent);
      patterns.push(...productPatterns);
      negationPatterns.push(...productNegationPatterns);
    } catch (_e) {
      // Product-specific ignore file doesn't exist or can't be read
    }
  }

  return { patterns, negationPatterns };
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
  productNames: string[] = ['neovate'],
): boolean {
  const { patterns, negationPatterns } = parseIgnoreFiles(
    rootPath,
    productNames,
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
