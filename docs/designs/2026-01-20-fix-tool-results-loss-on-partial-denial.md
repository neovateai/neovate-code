# Fix Tool Results Loss on Partial Denial

**Date:** 2026-01-20

## Context

When AI returns multiple tool calls concurrently (e.g., 3 edit tools) and the user denies one of them (e.g., by pressing Esc on the 1st tool), the remaining tools are never processed and their results are not recorded in the session history.

This causes the LLM to receive incomplete tool results, leading to confusion about the state of unprocessed tools.

### Example Scenario

```
AI returns: [Tool1: write a.txt, Tool2: write b.txt]
User presses Esc on Tool1

Actual result in history:
└── Only Tool1's denied result recorded
    Tool2 is completely lost!
```

## Discussion

### Root Cause Analysis

The issue is in `src/loop.ts` where tool calls are processed sequentially in a `for...of` loop. When a tool is denied:

1. **Without denyReason (user presses Esc):** The code immediately `return`s, exiting the entire function
2. **With denyReason:** The code `break`s out of the loop

In both cases, any remaining tools after the denied one are never processed and not included in the `toolResults` array that gets saved to history.

### Key Code Path

```typescript
for (const toolCall of toolCalls) {
  // ... process tool
  if (!approved) {
    toolResults.push(deniedResult);
    
    if (!denyReason) {
      history.addMessage(toolResults);  // Only includes processed tools
      return { error: 'tool_denied' };  // Remaining tools never processed
    } else {
      break;  // Same problem - remaining tools skipped
    }
  }
}
```

### Design Decision

Both the `return` case (no denyReason) and `break` case (with denyReason) should be fixed to include denied results for all unprocessed tools.

## Approach

Before exiting the tool processing loop (either via `return` or `break`), add denied results for all remaining unprocessed tools. This ensures the LLM receives complete tool results for all tools it requested.

### Solution

1. Extract a helper function `addDeniedResultsForRemainingTools()` that:
   - Identifies all unprocessed tool calls by comparing against already-processed tool call IDs
   - Creates denied results for each with message: `"Error: Tool execution was skipped due to previous tool denial."`
   - Calls `onToolResult` callback for each if provided

2. Call this helper before both exit paths:
   - Before `return` (when user presses Esc without denyReason)
   - Before `break` (when user provides denyReason)

### Expected Result

```
AI returns: [Tool1, Tool2, Tool3]
User denies Tool1

After fix - toolResults contains:
├── Tool1: "Error: Tool execution was denied by user."
├── Tool2: "Error: Tool execution was skipped due to previous tool denial."
└── Tool3: "Error: Tool execution was skipped due to previous tool denial."
```

LLM now receives complete tool results for all 3 tools.

## Architecture

### File Changes

**`src/loop.ts`**

Added helper function inside the main loop:

```typescript
const addDeniedResultsForRemainingTools = async () => {
  const processedToolCallIds = new Set(
    toolResults.map((tr) => tr.toolCallId),
  );
  for (const remainingToolCall of toolCalls) {
    if (!processedToolCallIds.has(remainingToolCall.toolCallId)) {
      const remainingToolUse: ToolUse = {
        name: remainingToolCall.toolName,
        params: safeParseJson(remainingToolCall.input),
        callId: remainingToolCall.toolCallId,
      };
      let remainingToolResult: ToolResult = {
        llmContent:
          'Error: Tool execution was skipped due to previous tool denial.',
        isError: true,
      };
      if (opts.onToolResult) {
        remainingToolResult = await opts.onToolResult(
          remainingToolUse,
          remainingToolResult,
          false,
        );
      }
      toolResults.push({
        toolCallId: remainingToolCall.toolCallId,
        toolName: remainingToolCall.toolName,
        input: safeParseJson(remainingToolCall.input),
        result: remainingToolResult,
      });
    }
  }
};
```

Modified denial handling to call helper before exit:

```typescript
// Add denied results for remaining unprocessed tools
await addDeniedResultsForRemainingTools();

if (!denyReason) {
  await history.addMessage({ role: 'tool', content: toolResults.map(...) });
  return { success: false, error: { type: 'tool_denied', ... } };
} else {
  break;
}
```

### Key Design Decisions

1. **Helper function placement:** Defined inside the while loop to have access to `toolCalls` and `toolResults` arrays
2. **Set-based lookup:** Uses `Set` for O(1) lookup of processed tool call IDs
3. **Callback preservation:** Calls `onToolResult` for skipped tools to maintain consistent callback behavior
4. **Distinct error message:** Uses different message ("skipped due to previous tool denial") to distinguish from directly denied tools
