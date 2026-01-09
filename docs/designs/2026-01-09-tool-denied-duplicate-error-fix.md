# Tool Denied Duplicate Error Message Fix

**Date:** 2026-01-09

## Context

When a user refuses a tool execution (denies approval), two error messages were displayed in the UI:

1. `Error: Tool execution was denied by user.` — from the tool result
2. `Failed: Error: Tool execution was denied by user.` — from the ActivityIndicator

This was redundant and confusing to users who expected only one notification of their action.

## Discussion

The duplicate messages originated from two separate display points:

1. **Tool Result Display** (`Messages.tsx` line 585-590): `ToolResultItem` component displays the tool result with `isError` flag set, showing the denial message.

2. **Activity Indicator** (`ActivityIndicator.tsx` line 24): When the loop returns `{ success: false, error }`, the status is set to `'failed'` and the error message is displayed.

The flow was:
- `loop.ts` creates an error tool result with `isError: true` and `llmContent: 'Error: Tool execution was denied by user.'`
- Loop returns early with `{ success: false, error: { type: 'tool_denied', message } }`
- `store.ts` sets `status: 'failed'` and `error: response.error.message`
- Both the tool result and ActivityIndicator render the error

Three options were considered:
- **Option A**: Don't show the `Failed:` message in ActivityIndicator for `tool_denied` type
- **Option B**: Don't display tool result in Messages.tsx when it's a denial error
- **Option C**: Don't return early with error for `tool_denied` (changes behavior)

## Approach

Option A was chosen: Suppress the ActivityIndicator's "Failed:" message for `tool_denied` errors while keeping the tool result display.

This is cleaner because:
- The tool result display is the natural place to show tool-related feedback
- The ActivityIndicator is meant for processing/system-level status
- User denial is a normal workflow action, not a system failure

## Architecture

The fix is implemented in `src/ui/store.ts` in the `sendMessage` action:

```typescript
} else {
  if (response.error.type === 'tool_denied') {
    set({
      status: 'idle',
      processingStartTime: null,
      processingTokens: 0,
      retryInfo: null,
      forkParentUuid: null,
    });
  } else {
    set({
      status: 'failed',
      error: response.error.message,
      processingStartTime: null,
      processingTokens: 0,
      retryInfo: null,
      forkParentUuid: null,
    });
  }
}
```

When `response.error.type === 'tool_denied'`, the status is set to `'idle'` instead of `'failed'`, and no error message is stored. This prevents ActivityIndicator from rendering the "Failed:" message while the tool result still shows the denial.
