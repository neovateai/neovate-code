# Fix git push for new branches without upstream

## Problem

When using the commit command with push option on a newly created branch, `git push` fails because no upstream is configured.

Error example:
```
fatal: The current branch <branch-name> has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin <branch-name>
```

## Solution

Modify the `gitPush` function in `src/utils/git.ts` to always use `git push -u origin HEAD` instead of `git push`.

## Changes

### File: `src/utils/git.ts`

In the `gitPush` function:

1. Change the simple exec fallback:
```typescript
// Before
const { code, stderr } = await gitExec(cwd, ['push']);

// After
const { code, stderr } = await gitExec(cwd, ['push', '-u', 'origin', 'HEAD']);
```

2. Change the spawn with progress:
```typescript
// Before
const gitProcess = spawn('git', ['push', '--progress'], { cwd });

// After
const gitProcess = spawn('git', ['push', '-u', 'origin', 'HEAD', '--progress'], { cwd });
```

## Why This Works

- `-u` (or `--set-upstream`): Sets the upstream tracking reference
- `origin`: Pushes to the default remote (already checked by `hasRemote` before calling `gitPush`)
- `HEAD`: Refers to the current branch without needing to look up the branch name

## Impact

- **New branches**: Push succeeds and sets upstream automatically
- **Existing branches**: Still works (just updates upstream reference, which is harmless)
- **No breaking changes**: Behavior is the same for normal push scenarios
