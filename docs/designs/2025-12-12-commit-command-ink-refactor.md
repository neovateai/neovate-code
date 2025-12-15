# Commit Command Ink/React Refactor

**Date:** 2025-12-12

## Context

The existing `src/commands/commit.ts` implements an AI-powered commit message generator using clack-prompts for CLI interaction. The goal is to refactor this command to:

1. Use the Ink/React pattern (following `src/commands/__test.tsx` as reference)
2. Call `nodeBridge` handlers for all operations instead of direct imports
3. Use `project.generateCommit` handler which returns enriched data: `commitMessage`, `branchName`, `isBreakingChange`, `summary`
4. Remove the `--ai` flag (no longer needed)
5. Improve the UI/UX with richer visual feedback

## Discussion

### Features & Actions
The refactored command will support **full feature parity** with 6 interactive actions:
- Copy to clipboard
- Commit changes
- Commit and push
- Create branch and commit
- Edit commit message
- Cancel operation

### CLI Flags
All original flags are retained (except `--ai`):
| Flag | Alias | Purpose |
|------|-------|---------|
| `--stage` | `-s` | Stage all changes before committing |
| `--commit` | `-c` | Commit changes automatically |
| `--push` | - | Push after committing |
| `--copy` | - | Copy to clipboard |
| `--checkout` | - | Create branch and commit |
| `--no-verify` | `-n` | Skip pre-commit hooks |
| `--model` | `-m` | Specify AI model |
| `--language` | - | Commit message language |
| `--follow-style` | - | Match repo commit style |
| `--interactive` | `-i` | Force interactive mode |
| `--help` | `-h` | Show help |

### UI Display
Chose **Rich Card** display showing all 4 fields from `project.generateCommit`:
- Commit message
- Suggested branch name
- Breaking change warning (conditional)
- Summary

### Error Handling
Chose **Verbose+Recovery** approach:
- Detailed error messages with hints
- Interactive recovery options where applicable (e.g., "Retry with --no-verify?" for hook failures)
- Offer to stage files when no staged changes detected

### Architecture Approach
Chose **Component Extraction** (Option 2) over monolithic or full state machine approaches:
- Balance between simplicity and reusability
- Clean separation of concerns
- Components can be tested independently

### Git Operations
Chose to **add new nodeBridge handlers** rather than using bash execution or direct imports:
- Keeps UI layer clean
- Type-safe operations
- Centralized git operations

## Approach

The refactored commit command will:

1. **Replace clack-prompts with Ink/React** for a modern, composable UI
2. **Use nodeBridge handlers exclusively** for all backend operations
3. **Leverage `project.generateCommit`** for AI-powered commit message generation with rich metadata
4. **Extract reusable UI components** for the result card and action selector
5. **Implement verbose error handling** with recovery options
6. **Support both interactive and non-interactive modes** via CLI flags

## Architecture

### File Structure

```
src/commands/commit.tsx           # Main entry, CLI parsing, CommitUI component
src/ui/CommitResultCard.tsx       # Rich card displaying commit info (NEW)
src/ui/CommitActionSelector.tsx   # Action menu component (NEW)
src/nodeBridge.types.ts           # Add git handler types (MODIFY)
src/nodeBridge.ts                 # Add git handler implementations (MODIFY)
src/commands/commit.ts            # Delete after migration
```

### New NodeBridge Handlers

Add to `nodeBridge.types.ts` and implement in `nodeBridge.ts`:

```typescript
// Types
type GitStatusInput = { cwd: string };
type GitStatusOutput = {
  success: boolean;
  data?: {
    isRepo: boolean;
    hasUncommittedChanges: boolean;
    hasStagedChanges: boolean;
    isGitInstalled: boolean;
    isUserConfigured: { name: boolean; email: boolean };
  };
  error?: string;
};
type GitStageInput = { cwd: string; all?: boolean };
type GitCommitInput = { cwd: string; message: string; noVerify?: boolean };
type GitPushInput = { cwd: string };
type GitCreateBranchInput = { cwd: string; name: string };

// Handler Map entries
'git.status': { input: GitStatusInput; output: GitStatusOutput };
'git.stage': { input: GitStageInput; output: SuccessResponse };
'git.commit': { input: GitCommitInput; output: SuccessResponse };
'git.push': { input: GitPushInput; output: SuccessResponse };
'git.createBranch': { input: GitCreateBranchInput; output: SuccessResponse };
```

### Component Interfaces

**CommitResultCard:**
```typescript
interface CommitResultCardProps {
  commitMessage: string;
  branchName: string;
  isBreakingChange: boolean;
  summary: string;
}
```

**CommitActionSelector:**
```typescript
type CommitAction = 'copy' | 'commit' | 'push' | 'checkout' | 'edit' | 'cancel';

interface CommitActionSelectorProps {
  onSelect: (action: CommitAction) => void;
  onCancel: () => void;
  disabled?: boolean;
}
```

### State Machine

```typescript
type CommitState = 
  | { phase: 'validating' }
  | { phase: 'staging' }
  | { phase: 'generating' }
  | { phase: 'displaying'; data: GenerateCommitData }
  | { phase: 'editing'; data: GenerateCommitData; editedMessage: string }
  | { phase: 'executing'; action: CommitAction; data: GenerateCommitData }
  | { phase: 'success'; message: string }
  | { phase: 'error'; error: string; recoveryAction?: () => void };
```

### State Flow

```
validating → staging (if needed) → generating → displaying
                                                    ↓
                              ┌─────────────────────┼─────────────────┐
                              ↓                     ↓                 ↓
                           editing            executing            cancel
                              ↓                     ↓
                         displaying          success / error
```

### Visual Design (CommitResultCard)

```
╭─────────────────────────────────────────────────────────────╮
│  📝 Commit Message                                          │
│  ───────────────────────────────────────────────────────── │
│  feat(auth): add JWT token validation                      │
│                                                             │
│  🌿 Suggested Branch                                        │
│  feat/add-jwt-token-validation                             │
│                                                             │
│  ⚠️  BREAKING CHANGE                    (conditional)       │
│                                                             │
│  📋 Summary                                                 │
│  Added token validation middleware with expiry checking    │
╰─────────────────────────────────────────────────────────────╯
```

### Visual Design (CommitActionSelector)

```
What would you like to do?

  ○ 📋 Copy to clipboard
  ● ✅ Commit changes                    ← highlighted
  ○ 🚀 Commit and push
  ○ 🌿 Create branch and commit
  ○ ✏️  Edit commit message
  ○ ❌ Cancel

  ↑↓ Navigate  Enter Select  Esc Cancel
```

### Error Handling Matrix

| Phase | Error | Recovery |
|-------|-------|----------|
| validating | Not a git repo | Exit with hint |
| validating | No staged changes | Offer "Stage all?" |
| validating | Git not installed | Exit with install hint |
| generating | API error | Offer "Retry?" |
| executing:commit | Hook failed | Offer "Retry with --no-verify?" |
| executing:push | Auth failed | Exit with credentials hint |
| executing:push | Rejected | Hint: "git pull first" |
| executing:checkout | Branch exists | Auto-append timestamp, retry |

### Implementation Order

1. Add git handlers to `nodeBridge.types.ts` and `nodeBridge.ts`
2. Create `CommitResultCard.tsx`
3. Create `CommitActionSelector.tsx`
4. Create `commit.tsx` with full workflow
5. Test interactive and non-interactive modes
6. Delete old `commit.ts`
