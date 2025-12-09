# utils.open Handler

**Date:** 2025-12-09

## Context

Add a new `utils.open` handler to nodeBridge that allows opening various applications (IDEs, terminals, file managers) at a specified working directory. This enables programmatic launching of development tools from the CLI.

## Discussion

**Behavior**: The handler should open apps at the specified `cwd` directory (e.g., VSCode opens the folder, iTerm opens in that directory).

**Response strategy**: Fire-and-forget approach - return success immediately after spawning the process without waiting for confirmation that the app opened. This avoids complexity and potential timeouts.

**App clarification**: `antigravity` is an IDE similar to VSCode/Cursor with CLI command `agy`.

## Approach

Implement a simple handler that maps app names to their CLI commands and spawns detached processes. The handler uses Node.js `child_process.spawn` with `detached: true` and `stdio: 'ignore'` for fire-and-forget behavior.

## Architecture

### Types (nodeBridge.types.ts)

```typescript
type UtilsOpenInput = {
  cwd: string;
  sessionId?: string;
  app: 'cursor' | 'vscode' | 'vscode-insiders' | 'zed' | 'windsurf' | 'iterm' | 'warp' | 'terminal' | 'antigravity' | 'finder' | 'sourcetree';
};

// Add to HandlerMap:
'utils.open': { input: UtilsOpenInput; output: SuccessResponse };
```

### App-to-Command Mapping

| App | Command |
|-----|---------|
| cursor | `cursor <cwd>` |
| vscode | `code <cwd>` |
| vscode-insiders | `code-insiders <cwd>` |
| zed | `zed <cwd>` |
| windsurf | `windsurf <cwd>` |
| antigravity | `agy <cwd>` |
| iterm | `open -a iTerm <cwd>` |
| warp | `open -a Warp <cwd>` |
| terminal | `open -a Terminal <cwd>` |
| finder | `open <cwd>` |
| sourcetree | `open -a SourceTree <cwd>` |

### Handler Implementation (nodeBridge.ts)

```typescript
this.messageBus.registerHandler('utils.open', async (data) => {
  const { cwd, app } = data;
  const { spawn } = await import('child_process');

  const commands: Record<string, { cmd: string; args: string[] }> = {
    cursor: { cmd: 'cursor', args: [cwd] },
    vscode: { cmd: 'code', args: [cwd] },
    'vscode-insiders': { cmd: 'code-insiders', args: [cwd] },
    zed: { cmd: 'zed', args: [cwd] },
    windsurf: { cmd: 'windsurf', args: [cwd] },
    antigravity: { cmd: 'agy', args: [cwd] },
    iterm: { cmd: 'open', args: ['-a', 'iTerm', cwd] },
    warp: { cmd: 'open', args: ['-a', 'Warp', cwd] },
    terminal: { cmd: 'open', args: ['-a', 'Terminal', cwd] },
    finder: { cmd: 'open', args: [cwd] },
    sourcetree: { cmd: 'open', args: ['-a', 'SourceTree', cwd] },
  };

  const config = commands[app];
  const child = spawn(config.cmd, config.args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return { success: true };
});
```

### Notes

- `sessionId` is optional and not used in current implementation (reserved for future use)
- macOS-focused implementation using `open -a` for GUI apps
- IDEs use their CLI commands directly (assumes shell command is installed)
