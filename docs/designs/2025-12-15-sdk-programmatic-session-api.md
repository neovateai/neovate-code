# SDK Programmatic Session API

**Date:** 2025-12-15

## Context

Create a programmatic SDK (`src/sdk.ts`) that allows external npm package consumers to embed Neovate's agent capabilities in their applications. The SDK should provide a clean, async-generator-based API for sending messages and receiving streaming responses.

## Discussion

**Use case:** External SDK for npm consumers to interact with Neovate programmatically, not internal use.

**API style:** Pull-based async generator for `receive()` method, allowing consumers to iterate over messages with `for await...of`.

**Tool approval:** Auto-approve all tool calls without user interaction, suitable for automated/headless usage.

**Message types:** Expose full internal message structures via `SDKMessage = NormalizedMessage | SDKSystemMessage | SDKResultMessage`. Streaming content is accumulated and emitted as complete messages rather than delta events.

## Approach

Leverage the existing `NodeBridge` + `DirectTransport` pattern (same as `run.tsx`) to create a lightweight wrapper that:

1. Creates a `NodeBridge` with paired `DirectTransport` for communication
2. Wraps the message bus events into an async generator
3. Auto-approves all tool calls for headless operation
4. Provides proper cleanup via `close()` and `Symbol.asyncDispose`

## Architecture

### Types

```typescript
import type { NormalizedMessage, SDKResultMessage, SDKSystemMessage, UserContent } from './message';

export type SDKSessionOptions = {
  model: string;
  cwd?: string;
  productName?: string;
};

export type SDKUserMessage = {
  type: 'user';
  message: UserContent;
  parentUuid: string | null;
  uuid: string;
  sessionId: string;
};

export type SDKMessage =
  | NormalizedMessage
  | SDKSystemMessage
  | SDKResultMessage;

export interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  receive(): AsyncGenerator<SDKMessage, void>;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}

export function createSession(options: SDKSessionOptions): Promise<SDKSession>;

// One-shot convenience function
export function prompt(message: string, options: SDKSessionOptions): Promise<SDKResultMessage>;
```

**SDKUserMessage fields:**
- `type: 'user'` - discriminator for type narrowing
- `message: UserContent` - text string or array of TextPart/ImagePart
- `parentUuid: string | null` - links to parent message for conversation threading
- `uuid: string` - unique identifier for this message
- `sessionId: string` - session this message belongs to

**SDKMessage types:**
- `NormalizedMessage` - full message with role, content, timestamp, uuid, parentUuid
- `SDKSystemMessage` - session init info (sessionId, model, cwd, tools)
- `SDKResultMessage` - request completion (success/error, content, usage)

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

2. **send() method:**
   - Accepts `string | SDKUserMessage`
   - When string: extracts text directly, generates internal uuid/parentUuid
   - When SDKUserMessage: uses `message` field (UserContent), respects provided `uuid`, `parentUuid`, `sessionId`

3. **receive() method:**
   - Yields complete `SDKMessage` types only
   - Accumulates streaming text/thinking deltas internally
   - Emits `NormalizedMessage` when assistant response is complete
   - Emits `SDKSystemMessage` at session init
   - Emits `SDKResultMessage` on request completion (success/error)

4. **Auto-approval:** `onToolApprove` callback always returns `{ approved: true }`

5. **Cleanup:** `close()` and `[Symbol.asyncDispose]` destroy context and close transports

### Usage Example

```typescript
import { createSession, SDKUserMessage } from '@neovate/code/sdk';

const session = await createSession({ model: 'anthropic/claude-sonnet-4-20250514' });

// Simple string message
await session.send("List files in current directory");

for await (const msg of session.receive()) {
  if (msg.type === 'message' && msg.role === 'assistant') {
    console.log('Assistant:', msg.content);
  }
  if (msg.type === 'result') {
    console.log('Done:', msg.subtype);
    break;
  }
}

// Or with full SDKUserMessage for conversation threading
const userMsg: SDKUserMessage = {
  type: 'user',
  message: 'What is in the package.json?',
  parentUuid: null,
  uuid: crypto.randomUUID(),
  sessionId: session.sessionId,
};
await session.send(userMsg);

session.close();

// One-shot usage with prompt()
import { prompt } from '@neovate/code/sdk';

const result = await prompt("List files in current directory", {
  model: 'anthropic/claude-sonnet-4-20250514'
});
console.log('Success:', !result.isError);
```
