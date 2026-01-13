# Server Shutdown Function Refactor

**Date:** 2026-01-13

## Context

The server command in `src/commands/server/server.ts` had tightly coupled shutdown logic with `process.exit()` calls and signal handlers (`SIGINT`/`SIGTERM`) embedded directly within the function. This made it difficult to use programmatically (e.g., from SDK or tests) where the caller may want to control the lifecycle without the process exiting immediately.

Additionally, signal handlers were scattered across multiple locations (`runServer`, `runQuiet`, `runInteractive`), making the codebase harder to maintain.

## Discussion

Key questions and decisions:

1. **Should the shutdown function call `process.exit()`?**
   - Decision: No. The shutdown function should only stop the server. Process exit should only happen when signal handlers are triggered.

2. **Should `runServer` register SIGINT/SIGTERM handlers?**
   - Decision: No. The caller is responsible for registering signal handlers. This enables programmatic control.

3. **What should `runNeovate` return?**
   - Options considered:
     - `() => Promise<void> | undefined`
     - `{ shutdown?: () => Promise<void> }`
   - Decision: Return `{ shutdown?: () => Promise<void> }` for clarity and extensibility.

4. **Should all commands return a shutdown function?**
   - Decision: Only the server command returns a shutdown function. Other commands return an empty object.

5. **Where should signal handlers live?**
   - Decision: Consolidate all `process.on('SIGINT'/'SIGTERM')` handlers in `cli.ts` as a single entry point.

## Approach

1. **server.ts**: Remove `process.exit()` calls and signal handlers from `runServer`. Return the shutdown function directly.

2. **index.ts**: 
   - Remove signal handlers from `runQuiet` and `runInteractive`
   - Change `runNeovate` return type to `Promise<{ shutdown?: () => Promise<void> }>`
   - Return `{ shutdown }` only for server command, empty `{}` for others

3. **cli.ts**: Register a single signal handler that:
   - Calls `shutdown()` if provided (server command)
   - Calls `process.exit()` after shutdown completes
   - Handles both SIGINT and SIGTERM uniformly

## Architecture

### Flow Diagram

```
cli.ts
  │
  ├─► runNeovate() ─► returns { shutdown? }
  │
  └─► process.on('SIGINT'/'SIGTERM')
        │
        └─► if shutdown exists: await shutdown()
        └─► process.exit(0)
```

### Type Signatures

```typescript
// server.ts
export async function runServer(opts: {
  cwd: string;
  contextCreateOpts: any;
}): Promise<() => Promise<void>>

// index.ts
export async function runNeovate(opts: {
  productName: string;
  productASCIIArt?: string;
  version: string;
  plugins: Plugin[];
  upgrade?: UpgradeOptions;
  argv: Argv;
}): Promise<{ shutdown?: () => Promise<void> }>
```

### Signal Handler Implementation

```typescript
// cli.ts
let isShuttingDown = false;
const handleSignal = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  try {
    if (shutdown) {
      await shutdown();
    }
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};
process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);
```

### Benefits

- **Testability**: Server can be started/stopped programmatically without process exit
- **SDK-friendly**: Consumers can control lifecycle
- **Maintainability**: Single location for all signal handling
- **Consistency**: Uniform shutdown behavior across all commands
