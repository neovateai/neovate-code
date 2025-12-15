# Real-time Git Output Streaming for Commit and Push Commands

**Date:** 2025-12-12

## Context

The commit command in `src/commands/commit.tsx` currently shows simple loading messages like "⏳ Committing changes..." and "⏳ Pushing to remote..." without displaying the actual git command output. Users want to see real-time stdout/stderr from git operations as they happen, providing transparency and feedback during commit and push operations.

## Discussion

**Output Display Options:**

- Considered showing output only on errors vs. always showing
- Considered replacing loading messages vs. showing output alongside them
- Final decision: Show real-time git command output below the loading message, keeping both the UI status indicator and the raw git output visible

**UI Layout:**

- Keep the existing "⏳ Committing changes..." loading message at the top
- Stream git output below it in real-time
- Display output in dimmed text to distinguish from UI messages
- Capture both stdout and stderr since git writes progress to stderr

## Approach

Implement streaming output using the existing MessageBus event system. The flow will be:

1. Git commands run with `spawn()` instead of `execFile()` to enable streaming
2. Output callbacks in git utilities send each line to NodeBridge
3. NodeBridge emits events (`git.commit.output`, `git.push.output`) with output data
4. CommitUI component subscribes to these events and displays lines below loading message

This approach maintains backward compatibility and leverages the existing event-driven architecture.

## Architecture

### Components Modified

**1. Git Utilities (`src/utils/git.ts`)**

Modify `gitCommit()` and `gitPush()` functions:

- Add optional parameter: `onOutput?: (line: string, stream: 'stdout' | 'stderr') => void`
- When `onOutput` is provided, use `spawn()` for streaming (instead of `execFile()`)
- When `onOutput` is not provided, maintain current behavior (backward compatible)
- Stream data line-by-line, filtering empty lines
- Buffer partial lines until newline is received
- Capture both stdout and stderr

Example signature:

```typescript
export async function gitCommit(
  cwd: string,
  message: string,
  skipHooks = false,
  onOutput?: (line: string, stream: "stdout" | "stderr") => void
): Promise<void>;
```

**2. NodeBridge Handlers (`src/nodeBridge.ts`)**

Update `git.commit` and `git.push` handlers:

- Pass `onOutput` callback to git utility functions
- Emit `git.commit.output` and `git.push.output` events for each line
- Include stream type (stdout/stderr) in event data

Event structure:

```typescript
{
  type: 'git.commit.output' | 'git.push.output',
  data: {
    line: string,
    stream: 'stdout' | 'stderr'
  }
}
```

Example implementation:

```typescript
this.messageBus.registerHandler("git.commit", async (data) => {
  const { cwd, message, noVerify = false } = data;
  try {
    const { gitCommit } = await import("./utils/git");
    await gitCommit(cwd, message, noVerify, (line, stream) => {
      this.messageBus.emitEvent("git.commit.output", { line, stream });
    });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to commit changes",
    };
  }
});
```

**3. CommitUI Component (`src/commands/commit.tsx`)**

Update component state and rendering:

- Add `outputLines?: string[]` to the 'executing', 'success', and 'completed' phase states
- Subscribe to `git.commit.output` and `git.push.output` events in `useEffect`
- Append received lines to `outputLines` array
- Preserve outputLines when transitioning between phases (commit → push → success/completed)
- Render output lines below loading/success message in dimmed color
- Limit display to last 50 lines to prevent overflow
- **Output persists after operation completes** - output is not collapsed/hidden when transitioning to success/completed phases

UI layout during execution:

```
⏳ Committing changes...
   Enumerating objects: 5, done.
   Counting objects: 100% (5/5), done.
   Delta compression using up to 8 threads
   [master abc1234] feat: add new feature
    2 files changed, 10 insertions(+)
```

UI layout after completion:

```
✅ Changes committed successfully!
   Enumerating objects: 5, done.
   Counting objects: 100% (5/5), done.
   Delta compression using up to 8 threads
   [master abc1234] feat: add new feature
    2 files changed, 10 insertions(+)
```

### Implementation Notes

- Git writes progress information to stderr (not stdout), so both streams must be captured
- Use `spawn()` with stdio: 'pipe' for streaming capability
- Maintain backward compatibility by making `onOutput` parameter optional
- Line buffering ensures partial lines are assembled before display
- Empty lines should be filtered to reduce noise
- When transitioning from commit to push phase, previous output is preserved
- Output remains visible in success/completed phases for user review
