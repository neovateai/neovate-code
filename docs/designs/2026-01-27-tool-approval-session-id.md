# Tool Approval Session ID

**Date:** 2026-01-27

## Context

The `toolApproval` handler in the NodeBridge message bus system lacked session context. When a tool requires user approval, the system needed to know which session the approval request originated from. This information is essential for:

1. **Session identification** - Logging, routing, and handling multi-session scenarios
2. **UI integration** - The UI needs sessionId to perform session-specific actions after approval (e.g., resume session, update session state)

## Discussion

The key question was understanding the purpose of adding `sessionId` to the `toolApproval` flow. After clarification, both use cases were confirmed:

1. Identifying which session is requesting tool approval for logging, routing, or multi-session scenarios
2. Passing sessionId to the UI for session-specific actions after approval

The implementation needed to update multiple files across the codebase since `toolApproval` is used in several contexts:
- Main session flow via `nodeBridge.ts`
- Subagent tool approval via `tools/task.ts`
- UI handler via `uiBridge.ts`
- Quiet mode handlers in `index.ts` and `sdk.ts`

## Approach

Add `sessionId` as a required parameter to the `ToolApprovalInput` type and propagate it through all call sites. The sessionId is already available in the scope where `toolApproval` is called, so no additional data fetching was needed.

## Architecture

### Type Changes

**`src/nodeBridge.types.ts`**
```typescript
type ToolApprovalInput = {
  toolUse: ToolUse;
  category?: ApprovalCategory;
  sessionId: string;  // Added
};
```

### Call Sites Updated

| File | Change |
|------|--------|
| `src/nodeBridge.ts` | Pass `sessionId` when calling `messageBus.request('toolApproval', ...)` |
| `src/tools/task.ts` | Pass `sessionId` in toolApproval request for subagent scenarios |
| `src/uiBridge.ts` | Updated handler to receive and forward `sessionId` to `approveToolUse` |
| `src/ui/store.ts` | Updated `approveToolUse` function signature to accept `sessionId` parameter |
| `src/index.ts` | Updated quiet mode handler to accept params (auto-approve, sessionId unused) |
| `src/sdk.ts` | Updated SDK handler to accept params (auto-approve, sessionId unused) |

### Data Flow

```
nodeBridge.ts (session.send)
    │
    ├─► onToolApprove callback
    │       │
    │       └─► messageBus.request('toolApproval', { toolUse, category, sessionId })
    │               │
    │               └─► uiBridge.ts handler
    │                       │
    │                       └─► appStore.approveToolUse({ toolUse, category, sessionId })
    │
tools/task.ts (subagent)
    │
    └─► messageBus.request('toolApproval', { toolUse, category, sessionId })
            │
            └─► (same flow as above)
```

The `sessionId` parameter flows from the session context through the message bus to the UI layer, making it available for any session-specific operations during the approval process.
