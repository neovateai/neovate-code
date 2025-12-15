# project.generateCommit Handler

**Date:** 2025-12-12

## Context

The `commit.ts` command uses `query()` directly for generating commit messages and branch names. To enable reuse and provide a clean API for generating commit-related content via LLM, a new `project.generateCommit` handler should be added to `nodeBridge.ts` that uses `utils.quickQuery` with structured JSON output.

## Discussion

**Output structure:** The handler should return structured JSON with:
- `commitMessage` - The generated commit message
- `branchName` - Suggested branch name
- `isBreakingChange` - Boolean indicating breaking changes
- `summary` - Brief summary of changes

**Input handling:** Hybrid approach chosen - caller can optionally provide `diff` and `fileList`, otherwise handler fetches them via git commands.

**Architecture approaches considered:**
1. **Minimal Handler (chosen)** - Handler focuses on LLM call only, git operations extracted to shared utils
2. **Full-Featured Handler** - Handler does everything including git operations

Approach A was chosen for simplicity, better separation of concerns, and easier testing.

## Approach

- Extract `getStagedDiff` and `getStagedFileList` from `commit.ts` to `utils/git.ts`
- Add `project.generateCommit` handler that uses `utils.quickQuery` with JSON responseFormat
- Handler fetches git data if not provided, then calls LLM with combined system prompt
- Update `commit.ts` to import git functions from `utils/git.ts`

## Architecture

### Type Definitions (`nodeBridge.types.ts`)

```typescript
type ProjectGenerateCommitInput = {
  cwd: string;
  language?: string;      // defaults to 'English'
  systemPrompt?: string;  // custom system prompt override
  model?: string;         // passed to quickQuery
  diff?: string;          // git diff, fetched if not provided
  fileList?: string;      // staged file list, fetched if not provided
};

type ProjectGenerateCommitOutput = {
  success: boolean;
  error?: string;
  data?: {
    commitMessage: string;
    branchName: string;
    isBreakingChange: boolean;
    summary: string;
  };
};
```

### Handler Flow (`nodeBridge.ts`)

1. Get context for cwd
2. Fetch `diff` and `fileList` via git utils if not provided
3. Return error if no staged changes
4. Build user prompt with staged files and diffs
5. Call `utils.quickQuery` with JSON schema for structured output
6. Return parsed JSON result

### System Prompt

Combined prompt that generates both commit message and branch name, instructing LLM to output JSON with all four fields. Includes conventional commit format rules, character limits, and language preference.

### Files to Modify

1. **`src/utils/git.ts`** - Add `getStagedDiff()` and `getStagedFileList()`
2. **`src/nodeBridge.types.ts`** - Add input/output types and HandlerMap entry
3. **`src/nodeBridge.ts`** - Add handler and system prompt helper
4. **`src/commands/commit.ts`** - Import git functions from utils, remove local implementations
