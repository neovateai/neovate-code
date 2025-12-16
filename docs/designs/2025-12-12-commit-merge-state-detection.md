# Commit Command Merge State Detection

**Date:** 2025-12-12

## Context

When resolving merge conflicts, the correct workflow is:
1. Execute `git merge` → conflicts occur
2. Manually resolve conflict files
3. `git add` the resolved files
4. `git commit` → creates a merge commit

However, users can accidentally run `neo commit --stage` (or just `neo commit`) after resolving conflicts. This creates a regular commit instead of a proper merge commit, breaking the merge workflow and requiring the user to re-run the entire conflict resolution process.

The goal is to detect when the repository is in a merge state and block the `neo commit` command, guiding users to use the correct `git commit` command instead.

## Discussion

### Blocking Behavior
Two options were considered:
1. **Warning only**: Show a warning and let users confirm to continue
2. **Direct blocking**: Show an error and exit immediately

**Decision:** Direct blocking was chosen to prevent any accidental misuse during merge resolution.

### Scope of Detection
Initially, the check was only considered for the `--stage` flag scenario. However, analysis revealed that even without `--stage`:
- If users manually `git add` after resolving conflicts, then run `neo commit`
- Git would create a merge commit, but with an AI-generated message that's inappropriate for merge commits
- Users might not realize they're completing a merge

**Decision:** Block for all merge states, regardless of whether `--stage` is used.

### Implementation Approaches
Three approaches were evaluated:

| Approach | Description | Complexity |
|----------|-------------|------------|
| A | Extend `git.status` handler with `isMerging` field | Low |
| B | Local detection in `commit.tsx` only | Lowest |
| C | Create general pre-commit checks mechanism | Medium |

**Decision:** Approach A was selected for its balance of reusability and simplicity. The merge state detection is a natural extension of git status, and other commands may benefit from this information in the future.

## Approach

Extend the existing `git.status` handler to detect merge state by checking for the `.git/MERGE_HEAD` file. When Git encounters a merge conflict, it creates this file to track the merge state. The file is removed when the merge is completed or aborted.

The `neo commit` command will check the `isMerging` field from `git.status` response and immediately exit with a helpful error message if the repository is in a merge state.

## Architecture

### File Changes

| File | Modification |
|------|--------------|
| `src/nodeBridge.types.ts` | Add `isMerging: boolean` to `GitStatusOutput.data` |
| `src/nodeBridge.ts` | Add `.git/MERGE_HEAD` detection in `git.status` handler |
| `src/commands/commit.tsx` | Add `isMerging` to `GitStatusData` interface; add merge state check in `runWorkflow` |

### Type Definition (`nodeBridge.types.ts`)

```typescript
type GitStatusOutput = {
  success: boolean;
  data?: {
    isRepo: boolean;
    hasUncommittedChanges: boolean;
    hasStagedChanges: boolean;
    isGitInstalled: boolean;
    isUserConfigured: { name: boolean; email: boolean };
    isMerging: boolean;  // NEW: true when .git/MERGE_HEAD exists
  };
  error?: string;
};
```

### Handler Implementation (`nodeBridge.ts`)

```typescript
// In git.status handler, after existing checks:
const { existsSync } = await import('fs');
const { join } = await import('path');
const { getGitRoot } = await import('./worktree');

const gitRoot = await getGitRoot(cwd);
const isMerging = existsSync(join(gitRoot, '.git', 'MERGE_HEAD'));

return {
  success: true,
  data: {
    // ... existing fields ...
    isMerging,
  },
};
```

### Frontend Blocking (`commit.tsx`)

```typescript
// In runWorkflow, after user configuration validation:
if (status.isMerging) {
  setState({
    phase: 'error',
    error: `Merge state detected.

Please use the following commands to complete the merge:
  git status    # Check conflict status
  git commit    # Create merge commit

Using commit command would create an improper commit message
and may require re-resolving conflicts.`,
  });
  return;
}
```

### Data Flow

```
User runs: neo commit [--stage]
     │
     ▼
┌─────────────────────────┐
│ git.status handler      │
│ - Check .git/MERGE_HEAD │
│ - Return isMerging flag │
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ commit.tsx runWorkflow  │
│ - Check status.isMerging│
│ - If true → error state │
│ - If false → continue   │
└─────────────────────────┘
```
