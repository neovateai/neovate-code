# Log Command File Path Argument

**Date:** 2025-12-12

## Context

The `neovate log` command currently only supports an interactive session picker UI. Users want the ability to specify a session file directly via command line argument, enabling quick access to specific session logs without navigating through the picker.

## Discussion

### Input Format
- **Decision:** Support full file paths (both absolute and relative)
- Example: `neovate log ./abc/session.jsonl` or `neovate log /path/to/session.jsonl`

### Error Handling
- **Decision:** Exit with error message when file doesn't exist
- Example: `Session file not found: ./abc/session.jsonl`
- Alternative considered: Fall back to interactive picker (rejected for simplicity)

### Argument Style
- **Decision:** Positional argument
- Usage: `neovate log ./abc/session.jsonl`
- Alternative considered: Named flag `--file` or `-f` (rejected for brevity)

### Implementation Approach
- **Decision:** Minimal changes (Approach A)
- Modify `runLog` to accept optional file path parameter
- Resolve path, validate existence, generate HTML directly
- Alternative considered: Refactor to decouple from `context.paths` (rejected as over-engineering)

## Approach

Add an optional `filePath` parameter to `runLog`. When provided:
1. Resolve the path (handle relative paths via `process.cwd()`)
2. Validate file exists, exit with error if not
3. Generate HTML directly and open in browser
4. Skip the interactive UI entirely

When no argument is provided, fall back to existing interactive session picker behavior.

## Architecture

### Function Signature Change

```typescript
// Before
export async function runLog(context: Context)

// After
export async function runLog(context: Context, filePath?: string)
```

### New Helper Function

`generateHtmlForFile(filePath: string)` - Similar to `generateHtmlForSession` but:
- Takes a file path instead of session ID
- Extracts session ID from filename for display
- Reads messages directly from provided path
- Locates `requests/` directory relative to the session file

### Path Resolution

```typescript
const resolvedPath = path.isAbsolute(filePath) 
  ? filePath 
  : path.resolve(process.cwd(), filePath);
```

### Error Handling

- File not found: Exit with `console.error` and `process.exit(1)`
- Invalid JSONL: Existing `readJsonlFile` silently skips invalid lines (unchanged)
