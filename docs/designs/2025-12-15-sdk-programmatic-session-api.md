# SDK Programmatic Session API

**Date:** 2025-12-15

## Context

Create a programmatic SDK (`src/sdk.ts`) that allows external npm package consumers to embed Neovate's agent capabilities in their applications. The SDK should provide a clean, async-generator-based API for sending messages and receiving streaming responses.

## Discussion

**Use case:** External SDK for npm consumers to interact with Neovate programmatically, not internal use.

**API style:** Pull-based async generator for `receive()` method, allowing consumers to iterate over messages with `for await...of`.

**Tool approval:** Auto-approve all tool calls without user interaction, suitable for automated/headless usage.

**Message types:** Simplified view exposing `text`, `tool_use`, `tool_result`, `thinking`, `done`, and `error` - rather than exposing full internal message structures.

## Approach

Leverage the existing `NodeBridge` + `DirectTransport` pattern (same as `run.tsx`) to create a lightweight wrapper that:

1. Creates a `NodeBridge` with paired `DirectTransport` for communication
2. Wraps the message bus events into an async generator
3. Auto-approves all tool calls for headless operation
4. Provides proper cleanup via `close()` and `Symbol.asyncDispose`

## Architecture

### Types

```typescript
export type SDKSessionOptions = {
  model: string;
  cwd?: string;
  productName?: string;
};

export type SDKUserMessage = {
  text: string;
  attachments?: Array<{
    type: 'image';
    data: string;
    mimeType: string;
  }>;
};

export type SDKMessage =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
  | { type: 'tool_result'; id: string; name: string; result: any; isError: boolean }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string };

export interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  receive(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}

export function createSession(options: SDKSessionOptions): Promise<SDKSession>;
```

### Internal Flow

```
┌──────────────────┐     DirectTransport      ┌──────────────────┐
│   SDKSession     │ ◄──────────────────────► │    NodeBridge    │
│  (user-facing)   │                          │  (handles logic) │
└──────────────────┘                          └──────────────────┘
        │                                              │
        │ send() ──────────────────────────────►  session.send
        │                                              │
        │ receive() ◄─────────────────────────  events: message,
        │   (async generator)                   textDelta, chunk
        └──────────────────────────────────────────────┘
```

### Key Implementation Details

1. **Session creation:** `createSession()` instantiates `NodeBridge`, creates `DirectTransport` pair, generates unique `sessionId`, returns `SDKSession` wrapper

2. **Message queue:** `receive()` uses internal queue collecting events from `messageBus.onEvent()`, yielding as `SDKMessage`

3. **Auto-approval:** `onToolApprove` callback always returns `{ approved: true }`

4. **Cleanup:** `close()` and `[Symbol.asyncDispose]` destroy context and close transports

### Usage Example

```typescript
const session = await createSession({ model: 'anthropic/claude-sonnet-4-20250514' });

await session.send("List files in current directory");

for await (const msg of session.receive()) {
  if (msg.type === 'text') console.log(msg.text);
  if (msg.type === 'done') break;
}

session.close();
```
