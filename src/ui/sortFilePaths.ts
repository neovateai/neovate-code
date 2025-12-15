import { extname } from 'pathe';

const LANGUAGE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'go',
  'rs',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'rb',
  'swift',
  'kt',
  'scala',
  'cs',
  'php',
  'vue',
  'svelte',
]);

const DOC_CONFIG_EXTENSIONS = new Set([
  'md',
  'txt',
  'rst',
  'adoc',
  'json',
  'yaml',
  'yml',
  'toml',
]);

function getExtension(path: string): string {
  const ext = extname(path);
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Returns category priority for a file path:
 * - 0: Language files (highest priority)
 * - 1: Other files
 * - 2: Doc/config files (lowest priority)
 */
function getCategoryPriority(path: string): number {
  const ext = getExtension(path).toLowerCase();
  if (LANGUAGE_EXTENSIONS.has(ext)) {
    return 0;
  }
  if (DOC_CONFIG_EXTENSIONS.has(ext)) {
    return 2;
  }
  return 1;
}

/**
 * Returns relevance score for a file path based on query match:
 * - 0: Filename starts with query (highest relevance)
 * - 1: Full path starts with query
 * - 2: Filename contains query
 * - 3: Path contains query somewhere (lowest relevance)
 */
function getRelevanceScore(path: string, query: string): number {
  if (!query) return 3;

  const lowerPath = path.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Get filename from path
  const parts = path.split('/');
  const filename = parts[parts.length - 1].toLowerCase();

  if (filename.startsWith(lowerQuery)) {
    return 0;
  }
  if (lowerPath.startsWith(lowerQuery)) {
    return 1;
  }
  if (filename.includes(lowerQuery)) {
    return 2;
  }
  return 3;
}

/**
 * Sorts file paths by category (language > other > doc/config)
 * and then by relevance to the query within each category.
 */
export function sortFilePaths(paths: string[], query: string): string[] {
  return [...paths].sort((a, b) => {
    // First, sort by category priority
    const categoryA = getCategoryPriority(a);
    const categoryB = getCategoryPriority(b);
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    // Within the same category, sort by relevance
    const relevanceA = getRelevanceScore(a, query);
    const relevanceB = getRelevanceScore(b, query);
    if (relevanceA !== relevanceB) {
      return relevanceA - relevanceB;
    }

    // If same category and relevance, sort alphabetically
    return a.localeCompare(b);
  });
}
