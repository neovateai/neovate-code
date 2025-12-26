# Commit Command: Suggest Staging Unstaged Files

**Date:** 2025-12-26

## Context

When running the commit command without the `--stage` flag and no files are staged, the command currently shows an error message asking the user to either use the `-s` flag or manually stage files with `git add`. This is not ideal UX because:

1. Users may not know which files have changes
2. They have to exit and run a separate command to stage files
3. The workflow is interrupted

The goal is to detect unstaged changes and offer to stage them interactively, showing the user exactly which files would be staged before proceeding.

## Discussion

### Information Display
**Question:** What information should be shown when unstaged changes are detected?

**Decision:** Show a file list with status codes (M/A/D/?) limited to 10 files. If more than 10 files exist, show a count of remaining files.

### UI Flow
**Question:** Where should the staging prompt appear in the UI flow?

**Decision:** Add a new `suggest-stage` phase to the state machine rather than inlining it in the error message. This provides cleaner separation and better UX.

### Post-Stage Behavior
**Question:** After user confirms staging, what should happen next?

**Decision:** Continue directly to the `generating` phase to create the commit message automatically, maintaining the workflow momentum.

## Approach

Extend the existing commit command workflow with a new `suggest-stage` phase that:

1. Activates when no staged changes exist but unstaged changes are detected
2. Displays a list of modified files with their status indicators
3. Prompts user with a simple y/N confirmation
4. On confirmation, stages all files and continues to commit message generation
5. On decline, exits cleanly

This keeps the user in the commit flow while giving them visibility and control over what gets staged.

## Architecture

### State Type Extension

Add new phase to `CommitState`:

```typescript
type CommitState =
  // ... existing phases ...
  | { 
      phase: 'suggest-stage'; 
      unstagedFiles: Array<{ status: string; file: string }>;
    }
```

### Data Requirements

Extend `GitStatusOutput` in `nodeBridge.types.ts`:

```typescript
type GitStatusOutput = {
  success: boolean;
  data?: {
    // ... existing fields ...
    unstagedFiles: Array<{ status: string; file: string }>;
  };
  error?: string;
};
```

### Workflow Logic Change

In `runWorkflow`, update the no-staged-changes handling:

```
Current: !hasStagedChanges && !options.stage → error

New:     !hasStagedChanges && !options.stage:
           if (unstagedFiles.length > 0) → setState({ phase: 'suggest-stage', unstagedFiles })
           else → error (truly no changes)
```

### UI Component

```tsx
{state.phase === 'suggest-stage' && (
  <Box flexDirection="column">
    <Text color="yellow">No staged changes found. The following files have modifications:</Text>
    <Box flexDirection="column" marginY={1} paddingLeft={2}>
      {state.unstagedFiles.slice(0, 10).map((f, i) => (
        <Text key={i}>
          <Text color="cyan">{f.status}</Text> {f.file}
        </Text>
      ))}
      {state.unstagedFiles.length > 10 && (
        <Text dimColor>... and {state.unstagedFiles.length - 10} more files</Text>
      )}
    </Box>
    <Text>Stage all files and continue? (y/N)</Text>
  </Box>
)}
```

### Keyboard Handling

- `y`/`Y`/Enter → confirm staging, call `git.stage`, continue to `generating`
- `n`/`N`/Esc → cancel and exit

### Files to Modify

1. `src/nodeBridge.types.ts` - Add `unstagedFiles` to `GitStatusOutput`
2. `src/nodeBridge.ts` - Parse unstaged files from `git status --porcelain` in handler
3. `src/commands/commit.tsx` - Add `suggest-stage` phase, UI component, and keyboard handling
