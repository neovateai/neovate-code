# Context Slash Command

**Date:** 2025-11-19

## Context

Users need transparency into what data is being sent to the LLM and how their context window is being utilized. This feature adds a `/context` slash command that analyzes and displays token usage breakdown for the current session, showing:

- System prompt tokens
- System tools tokens
- MCP tools tokens
- Messages tokens
- Free space remaining

The primary goal is transparency, helping users understand exactly what's consuming their context window.

## Discussion

### Key Decisions

**Data Source:** The command analyzes the last API request made to the LLM by reading the JSONL log file associated with the latest assistant message, rather than reconstructing the context on-demand.

**Model Context Window:** Uses `resolveModelWithContext()` to dynamically get the current model's context window size (e.g., 200k for Claude 3.5 Sonnet), which is used to calculate percentages.

**Error Handling:** The command requires at least one assistant message to exist before it can run. If run in a new session, it shows: "No context available - send a message first to analyze context usage"

**Display Categories:** Shows 5 categories (excluding custom agents which were considered but removed):
- System prompt
- System tools (non-MCP)
- MCP tools (prefixed with "mcp__")
- Messages
- Free space

### Alternative Approaches Considered

1. **Pure Node Bridge (Selected):** All logic in `nodeBridge.ts` handler. Clean separation, reusable, easy to test.

2. **Hybrid Logic:** Node bridge fetches data, slash command processes. Rejected due to mixed concerns.

3. **Dedicated Service Module:** New `contextAnalyzer.ts` module. Rejected as over-engineering for a single feature.

## Approach

The `/context` command follows the existing slash command pattern (like `/clear`). When invoked:

1. Calls `project:analyzeContext` handler via nodeBridge
2. Handler analyzes the last API request from JSONL logs
3. Returns structured token count data with percentages
4. Displays results in a formatted table

This approach leverages existing infrastructure (nodeBridge, JSONL logging, token counter) while keeping the implementation simple and maintainable.

## Architecture

### Components

**1. Slash Command (`src/slash-commands/builtin/context.tsx`)**
- JSX component following `clear.tsx` pattern
- Calls nodeBridge with `project:analyzeContext`
- Renders formatted output using Ink components (`<Box>`, `<Text>`)
- Displays token counts with colors and percentage bars

**2. Node Bridge Handler (`src/nodeBridge.ts`)**
- Handler: `project:analyzeContext`
- Input: `{ cwd: string, sessionId: string }`
- Output: `{ success: boolean, error?: string, data?: AnalysisResult }`
- Contains all analysis logic

### Data Flow

```
Slash Command
    ↓
nodeBridge.project:analyzeContext
    ↓
1. Read session messages (history.ts)
2. Find latest assistant message UUID
3. Read JSONL: .takumi/logs/{sessionId}/{uuid}.jsonl
4. Parse first line JSON (the request)
5. Extract: body.system, body.messages, body.tools
6. Resolve model context window size
7. Count tokens per category
8. Calculate percentages
    ↓
Return structured data
    ↓
Display formatted table
```

### Token Counting Logic

- **System prompt:** `countToken(body.system)` - handles string or array format
- **System tools:** Filter tools without "mcp" prefix, stringify, count
- **MCP tools:** Filter tools with "mcp__" prefix, stringify, count
- **Messages:** `countToken(body.messages)` - array of message objects
- **Free space:** `totalContextWindow - (sum of all categories)`

### Error Handling

Handler returns `{success: false, error: string}` for:

1. No assistant messages yet → "No context available - send a message first to analyze context usage"
2. JSONL file not found → "Request log file not found"
3. JSONL parse error → "Failed to parse request log"
4. Missing body fields → "Invalid request log format"
5. Model resolution fails → "Failed to resolve model context window"

Slash command displays errors in red and exits.

### Interface Types

```typescript
// Request
{
  type: 'project:analyzeContext',
  args: { cwd: string, sessionId: string }
}

// Response
{
  success: boolean,
  error?: string,
  data?: {
    systemPrompt: { tokens: number, percentage: number },
    systemTools: { tokens: number, percentage: number },
    mcpTools: { tokens: number, percentage: number },
    messages: { tokens: number, percentage: number },
    freeSpace: { tokens: number, percentage: number },
    totalContextWindow: number
  }
}
```

### Testing Approach

**Manual testing scenarios:**
1. Happy path: Run after conversation, verify counts and percentages
2. Error case: Run in new session before any messages
3. Different models: Test with various context window sizes
4. Edge cases: Sessions with/without MCP tools, very long conversations

**Validation points:**
- Percentages sum to ~100%
- Token counts in expected ranges
- Display matches reference screenshot
- Error messages are clear and actionable
