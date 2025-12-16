# Neovate SDK Guide

Programmatic API for integrating Neovate Code into your applications.

## Installation

```bash
npm install @neovate/code
```

## Quick Start

### One-Shot Prompts

For simple, single-turn interactions:

```typescript
import { prompt } from '@neovate/code';

const result = await prompt('Explain what this code does', {
  model: 'anthropic/claude-sonnet-4-20250514',
  cwd: '/path/to/project',
});

console.log(result.content);
```

### Streaming Sessions

For real-time message streaming:

```typescript
import { createSession } from '@neovate/code';

const session = await createSession({
  model: 'anthropic/claude-sonnet-4-20250514',
  cwd: process.cwd(),
});

await session.send('Refactor this function to use async/await');

for await (const msg of session.receive()) {
  if (msg.type === 'message') {
    console.log(`[${msg.role}]`, msg);
  } else if (msg.type === 'result') {
    console.log('Done:', msg.content);
  }
}

session.close();
```

### Resume Sessions

Continue a previous conversation:

```typescript
import { resumeSession } from '@neovate/code';

const session = await resumeSession('session-id-here', {
  model: 'anthropic/claude-sonnet-4-20250514',
});

await session.send('What were we discussing?');

for await (const msg of session.receive()) {
  // Handle messages...
}

session.close();
```

## API Reference

### `prompt(message, options)`

One-shot prompt that returns when complete.

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | The prompt to send |
| `options.model` | `string` | Model identifier (required) |
| `options.cwd` | `string` | Working directory (optional) |

Returns: `Promise<SDKResultMessage>`

### `createSession(options)`

Creates a new streaming session.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.model` | `string` | Model identifier (required) |
| `options.cwd` | `string` | Working directory (optional) |
| `options.productName` | `string` | Product name (optional) |

Returns: `Promise<SDKSession>`

### `resumeSession(sessionId, options)`

Resumes an existing session by ID.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string` | Session ID to resume |
| `options` | `SDKSessionOptions` | Same as createSession |

Returns: `Promise<SDKSession>`

### `SDKSession`

| Method | Description |
|--------|-------------|
| `send(message)` | Send a message (string or SDKUserMessage) |
| `receive()` | AsyncGenerator yielding SDKMessage objects |
| `close()` | Close the session |
| `sessionId` | The session's unique identifier |

## Message Types

| Type | Description |
|------|-------------|
| `system` | Session initialization info |
| `message` | Conversation message (user/assistant/tool) |
| `result` | Final result with success/error status |
