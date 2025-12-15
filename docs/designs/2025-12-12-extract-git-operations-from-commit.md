# Extract Git Operations from Commit Command

**Date:** 2025-12-12

## Context

The `src/commands/commit.ts` file contains ~12 inline `execSync` git operations that should be extracted to `src/utils/git.ts` for better code organization. The existing `git.ts` already has some utilities but uses `execFileNoThrow` consistently, while `commit.ts` uses raw `execSync` calls.

Primary goals:
- **Reusability** - Make git operations available to other parts of the codebase
- **Consistency** - All git operations should use the same patterns (`execFileNoThrow`)
- **Cleanup** - Cleaner separation of concerns in `commit.ts`

## Discussion

Three approaches were considered:

**Approach A: Thin Wrappers (Minimal)** - Extract operations as simple async functions that return results, using `execFileNoThrow` consistently. Error handling stays in `commit.ts`.

**Approach B: Rich Wrappers (Full Error Handling)** - Move all error handling and retry logic into `git.ts`, returning typed results or throwing domain-specific errors.

**Approach C: Grouped by Concern** - Group related operations into categories like GitValidation, GitOperations, GitQueries.

**Decision:** Approach A was chosen for its simplicity and ease of testing, while keeping detailed error handling (like retry logic) in the calling code.

## Approach

Add thin wrapper functions to `git.ts` that:
- Use `execFileNoThrow` for consistency with existing patterns
- Return simple types (boolean, string, void)
- Throw on failure with simple error messages for action functions
- Leave detailed error handling in `commit.ts`

Additionally, refactor `git.ts` for DRY by adding internal helpers and reorganizing the file structure.

## Architecture

### New Functions to Add

```typescript
// Validation functions
export async function isGitInstalled(): Promise<boolean>
export async function isGitRepository(cwd: string): Promise<boolean>
export async function isGitUserConfigured(cwd: string): Promise<{ name: boolean; email: boolean }>

// Query functions
export async function hasUncommittedChanges(cwd: string): Promise<boolean>
export async function hasRemote(cwd: string): Promise<boolean>
export async function branchExists(cwd: string, branchName: string): Promise<boolean>
export async function getRecentCommitMessages(cwd: string, count?: number): Promise<string>

// Action functions
export async function stageAll(cwd: string): Promise<void>
export async function gitCommit(cwd: string, message: string, skipHooks?: boolean): Promise<void>
export async function gitPush(cwd: string): Promise<void>
export async function createAndCheckoutBranch(cwd: string, branchName: string): Promise<void>
```

### Internal Helpers (DRY)

```typescript
async function gitExec(cwd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return execFileNoThrow(cwd, 'git', args, undefined, undefined, false);
}

async function gitCheck(cwd: string, args: string[]): Promise<boolean> {
  const { code } = await gitExec(cwd, args);
  return code === 0;
}

async function gitOutput(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await gitExec(cwd, args);
  return stdout.trim();
}
```

### File Organization

```
1. Imports
2. Internal helpers (gitExec, gitCheck, gitOutput)
3. Validation functions (isGitInstalled, isGitRepository, isGitUserConfigured)
4. Query functions (hasUncommittedChanges, hasRemote, branchExists, getRecentCommitMessages, getStagedFileList, getStagedDiff, etc.)
5. Action functions (stageAll, gitCommit, gitPush, createAndCheckoutBranch)
6. Composite functions (getGitStatus, getLlmGitStatus)
7. Clone-related functions (existing cloneRepository, etc.)
```

### Refactored getGitStatus Example

```typescript
export async function getGitStatus(opts: { cwd: string }) {
  const { cwd } = opts;
  if (!(await isGitRepository(cwd))) return null;
  
  const [branch, mainBranch, status, log, author] = await Promise.all([
    gitOutput(cwd, ['branch', '--show-current']),
    gitOutput(cwd, ['rev-parse', '--abbrev-ref', 'origin/HEAD']).then(s => s.replace('origin/', '')),
    gitOutput(cwd, ['status', '--short']),
    gitOutput(cwd, ['log', '--oneline', '-n', '5']),
    gitOutput(cwd, ['config', 'user.email']),
  ]);
  
  const authorLog = await gitOutput(cwd, ['log', '--author', author, '--oneline', '-n', '5']);
  
  return { branch, mainBranch, status, log, author, authorLog };
}
```

### Changes to commit.ts

- Remove `execSync` import
- Import new functions from `git.ts`
- Replace inline `execSync` calls with async function calls
- Keep `escapeShellArg`, detailed error handling, and retry logic in `commit.ts`
