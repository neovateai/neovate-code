# SDK resumeSession API

**Date:** 2025-12-16

## Context

The SDK currently provides `createSession()` for starting new sessions programmatically. Users need the ability to resume existing sessions by session ID, allowing external consumers to continue conversations from previous interactions.

Target API signature:
```typescript
export function resumeSession(sessionId: string, options: SDKSessionOptions): Promise<SDKSession>;
```

## Discussion

**History replay:** Should `resumeSession` load and emit existing messages from the session log?
- Decision: **Connect only** - Resume connects to the session without replaying history. Consumer starts fresh and only receives new messages after calling `send()`.

**Validation timing:** Should session existence be validated upfront or lazily?
- Decision: **Validate early** - Check that the session log exists before returning. Throw an error immediately if the sessionId is not found, rather than failing later during `send()`.

## Approach

1. Reuse the existing `SDKSessionImpl` class - both `createSession` and `resumeSession` return the same implementation
2. Extract shared setup logic (NodeBridge/MessageBus creation) into an internal helper
3. For resume: load the last message UUID from history to set `currentParentUuid`, ensuring new messages chain correctly
4. Validate session existence via `session.messages.list` handler

## Architecture

### Function signature
```typescript
export async function resumeSession(
  sessionId: string, 
  options: SDKSessionOptions
): Promise<SDKSession>
```

### Data flow
```
resumeSession(id, opts)
  → create NodeBridge/MessageBus pair
  → session.initialize (with existing sessionId)
  → session.messages.list → extract lastUuid for parentUuid chaining
  → validate session exists (throw if not found)
  → return SDKSessionImpl with sessionId + lastUuid
```

### Error handling
```typescript
throw new Error(`Session '${sessionId}' not found`);
```

### Validation mechanism
- Use existing `session.messages.list` handler to check session existence
- If no messages and no config found in session log, throw "Session not found"

### Testing considerations
- Resume non-existent session → throws error
- Resume existing session → can send new message
- New messages chain correctly (parentUuid links to last history message)
