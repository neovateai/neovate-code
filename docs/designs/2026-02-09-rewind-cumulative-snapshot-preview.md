# Rewind Cumulative Snapshot Preview

**Date:** 2026-02-09

## Context

The rewind feature in ForkModal allows users to restore code and/or conversation to a previous point. The initial implementation had an issue: when selecting a message like "hi" that had no direct code changes, the UI would not show the "Restore code and conversation" option, even though subsequent messages (e.g., "create a.txt") had made code changes that would be reverted by rewinding to that point.

The user expected that selecting "hi" should offer the option to restore code if there are any code changes that occurred after that point in the conversation.

## Discussion

### Initial Problem
- The `previewRewind` method only calculated changes for a specific snapshot, not cumulative changes from that point forward
- The ForkModal used `findLastAssistantAfterUser()` to find the assistant response for each user message, but this only found that message's own assistant response
- If that assistant response had no snapshot (no file changes), the UI showed "No code changes" and only offered "Restore conversation"

### Key Questions Explored

1. **What should the rewind operation actually restore?**
   - Restoring to a point should revert ALL changes made after that point, not just the changes from one specific message

2. **How should the message list display code changes vs. the confirm view?**
   - Option A: Show cumulative changes in both list and confirm view
   - Option B: Show per-message changes in list, but cumulative changes when confirming
   - **Decision:** Option B - The list should show each message's own changes for clarity, but when selecting a message to rewind, show cumulative changes to accurately represent what will be reverted

3. **How to find snapshots for cumulative calculation?**
   - Option A: Find the first assistant with a snapshot after the user message
   - Option B: Always use the earliest snapshot and calculate from user message position
   - **Decision:** Option A - Find the first snapshot that exists after the user message's position

## Approach

Implement a two-tier snapshot display:

1. **Message list display (`own`)**: Shows only that message's own code changes (non-cumulative)
   - Two "hi" messages with no file changes show "No code changes"
   - "create a.txt" message shows `a.txt +1 -0`

2. **Confirm rewind view (`cumulative`)**: Shows total changes from that point forward
   - When selecting either "hi", shows cumulative changes including `a.txt +1 -0`
   - Offers "Restore code and conversation" option if cumulative changes exist

## Architecture

### Type Changes

**`src/nodeBridge.types.ts`**
- Added `cumulative?: boolean` flag to `SnapshotPreviewRewindInput`

### FileHistory Changes

**`src/snapshot/FileHistory.ts`**

`rewindToMessage(messageId, dryRun)`:
- Now aggregates all snapshots after the target snapshot
- Collects all affected files from target snapshot through latest snapshot
- Calculates diff from current state back to target snapshot state

`previewRewind(messageId, cumulative)`:
- New `cumulative` parameter (defaults to `true`)
- If `cumulative: true`: Uses `rewindToMessage` with dry run to get all changes from that point
- If `cumulative: false`: Only shows changes in that specific snapshot

### NodeBridge Handler Changes

**`src/nodeBridge/slices/snapshot.ts`**
- `snapshot.previewRewind` handler now passes `cumulative` flag to `previewRewind()`

### ForkModal Changes

**`src/ui/ForkModal.tsx`**

State structure changed:
```typescript
Map<string, { own: RewindResult | null; cumulative: RewindResult | null }>
```

Snapshot loading logic:
1. Collect all assistant messages that have snapshots
2. For each user message:
   - `own`: Find that message's own assistant response, get its snapshot with `cumulative: false`
   - `cumulative`: Find the first snapshot after that message's position, get with `cumulative: true`

UI usage:
- Message list renders `snapshotData.own` for display
- Confirm view uses `snapshotData.cumulative` for options and rewind preview
