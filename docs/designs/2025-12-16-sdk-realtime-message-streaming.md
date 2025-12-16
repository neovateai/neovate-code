# SDK Real-time Message Streaming

**Date:** 2025-12-16

## Context

The programmatic SDK (`src/sdk.ts`) currently buffers all messages and emits them together at the end of a request. When using `session.send()` followed by `session.receive()`, users expect messages to stream in real-time as the LLM generates them, but instead all messages arrive in a batch after the request completes.

The root cause: `send()` uses `await this.messageBus.request('session.send', ...)` which blocks until the entire LLM response is complete. Messages are buffered during the request, then emitted together when `receive()` iterates through them.

## Discussion

### Streaming Behavior Options
- **Real-time streaming**: Messages emit as they arrive during LLM generation, `receive()` yields incrementally
- **Batched at end**: Keep current behavior - all messages available after `send()` completes
- **Hybrid approach**: `send()` returns immediately, messages stream via `receive()`, result emits when done

**Decision**: Real-time streaming was chosen to match user expectations for an interactive SDK.

### send() API Options
- **Fire-and-forget**: `send()` returns immediately after dispatching, `receive()` handles all streaming
- **Wait for start**: `send()` waits until LLM starts responding, then returns while streaming continues

**Decision**: Fire-and-forget for simplicity and immediate return.

### Architecture Approaches
- **Option A: Split Request/Response Pattern**: `send()` fires a one-way event (no await), NodeBridge emits messages via events, new `done` event signals completion
- **Option B: Background Request with Event Bridge**: `send()` starts the request but doesn't await it, request runs in background, events stream through existing `message` handler, add `session.done` event to signal completion
- **Option C: Observable Pattern**: Replace `receive()` with a proper observable or ReadableStream (breaking API change)

**Decision**: Option B - Background Request with Event Bridge. Minimal changes to existing event system while enabling real-time streaming.

## Approach

Transform `send()` from a blocking request to a fire-and-forget pattern:
1. `send()` fires the `session.send` request without awaiting
2. Messages stream through the existing `message` event handler
3. A new `session.done` event signals completion with the final result

## Architecture

### Event Flow
```
SDK                          NodeBridge
 |                               |
 |-- session.send (request) --> |  (don't await)
 |                               | (LLM starts generating)
 |<-- message (event) ----------|
 |<-- message (event) ----------|
 |<-- message (event) ----------|
 |                               | (request completes)
 |<-- session.done (event) -----|
```

### Changes to `sdk.ts`

**1. `send()` method** - Fire request without awaiting:
```typescript
async send(message: string | SDKUserMessage): Promise<void> {
  if (this.isClosed) throw new Error('Session is closed');
  
  // ... prepare content, parentUuid, uuid ...
  this.currentParentUuid = uuid;

  // Fire request without awaiting - runs in background
  this.messageBus.request('session.send', {
    message: content,
    cwd: this.cwd,
    sessionId: this.sessionId,
    model: this.model,
    parentUuid,
    uuid,
  }).catch((error) => {
    // Fallback if session.done event not received
    this.enqueueEvent({
      type: 'result',
      data: { type: 'result', subtype: 'error', isError: true, content: error.message, sessionId: this.sessionId },
    });
    this.enqueueEvent({ type: 'done' });
  });
  
  // Returns immediately
}
```

**2. Add `session.done` event handler** in `setupEventHandlers()`:
```typescript
this.messageBus.onEvent('session.done', (data) => {
  if (data.sessionId !== this.sessionId) return;
  this.enqueueEvent({ type: 'result', data: data.result });
  this.enqueueEvent({ type: 'done' });
});
```

### Changes to `nodeBridge.ts`

Emit `session.done` event after `session.send` request completes:
```typescript
// After the existing result handling in session.send handler
this.messageBus.emitEvent('session.done', {
  sessionId,
  result: {
    type: 'result',
    subtype: result.success ? 'success' : 'error',
    isError: !result.success,
    content: result.success ? result.data?.text || '' : result.error?.message || 'Unknown error',
    sessionId,
    usage: result.usage,
  },
});
```

### New Types

```typescript
type SessionDoneEvent = {
  sessionId: string;
  result: SDKResultMessage;
};
```
