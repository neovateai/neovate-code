# onRequest/onResponse HTTP Logging Hooks

**Date:** 2026-01-30

## Context

The codebase already had `RequestLogger` that logs request/response metadata via `onStreamResult` callback. However, there was a need to intercept the actual HTTP fetch calls to log raw request details (URL, headers, body) and response metadata (status, headers) at the fetch level, excluding streaming body/chunks.

## Discussion

**Key Questions:**

1. **What additional logging is needed?** - Log raw fetch request (URL, headers, body) before the call, and response (headers, status) after, but not chunks or body content.

2. **How should hooks be passed to `_mCreator`?** - Two options were considered:
   - Pass as `_mCreator` argument (each `runLoop` call can provide different hooks)
   - Bind at resolve time (hooks fixed when model is resolved)
   
   Decision: Pass as `_mCreator` argument for flexibility.

**Trade-offs:**
- The `requestId` is generated inside `runLoop` before calling `_mCreator`, but hooks are called inside `customFetch`. Solution: Loop injects `requestId` into hooks before passing to `_mCreator`.

## Approach

Add HTTP-level logging hooks that flow from `loop.ts` → `_mCreator` → `customFetch` → `RequestLogger`:

1. Define `OnRequestHook` and `OnResponseHook` types in `loop.ts`
2. Pass hooks through `_mCreator` to `createModelCreator`
3. Call hooks in `customFetch` before/after the fetch call
4. Wire hooks in `project.ts` to `RequestLogger.logRequest()`/`logResponse()`

## Architecture

### Data Flow

```
loop.ts (RunLoopOpts.onRequest/onResponse)
    ↓ passes to _mCreator with requestId injection
model.ts (_mCreator receives hooks)
    ↓ passes to createModelCreator
utils.ts (customFetch calls hooks)
    ↓ 
project.ts (hooks → RequestLogger)
```

### Type Definitions

**loop.ts:**
```typescript
export type OnRequestHook = (req: {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}) => void;

export type OnResponseHook = (res: {
  requestId: string;
  url: string;
  status: number;
  headers: Record<string, string>;
}) => void;
```

**utils.ts** (internal types without requestId, added by loop.ts):
```typescript
export type UtilsOnRequestHook = (req: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}) => void;

export type UtilsOnResponseHook = (res: {
  url: string;
  status: number;
  headers: Record<string, string>;
}) => void;
```

### File Changes

1. **loop.ts**: Added hook types to `RunLoopOpts`, injects `requestId` when calling `_mCreator`
2. **model.ts**: Updated `ModelInfo._mCreator` signature to accept hooks
3. **utils.ts**: `customFetch` calls `onRequest` before fetch, `onResponse` after with status/headers only
4. **jsonl.ts**: Added `logRequest()` and `logResponse()` methods to `RequestLogger`
5. **project.ts**: Wired `onRequest`/`onResponse` callbacks to `RequestLogger`

### Key Implementation Notes

- Hooks are optional, maintaining backward compatibility
- Response hook captures headers/status only, no body/chunks per requirement
- Each `runLoop` invocation can provide different hook implementations
- `requestId` is injected by `loop.ts` to correlate requests with other logs
