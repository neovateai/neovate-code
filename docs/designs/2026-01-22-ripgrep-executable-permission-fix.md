# Ripgrep Executable Permission Fix

**Date:** 2026-01-22

## Context

When users install the package via npm, the bundled ripgrep binary in `vendor/ripgrep/` may lose its executable permission. This causes `EACCES` errors when the grep tool attempts to spawn the ripgrep process:

```
Ripgrep error: Error: spawn
/Users/yangkang/.nvm/versions/node/v22.19.0/lib/node_modules/@kwaipilot/cli/vendor/ripgrep/arm64-darwin/rg EACCES
```

This is a common issue with npm package publishing where file permissions are not preserved during the pack/publish/install cycle.

## Discussion

Two approaches were considered:

1. **Postinstall script** - Add a `chmod +x` command in the package's postinstall hook to fix permissions after installation.

2. **Runtime permission check** - Detect and fix the permission issue at runtime before executing ripgrep.

The runtime approach was chosen because:
- It's more resilient - handles edge cases where postinstall might not run
- Self-healing - fixes the issue whenever it occurs, regardless of cause
- No additional npm lifecycle script complexity

## Approach

Modify `src/utils/ripgrep.ts` to check and fix executable permissions before returning the vendor ripgrep path:

1. Add a helper function `ensureExecutable()` that:
   - Uses `fs.accessSync()` with `fs.constants.X_OK` to check executable permission
   - If check fails, uses `fs.chmodSync()` to set `0o755` permissions

2. Call this function in `ripgrepPath()` for non-Windows platforms before returning the vendor binary path

## Architecture

### Implementation

```typescript
function ensureExecutable(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
  } catch {
    fs.chmodSync(filePath, 0o755);
  }
}

export function ripgrepPath() {
  const { cmd } = findActualExecutable('rg', []);
  if (cmd !== 'rg') {
    return cmd;  // System rg found, use it directly
  } else {
    const rgRoot = path.resolve(rootDir, 'vendor', 'ripgrep');
    if (process.platform === 'win32') {
      return path.resolve(rgRoot, 'x64-win32', 'rg.exe');
    } else {
      const rgPath = path.resolve(
        rgRoot,
        `${process.arch}-${process.platform}`,
        'rg',
      );
      ensureExecutable(rgPath);  // Fix permissions if needed
      return rgPath;
    }
  }
}
```

### Key Points

- **Windows excluded** - Windows doesn't use Unix file permissions, so `chmod` is not needed
- **Synchronous operations** - Matches the existing synchronous nature of `ripgrepPath()`
- **Fail-safe** - If chmod fails (e.g., read-only filesystem), the original EACCES error will still occur, providing clear debugging info
- **Minimal overhead** - `accessSync` is a fast syscall, negligible performance impact
