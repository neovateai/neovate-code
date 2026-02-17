# session.send outputStyle Support

## Summary

Add `outputStyle` parameter support to `session.send` nodeBridge handler and SDK, allowing per-session and per-send output style configuration with fallback to config.

## Motivation

Currently `outputStyle` is only read from `context.config.outputStyle` inside `Project.send()`. There's no way to specify it programmatically via the SDK or per-send through the nodeBridge handler.

## Approach

Thread `outputStyle` as an explicit parameter through `Project.send()` with fallback to `context.config.outputStyle`. This follows the same pattern as the existing `model` override.

## Changes

### 1. `src/project.ts` — Add `outputStyle` to `send()` opts

Add `outputStyle?: string` to the opts parameter. When provided, use it instead of `context.config.outputStyle`:

```typescript
// In send() opts:
outputStyle?: string;

// Usage:
const outputStyle = outputStyleManager.getOutputStyle(
  opts.outputStyle ?? this.context.config.outputStyle,
);
```

### 2. `src/nodeBridge/slices/session.ts` — Accept and forward `outputStyle`

Destructure `outputStyle` from `data` and pass it to `project.send()`:

```typescript
const { message, cwd, sessionId, model, attachments, parentUuid, planMode, thinking, outputStyle } = data;

const result = await project.send(message, {
  // ...existing opts
  outputStyle,
});
```

### 3. `src/sdk.ts` — SDK support

- Add `outputStyle?: string` to `SDKSessionOptions` (session-level default)
- Store it in `SDKSessionImpl` as a private field
- Add optional `outputStyle?: string` to `SDKUserMessage` for per-send override
- In `SDKSessionImpl.send()`, include outputStyle with per-send override taking precedence over session default:

```typescript
outputStyle: (typeof message !== 'string' ? message.outputStyle : undefined) ?? this.outputStyle,
```

### 4. `src/nodeBridge.types.ts` — Type updates

Add `outputStyle?: string` to the `session.send` handler's data type.

## Files Changed

| File | Change |
|---|---|
| `src/project.ts` | Add `outputStyle?: string` to `send()` opts, use with fallback |
| `src/nodeBridge/slices/session.ts` | Destructure & forward `outputStyle` |
| `src/nodeBridge.types.ts` | Add `outputStyle` to `session.send` data type |
| `src/sdk.ts` | Add `outputStyle` to `SDKSessionOptions`, `SDKUserMessage`, thread through `send()` |
