# File Suggestion Sorting by Type

**Date:** 2025-12-12

## Context

The current `useFileSuggestion.ts` hook provides file path suggestions when users type `@` in the chat input. The file list is returned from `utils.getPaths` and filtered based on the query, but the results are not sorted in a meaningful way.

The goal is to improve the developer experience by **prioritizing code files over documentation/config files** in the suggestion dropdown. When a developer types `@store`, they most likely want `src/store.ts` rather than `docs/store-guide.md`.

## Discussion

### Language Files (Priority 1)
**Question:** Which extensions should be prioritized as "language files"?

**Decision:** All common programming languages including:
- TypeScript/JavaScript: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`
- Other languages: `.py`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.h`, `.hpp`, `.rb`, `.swift`, `.kt`, `.scala`, `.cs`, `.php`, `.vue`, `.svelte`

### Doc/Config Files (Priority 3 - Last)
**Question:** Which file types should be considered as "doc files"?

**Decision:** Extended docs + config formats:
- Documentation: `.md`, `.txt`, `.rst`, `.adoc`
- Config: `.json`, `.yaml`, `.yml`, `.toml`

### Within-Category Sorting
**Question:** How should items be sorted within each category?

**Decision:** Relevance-based sorting:
1. Filename starts with query → highest priority
2. Full path starts with query
3. Filename contains query
4. Path contains query somewhere

### Implementation Approach
**Question:** Inline sorting vs. extracted utility module?

**Decision:** Extract a separate utility module (`sortFilePaths.ts`) for:
- Better testability in isolation
- Reusability in other parts of the codebase
- Cleaner separation of concerns

## Approach

Create a new utility function `sortFilePaths(paths: string[], query: string): string[]` that:

1. **Categorizes** each file by extension into three groups:
   - Language files (priority 0)
   - Other files (priority 1)
   - Doc/config files (priority 2)

2. **Scores** each file by relevance to the query:
   - Filename starts with query (score 0)
   - Path starts with query (score 1)
   - Filename contains query (score 2)
   - Path contains query (score 3)

3. **Sorts** by category first, then by relevance within each category

## Architecture

### New File: `src/ui/sortFilePaths.ts`

```typescript
const LANGUAGE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
  'rb', 'swift', 'kt', 'scala', 'cs', 'php', 'vue', 'svelte'
]);

const DOC_CONFIG_EXTENSIONS = new Set([
  'md', 'txt', 'rst', 'adoc',
  'json', 'yaml', 'yml', 'toml'
]);

function getExtension(path: string): string;
function getCategoryPriority(path: string): number;  // 0, 1, or 2
function getRelevanceScore(path: string, query: string): number;  // 0, 1, 2, or 3

export function sortFilePaths(paths: string[], query: string): string[];
```

### Modified File: `src/ui/useFileSuggestion.ts`

```typescript
import { sortFilePaths } from './sortFilePaths';

// In the matchedPaths useMemo:
const matchedPaths = useMemo(() => {
  if (!hasQuery) return [];
  
  let filtered = query === '' 
    ? paths 
    : paths.filter(path => path.toLowerCase().includes(query.toLowerCase()));
  
  return sortFilePaths(filtered, query);
}, [paths, hasQuery, query]);
```

### Example Behavior

Given query `"store"` and files:
```
README.md, package.json, src/store.ts, src/ui/store.ts, docs/store-guide.md, utils/dataStore.py
```

Sorted result:
```
src/store.ts          ← Language, filename starts with "store"
src/ui/store.ts       ← Language, filename starts with "store"
utils/dataStore.py    ← Language, filename contains "store"
package.json          ← Doc/config
README.md             ← Doc/config
docs/store-guide.md   ← Doc/config, contains "store"
```
