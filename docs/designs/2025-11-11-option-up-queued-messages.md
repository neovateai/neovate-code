# Change Key for "Edit Queued Messages" from Up to Option+Up

**Date:** 2025-11-11  
**Status:** Implemented

## Overview

Change the keyboard shortcut to edit queued messages from plain "Up" arrow to "Option + Up" arrow, while preserving plain "Up" for command history navigation.

## Requirements

- Option + Up arrow triggers "edit queued messages" functionality
- Only works when there are queued messages (no-op if queue is empty)
- Plain Up arrow continues to navigate through command history
- Works across Mac (Option), Linux (Alt), and Windows (Alt)

## Architecture

### Component Changes

**TextInput component (`src/ui/TextInput/index.tsx`):**
- Add new prop: `onQueuedMessagesUp?: () => void`
- Pass this prop to `useTextInput` hook

**useTextInput hook (`src/ui/TextInput/hooks/useTextInput.ts`):**
- Add `onQueuedMessagesUp` to props interface
- In `mapKey` function, add case for `key.upArrow && key.meta` before plain `key.upArrow`
- Route to new callback when Option+Up is detected
- Note: `key.meta` maps to Option/Alt key in terminal

**useInputHandlers hook (`src/ui/useInputHandlers.ts`):**
- Create new handler: `handleQueuedMessagesUp`
- Check if `queuedMessages.length > 0` before taking action
- If queue has messages, trigger existing queue editing logic
- If queue is empty, do nothing (no-op)

**ChatInput component (`src/ui/ChatInput.tsx`):**
- Pass new `onQueuedMessagesUp` callback to TextInput
- Keep existing `onHistoryUp` for plain Up arrow
- Update placeholder text from "Press up to edit queued messages" to "Press option+up to edit queued messages"

## Implementation Flow

1. User presses Option + Up arrow in terminal
2. Ink captures as `key.upArrow = true` and `key.meta = true`
3. `useTextInput.mapKey()` checks for `key.upArrow && key.meta` first
4. Routes to `onQueuedMessagesUp` callback
5. Handler checks queue length and edits first queued message if available

## Key Detection Order

In `mapKey` function, check must occur in this order:
```typescript
case key.upArrow && key.meta:
  return () => onQueuedMessagesUp?.()
case key.upArrow:
  return upOrHistoryUp
```

The Option+Up check must come before plain Up check to prevent fallthrough.

## Edge Cases

- **Empty queue:** No-op when Option+Up pressed
- **Cursor position:** Option+Up works regardless of cursor position (unlike plain Up which respects cursor movement)
- **Plain Up behavior:** Unaffected, continues command history navigation

## Testing

Manual testing only:
1. Test Option+Up with queued messages → Should edit first message
2. Test Option+Up with empty queue → Should do nothing
3. Test plain Up → Should still navigate command history
4. Test across different cursor positions
5. Verify on Mac (Option), Linux (Alt), Windows (Alt)

No automated tests needed - keyboard interaction in terminal UI is not covered by existing test structure.

## Trade-offs

**Selected: Approach 1 - New callback prop**
- Clean separation of concerns
- Clear distinction between history and queue navigation
- Requires one additional prop/callback
- Low complexity

**Rejected alternatives:**
- Single callback with metadata parameter (dual responsibility)
- Conditional logic in handlers (mixing UI state with input handling)
