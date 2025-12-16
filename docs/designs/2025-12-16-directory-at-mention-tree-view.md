# Directory @-Mention Tree View

**Date:** 2025-12-16

## Context

Currently, when users use `@directory` syntax in prompts, the `src/at.ts` module processes it as a file group - recursively reading all files within the directory and returning their full content in XML format. This approach has limitations:

- Returns too much content for large directories
- Doesn't provide a quick overview of directory structure
- Inefficient when users just want to understand what's in a directory

The goal is to change the behavior so that when `@directory` is used, the system returns a tree structure visualization (similar to the output of `src/tools/ls.ts`) instead of reading all file contents.

## Discussion

### Key Questions & Decisions

**Q1: What format should the directory output use?**
- **Decision:** Tree structure with indentation (similar to `ls` tool output)
- Shows hierarchical relationships clearly
- Consistent with existing tool behavior

**Q2: How should files (non-directories) be handled?**
- **Decision:** Files should maintain current behavior (read and return full content)
- Only directories change to tree view
- This allows mixed usage: `@src @README.md` will show tree for `src` and content for `README.md`

**Q3: Should directory listing be recursive or single-level?**
- **Decision:** Recursive (reuse existing `listDirectory` logic from `ls.ts`)
- Matches the behavior users are familiar with from the ls tool
- Respects existing limits (MAX_FILES = 1000) and ignore patterns

**Q4: What tag should wrap directory tree output?**
- **Decision:** Use `<directory_structure>` tag
- Distinguishes from file content (`<files>` tag)
- Descriptive and clear

### Trade-offs Considered

**Approach A (Selected): Direct reuse of ls tool logic**
- ✅ Code reuse - leverage existing `listDirectory`, `createFileTree`, `printTree` functions
- ✅ Behavior consistency with ls tool
- ✅ No dependency injection issues
- ⚠️ Need to pass `productName` parameter through

**Approach B: Return marker and delegate to caller**
- ✅ Single responsibility for `at.ts`
- ❌ Requires broader refactoring of call chain
- ❌ More complex integration

**Approach C: Implement simplified tree in at.ts**
- ✅ Fully independent
- ❌ Code duplication
- ❌ Potential inconsistency with ls tool behavior

## Approach

Modify the `At` class in `src/at.ts` to:

1. **Detect and classify** `@` paths into files vs directories
2. **Process files** using existing `renderFilesToXml()` method
3. **Process directories** using a new `renderDirectoriesToTree()` method that:
   - Calls `listDirectory()` to get all files/subdirectories
   - Calls `createFileTree()` to build tree structure
   - Calls `printTree()` to format asadable string
   - Wraps output in `<directory_structure>` tags
4. **Merge results** from both file and directory processing

## Architecture

### Component Changes

**File: `src/at.ts`**

**New imports:**
```typescript
import {
  createFileTree,
  listDirectory,
  printTree,
} from './utils/list';
```

**Modified constructor:**
```typescript
private productName: string;

constructor(opts: { 
  userPrompt: string; 
  cwd: string; 
  productName?: string;
}) {
  this.userPrompt = opts.userPrompt;
  this.cwd = opts.cwd;
  this.productName = opts.productName || 'neovate-code';
}
```

**Refactored `getContent()` method:**
```typescript
getContent() {
  const prompt = this.userPrompt || '';
  const ats = this.extractAtPaths(prompt);
  const files: string[] = [];
  const directories: string[] = [];
  
  // Step 1: Classify files vs directories
  for (const at of ats) {
    const filePath = path.resolve(this.cwd, at);
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isFile()) {
        files.push(filePath);
      } else if (fs.statSync(filePath).isDirectory()) {
        directories.push(filePath);
      }
    }
  }
  
  // Step 2: Process separately and merge
  let result = '';
  if (files.length > 0) {
    result += this.renderFilesToXml(files);
  }
  if (directories.length > 0) {
    result += this.renderDirectoriesToTree(directories);
  }
  
  return result || null;
}
```

**New method `renderDirectoriesToTree()`:**
```typescript
private renderDirectoriesToTree(directories: string[]): string {
  let treeOutput = '';
  
  for (const dir of directories) {
    try {
      // Get file list using existing utility
      const fileList = listDirectory(
        dir, 
        this.cwd, 
        this.productName
      ).sort();
      
      // Handle empty directories
      if (fileList.length === 0) {
        treeOutput += `\n<directory_structure path="${path.relative(this.cwd, dir)}">\n(Empty directory)\n</directory_structure>`;
        continue;
      }
      
      // Build and format tree
      const tree = createFileTree(fileList);
      const treeString = printTree(dir, tree);
      
      treeOutput += `\n<directory_structure path="${path.relative(this.cwd, dir)}">\n${treeString}\n</directory_structure>`;
    } catch (error) {
      // Handle permission errors gracefully
      treeOutput += `\n<directory_structure path="${path.relative(this.cwd, dir)}">\nError: Unable to read directory\n</directory_structure>`;
    }
  }
  
  return treeOutput;
}
```

**Updated static method signature:**
```typescript
static normalizeLanguageV2Prompt(opts: {
  input: LanguageModelV2Prompt;
  cwd: string;
  productName?: string;  // New parameter
}): LanguageModelV2Prompt {
  // ... existing code ...
  const at = new At({
    userPrompt,
    cwd: opts.cwd,
    productName: opts.productName,  // Pass through
  });
  // ... rest of code ...
}
```

### Data Flow

```
User input: "@src/components @README.md explain this"
    ↓
extractAtPaths() → ["src/components", "README.md"]
    ↓
Classification:
  - files: ["README.md"]
  - directories: ["src/components"]
    ↓
renderFilesToXml(files) → <files>...</files>
renderDirectoriesToTree(dirs) → <directory_structure>...</directory_structure>
    ↓
Merged output to LLM
```

### Error Handling

1. **Empty directories:** Display `(Empty directory)` message
2. **Permission errors:** Display error message but continue processing other paths
3. **File count limits:** Automatically handled by `listDirectory` (MAX_FILES = 1000)
4. **Non-existent paths:** Silently skip (existing behavior)

### Integration Points

**Caller modifications needed:**
- Locate all calls to `At.normalizeLanguageV2Prompt()`
- Add `productName` parameter to the options object
- Ensure `productName` is available in calling context

### Testing Coverage

Recommended test scenarios:
- ✅ Single file: `@README.md`
- ✅ Single directory: `@src`
- ✅ Mixed: `@src @package.json`
- ✅ Nested directory: `@src/utils`
- ✅ Empty directory
- ✅ Large directory (>1000 files)
- ✅ Permission-denied directory

### Output Format Example

**Input:** `@src`

**Output:**
```
<directory_structure path="src">
- /Users/xierenhong/project/src/
  - at.ts
  - constants.ts
  - tools/
    - ls.ts
    - read.ts
  - utils/
    - list.ts
</directory_structure>
```

## Implementation Checklist

- [ ] Add imports to `src/at.ts`
- [ ] Add `productName` field to `At` class
- [ ] Update constructor to accept `productName` parameter
- [ ] Refactor `getContent()` to classify files vs directories
- [ ] Implement `renderDirectoriesToTree()` method
- [ ] Update `normalizeLanguageV2Prompt()` signature
- [ ] Locate and update all callers to pass `productName`
- [ ] Test all scenarios listed above
- [ ] Update documentation if needed
