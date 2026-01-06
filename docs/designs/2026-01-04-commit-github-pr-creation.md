# Commit Command GitHub PR Creation

**Date:** 2026-01-04

## Context

The commit command currently supports various actions (copy, commit, push, create branch, etc.) through an interactive menu system. Users requested the ability to create GitHub pull requests directly from the commit workflow when the `gh` CLI is installed. However, the existing menu already has 8 options, creating a UX concern about menu complexity.

The goal is to add optional PR creation functionality while maintaining a clean user experience.

## Discussion

### Key Questions Explored

**When should PR creation be available?**
- Considered three approaches: post-push follow-up, separate menu option, or combined with push
- Decision: Add `Create branch and commit and push and create PR` as a new action when `gh` is detected and the remote is GitHub
- This keeps the workflow explicit and predictable

**How to simplify the menu?**
- Explored options: grouping branch actions, smart defaults based on current branch, progressive disclosure
- Decision: Keep all options visible but make the list dynamic based on GitHub detection
- Menu shows 8 options normally, 9 when GitHub is available

### Trade-offs

- **Visibility vs Simplicity**: Chose to keep all options visible rather than hide them, as users prefer seeing all available actions upfront
- **Auto-detection**: GitHub detection adds minimal overhead during validation phase (already checking git status)
- **Non-interactive mode**: Decided to skip PR creation in non-interactive mode as it's too risky without user confirmation

## Approach

Add GitHub detection during the existing validation phase, then conditionally show a new `checkoutPushPR` action that creates a branch, commits, pushes, and creates a PR in one workflow.

The solution:
1. Detects `gh` CLI availability and GitHub remote during validation
2. Dynamically adds PR creation option to menu when both conditions are met
3. Executes PR creation using `gh pr create --fill` after successful push
4. Handles errors gracefully with helpful hints (auth, existing PRs, network issues)

## Architecture

### GitHub Detection

**Detection Logic:**
- Check if `gh` CLI is installed using `which gh` command
- Parse `git config remote.origin.url` to verify remote is GitHub
- Detection regex: `/(github\.com|github:|git@github)/`
- Cache result per session to avoid repeated checks
- Detection runs during "validating" phase alongside existing git status checks

**New NodeBridge Handler:**
- Handler name: `git.detectGitHub`
- Returns: `{ hasGhCli: boolean, isGitHubRemote: boolean }`
- Uses existing `execFileNoThrow` utility for shell commands

### Data Types

```typescript
interface GitStatusData {
  // ... existing fields ...
  hasGhCli: boolean;
  isGitHubRemote: boolean;
}

type CommitAction = 
  | 'copy'
  | 'commit'
  | 'push'
  | 'checkout'
  | 'checkoutPush'
  | 'checkoutPushPR'  // New
  | 'edit'
  | 'editBranch'
  | 'cancel';
```

### PR Creation Flow

1. Execute existing `checkoutPush` logic:
   - Create branch
   - Commit changes
   - Push to remote
2. On successful push, execute `gh pr create --fill --head ${branchName}`
3. Stream gh CLI output to user (same pattern as git commit/push output)
4. Show success message with PR URL
5. Parse PR URL from gh CLI response and display

### UI Integration

**CommitActionSelector:**
- ACTIONS array becomes dynamic (computed based on GitHub detection)
- New action: `{ value: 'checkoutPushPR', label: 'Create branch, commit, push and create PR', icon: '🌿' }`
- Filter out `checkoutPushPR` when GitHub not available
- Quick select numbers adjust automatically (1-8 or 1-9)

**Visual Feedback:**
- Add new executing phase: `{ phase: 'executing'; action: 'pr'; ... }`
- During PR creation: `⏳ Creating pull request...`
- Stream gh CLI output in dimColor
- Success state: `Branch 'xxx' created, committed, pushed, and PR created!`
- Include clickable PR URL in terminal (if supported)

### Error Handling

**GitHub Detection Errors:**
- Multiple remotes: Check `origin` first
- No remote: Hide PR option silently
- GitHub Enterprise: Only detect `github.com` (avoid false positives)

**PR Creation Errors:**
- Not authenticated: Show `gh auth login` hint
- PR already exists: Parse gh error and show link to existing PR
- No write permissions: Show auth error with permissions hint
- Network failures: Display standard gh CLI error output

**Edge Cases:**
- Non-interactive mode: Skip PR creation entirely
- `gh` not configured: Clear error message
- Branch not yet pushed: Won't happen (push executes first)

### File Changes

- **src/commands/commit.tsx**: Add GitHub detection, new `checkoutPushPR` action handler, PR execution logic
- **src/ui/CommitActionSelector.tsx**: Make actions list dynamic based on GitHub detection props
- **src/nodeBridge.ts**: Add `git.detectGitHub` handler implementation

### Implementation Notes

- No changes to existing git handlers (maintains backward compatibility)
- Detection overhead is minimal (runs once during validation)
- PR creation is opt-in and clearly labeled
- Non-interactive mode remains safe (no automatic PR creation)
- All existing workflows continue to work unchanged
