# Run Command Quiet Mode

## Overview

Add `-q/--quiet` mode to `neovate run` command for non-interactive usage. In quiet mode, prompt is required and only the final generated command is output.

## Changes

### File: `src/commands/run.tsx`

#### 1. Add `--quiet/-q` flag parsing

Update `yargsParser` options in `runRun()`:
- Add `quiet: 'q'` to alias
- Add `'quiet'` to boolean array

#### 2. Update `RunOptions` interface

```typescript
interface RunOptions {
  model?: string;
  yes: boolean;
  quiet: boolean;
}
```

#### 3. Update `printHelp()`

Add documentation for the new flag:
```
  -q, --quiet           Quiet mode, output only the command (requires prompt)
```

#### 4. Add `runQuiet()` function

New async function (~30 lines):
- Validate prompt exists, exit with error code 1 if missing
- Initialize `NodeBridge` and `MessageBus` (same pattern as interactive mode)
- Call `messageBus.request('utils.quickQuery', {...})`
- Sanitize response with `sanitizeAIResponse()`
- Print plain text command to stdout
- `process.exit(0)` on success, `process.exit(1)` on error

#### 5. Modify `runRun()` entry point

- Check `argv.quiet` before calling `render()`
- If quiet: call `runQuiet()` and return early
- Otherwise: proceed with existing Ink UI

## Output Behavior

### Quiet Mode
- **Success**: prints only the command string to stdout (no decorations, no UI)
- **Error**: prints error message to stderr, exits with code 1
- **Missing prompt**: prints error to stderr, exits with code 1

### Example Usage

```bash
# Generate command and output to stdout
neovate run -q "list all files"

# Pipe to clipboard
neovate run -q "find large files" | pbcopy

# Use in scripts
CMD=$(neovate run -q "compress images")
echo "Will run: $CMD"
```

## Implementation Notes

- Follows same pattern as `index.ts` which separates `runQuiet()` from `runInteractive()`
- Bypasses Ink UI entirely for minimal overhead
- Reuses existing `utils.quickQuery` message bus request
