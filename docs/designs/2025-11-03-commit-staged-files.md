# Add Git Staged File List to Commit Message Prompt

**Date:** 2025-11-03  
**Status:** Implemented

## Overview

Add a list of staged files (with their status) to the AI prompt when generating commit messages. This provides the AI with a quick summary of which files are being changed before showing the detailed diffs.

## Goal

Enhance the commit message generation by including `git diff --cached --name-status` output in the prompt, showing:
- Modified files (M)
- Added files (A)
- Deleted files (D)
- Renamed files (R)
- etc.

This helps the AI understand the scope of changes at a glance before processing detailed diffs.

## Design Process

### Phase 1: Understanding

**Question:** What type of file information should be included?

**Decision:** Show only the **staged files** using `git diff --cached --name-status` to get a concise list like:
```
M    src/commands/commit.ts
A    src/utils/new-file.ts
D    src/old-file.ts
```

This is preferred over:
- Full staged changes summary (redundant with existing diffs)
- Both staged AND unstaged files (unnecessary context)

### Phase 2: Exploration

Three approaches were considered:

**Approach 1: Minimal Addition** ✅ SELECTED
- Add `git diff --cached --name-status` output above the diffs
- Simple format: Raw Git output like `M src/file.ts`
- **Pros:** Simple, minimal changes, standard Git format
- **Cons:** Less human-readable (M/A/D codes)
- **Complexity:** Very low - just one extra execSync call

**Approach 2: Enhanced Readability**
- Parse name-status output and format with readable labels
- Show counts: "3 modified, 1 added, 1 deleted"
- **Pros:** More informative for AI
- **Cons:** Additional parsing logic
- **Complexity:** Low-medium

**Approach 3: Tiered Information**
- Add file summary with types/categories
- Group by directory for large changesets
- **Pros:** Most comprehensive
- **Cons:** Complex, potentially verbose
- **Complexity:** Medium

**Rationale:** Approach 1 was selected for its simplicity and use of standard Git format.

### Phase 3: Implementation Design

#### Section 1: Data Collection

New function `getStagedFileList()` added alongside `getStagedDiff()`:

```typescript
async function getStagedFileList() {
  try {
    const fileList = execSync('git diff --cached --name-status', {
      encoding: 'utf-8',
    });
    return fileList.trim();
  } catch (error: any) {
    return '';
  }
}
```

**Characteristics:**
- Uses same `execSync` pattern as existing code
- Returns raw Git output (e.g., `M src/file.ts\nA src/new.ts`)
- Fails gracefully with empty string on error
- No exclusion patterns needed (unlike diff, we want all filenames)

#### Section 2: Prompt Integration

Modified the `generateCommitMessage` call in `runCommit()`:

```typescript
const diff = await getStagedDiff();
const fileList = await getStagedFileList();

message = await generateCommitMessage({
  prompt: `
# Staged files:
${fileList}

# Diffs:
${diff}
${repoStyle}
  `,
  context,
  // ... rest of options
});
```

**Integration points:**
- Call `getStagedFileList()` right after `getStagedDiff()`
- Place file list at top of prompt (summary → details ordering)
- Use clear heading `# Staged files:` to separate sections
- Maintain existing diff section unchanged
- Empty file list shows empty section (no special handling)

#### Section 3: Error Handling

**Empty staged changes:**
- Both `fileList` and `diff` will be empty
- Existing check `if (diff.length === 0)` already handles this
- No additional error handling needed

**Command failure:**
- `getStagedFileList()` returns empty string (fail gracefully)
- Won't break commit flow if git command fails
- Diff is critical data; file list is supplementary

**Large changesets:**
- File list is just filenames (tiny compared to diffs)
- No truncation needed
- Won't hit buffer limits

## Implementation

Changes made to `src/commands/commit.ts`:

1. Added `getStagedFileList()` function before `getStagedDiff()`
2. Called `getStagedFileList()` after getting staged diff
3. Updated prompt template to include staged files section

## Benefits

- AI gets quick overview of affected files before processing diffs
- Standard Git format (no custom parsing)
- Minimal implementation with graceful error handling
- Non-breaking change (supplements existing functionality)
- Helpful for understanding scope of multi-file changes

## Future Considerations

If needed, could enhance to:
- Parse and format with readable labels (Approach 2)
- Add file counts summary
- Group by directory for large changesets
- Filter by file types

However, current minimal approach is sufficient for the use case.
