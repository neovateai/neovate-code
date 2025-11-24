# Test Command for NodeBridge Handlers

**Date:** 2025-11-18

## Context

Add a `__test` command to `src/commands/` for testing nodeBridge handlers during development. The command should use Ink for rendering and initially support testing handlers including:
- `project.getRepoInfo`
- `project.workspaces.list`
- `project.workspaces.get`

The command will use `@src/ui/PaginatedSelectInput.tsx` for rendering the handler selection interface.

The primary purpose is to serve as a **development/debugging tool** for developers to manually test nodeBridge handlers during development - invoke handlers, see responses, and catch bugs.

## Discussion

### Detail Level
The command will show **verbose** output including:
- Full request payload
- Response data
- Timing information
- Any errors with stack traces

This comprehensive debugging output helps developers understand exactly what's happening during handler execution.

### Interaction Model
The command uses an **interactive loop** approach:
1. Launch an interactive UI where you select a handler from a list
2. Test the selected handler and see results
3. Optionally test another handler (repeat until exit)

This allows developers to quickly test multiple handlers without restarting the command.

### Implementation Approach
Selected **Approach A: Simple Handler Registry**:
- Create a static map of handlers to test with metadata
- Main loop: PaginatedSelectInput → Execute handler → Display results → Return to selection
- Results displayed in a custom Ink component with structured sections
- Exit via ESC key

**Trade-offs:** Simple to implement and easy to maintain. Requires manually adding each handler to the registry, but this is acceptable for a dev tool. Limited flexibility compared to auto-discovery, but sufficient for the initial use case.

## Approach

The `__test` command follows the existing NodeBridge pattern from `src/index.ts`:

1. **Bridge Setup:** Create NodeBridge instance with DirectTransport pair (same as runInteractive mode)
2. **Communication:** Use `messageBus.request()` to call handlers from the UI side
3. **Interactive Loop:** Display handler list → Execute → Show results → Loop back
4. **Exit:** ESC key exits the command

## Architecture

### Core Structure

```
__test.ts
├── Command Entry Point
│   ├── Create NodeBridge (like runInteractive)
│   ├── Create DirectTransport pair
│   ├── Set up message bus communication
│   └── Render TestUI component
├── TestUI Component (Ink-based)
│   ├── Uses bridge.messageBus.request() to call handlers
│   ├── HandlerSelector (PaginatedSelectInput)
│   ├── ResultsDisplay (verbose output)
│   └── State machine (selection → execution → results → loop)
└── Handler Registry
    └── Static array of test definitions
```

### Communication Pattern

```typescript
// In __test.ts (similar to runInteractive)
const nodeBridge = new NodeBridge({ contextCreateOpts });
const [uiTransport, nodeTransport] = DirectTransport.createPair();
messageBus.setTransport(uiTransport);
nodeBridge.messageBus.setTransport(nodeTransport);

// In TestUI component (similar to how UI makes requests)
const result = await messageBus.request('project.getRepoInfo', { 
  cwd: process.cwd() 
});
```

### Handler Registry Format

```typescript
const TEST_HANDLERS = [
  {
    label: 'Project: Get Repo Info',
    handler: 'project.getRepoInfo',
    getData: (cwd: string) => ({ cwd })
  },
  {
    label: 'Project: List Workspaces',
    handler: 'project.workspaces.list',
    getData: (cwd: string) => ({ cwd })
  },
  {
    label: 'Project: Get Workspace',
    handler: 'project.workspaces.get',
    getData: (cwd: string) => ({ cwd, workspaceId: 'master' })
  }
];
```

### Component Hierarchy

```
TestUI (main component)
├── State: 'selecting' | 'executing' | 'displaying'
├── When state = 'selecting'
│   └── PaginatedSelectInput (handler list)
├── When state = 'executing'
│   └── Loading indicator
└── When state = 'displaying'
    └── ResultsDisplay (verbose output)
```

### State Machine

- **Selecting**: Shows PaginatedSelectInput with handler list
  - onSelect → transition to 'executing'
  - ESC → exit command
- **Executing**: Shows spinner, calls messageBus.request()
  - Captures: start time, request payload
  - On response: captures end time, response data, success/error
  - → transition to 'displaying'
- **Displaying**: Shows ResultsDisplay component
  - Any key press → transition back to 'selecting'

### Data Captured During Execution

```typescript
interface TestResult {
  handler: string;
  requestPayload: any;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  response?: any;
  error?: { message: string; stack?: string };
}
```

### ResultsDisplay Layout

```
┌─ Request ────────────┐
│ Handler: project.getRepoInfo
│ Payload: { cwd: "..." }
├─ Response ──────────┤
│ Success: true
│ Data: { ... }       (JSON formatted)
├─ Timing ───────────┤
│ Duration: 45ms
└─ Errors ───────────┘
│ (if any, with stack trace)
```

### Error Handling

1. **NodeBridge Initialization Errors:**
   - Catch during bridge setup
   - Display error message and exit gracefully
   - Example: Invalid cwd, config loading failures

2. **Handler Execution Errors:**
   - Wrap messageBus.request() in try/catch
   - Capture error message and stack trace
   - Display in ResultsDisplay under "Errors" section
   - Still allow returning to selection (don't crash)

3. **UI Rendering Errors:**
   - Ink error boundaries (if component crashes)
   - Fallback to basic error text display

4. **Timeout Handling:**
   - Set reasonable timeout for requests (e.g., 30s)
   - If timeout, show error and allow retry

### Testing Approach

Since this is a dev/debug tool:
- **Manual testing only** - Run the command and verify handlers work
- No automated tests required initially
- Test with both successful and error cases:
  - Valid git repo (success)
  - Non-git directory (error)
  - Invalid cwd (error)

### Implementation Notes

- Use existing error patterns from codebase
- Follow nodeBridge error response format: `{ success: false, error: string }`
- Display raw JSON for verbose debugging (use JSON.stringify with 2-space indent)
- Follow existing command patterns in `src/commands/`
- Registry is easily extensible - just add new entries to TEST_HANDLERS array
