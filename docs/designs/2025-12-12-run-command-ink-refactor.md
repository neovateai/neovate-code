# Run Command Ink/React Refactor

**Date:** 2025-12-12

## Context

The current `src/commands/run.ts` implementation converts natural language to shell commands using AI and optionally executes them. However, it uses `@umijs/clack-prompts` for interaction, which is inconsistent with newer commands like `commit.tsx` that use React/Ink for a richer, more maintainable UI/UX.

The goal is to reimplement `run.ts` as `run.tsx` using React, Ink, and `nodeBridge.ts`, following the patterns established in `commit.tsx` to improve the user experience and maintain codebase consistency.

## Discussion

### Key Questions & Decisions

**Command Failure Recovery:**
- Decision: **Simple retry** - When a command fails, show the error and allow the user to retry the same command or edit it.
- Rejected alternatives: AI-assisted fix (too complex), manual edit only (less flexible)

**Output Display:**
- Decision: **Capture + display** - Capture command output and display formatted result after completion
- Rejected alternatives: Inline streaming (complex), inherit stdio (breaks UI consistency)

**Command History:**
- Decision: **No history** - Each run is independent, keeping the feature simple
- Rationale: YAGNI - session history adds complexity without clear immediate value

**Edit Flow:**
- Decision: **Inline TextInput** - Edit command directly in the Ink UI (consistent with commit.tsx)
- Rejected alternative: External editor (more complex, breaks UI flow)

**AI Query Integration:**
- Decision: **Use `utils.quickQuery` via MessageBus** - Follow the same pattern as `commit.tsx` for consistency
- Rationale: Keeps AI calls decoupled from UI component, uses existing NodeBridge infrastructure

## Approach

Convert `run.ts` to `run.tsx` using a minimal state machine pattern (similar to `commit.tsx`). The implementation will:

1. Use `utils.quickQuery` via MessageBus for AI natural language → shell command conversion
2. Use local `execSync` with captured output (no new NodeBridge handlers needed)
3. Follow commit.tsx patterns: NodeBridge setup for context, MessageBus for query, Ink render
4. Support `--yes` flag for non-interactive auto-execution
5. Provide clear error messages with retry capability
6. Support clipboard copy action

## Architecture

### State Machine

```typescript
type RunState =
  | { phase: 'idle' }                                    // Waiting for user input
  | { phase: 'generating' }                              // AI converting to shell command
  | { phase: 'displaying'; command: string }             // Show command with action options
  | { phase: 'editing'; command: string; editedCommand: string }  // Inline editing
  | { phase: 'executing'; command: string }              // Running command
  | { phase: 'success'; command: string; output: string } // Command succeeded
  | { phase: 'error'; command: string; error: string }   // Command failed, offer retry
  | { phase: 'cancelled' };                              // User cancelled

type RunAction = 'execute' | 'copy' | 'edit' | 'cancel' | 'retry';

interface RunOptions {
  model?: string;
  yes: boolean;  // Auto-execute without confirmation
}
```

### Component Structure

```
src/commands/run.tsx
├── RunUI (main component)
│   ├── Header - "🚀 AI Shell Command Generator" + model info
│   ├── Phase renders:
│   │   ├── idle → TextInput for prompt
│   │   ├── generating → "⏳ Converting to shell command..."
│   │   ├── displaying → CommandCard + ActionSelector
│   │   ├── editing → CommandCard + inline TextInput
│   │   ├── executing → "⏳ Executing command..."
│   │   ├── success → CommandCard + output in green box
│   │   └── error → CommandCard + error in red box + retry option
│   └── ErrorDisplay (reusable, same pattern as commit.tsx)
├── CommandCard (new component) - displays command in styled box
└── RunActionSelector - execute/copy/edit/cancel options
```

### Data Flow

**AI Query Integration:**
```typescript
// Use utils.quickQuery via MessageBus (same pattern as commit.tsx)
const result = await messageBus.request('utils.quickQuery', {
  cwd,
  userPrompt: prompt,
  systemPrompt: SHELL_COMMAND_SYSTEM_PROMPT,
  model: options.model,
});
```

**Shell Execution:**
```typescript
// Local execution with captured output
import { execSync } from 'child_process';

function executeShell(command: string, cwd: string): { success: boolean; output: string } {
  const output = execSync(command, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],  // Capture stdout/stderr
    timeout: 60000,  // 60s timeout
  });
  return { success: true, output };
}
```

**Entry Point:**
```typescript
export async function runRun(context: Context) {
  // 1. Parse args with yargs-parser
  // 2. If --help → printHelp() → return
  // 3. Create NodeBridge + MessageBus pair (for quickQuery)
  // 4. render(<RunUI ... />)
}
```

### Flow Logic

1. **Prompt Collection:**
   - If prompt provided via CLI args → skip `idle`, go to `generating`
   - Otherwise → start in `idle` phase with TextInput

2. **Command Generation:**
   - Call `utils.quickQuery` via MessageBus with `SHELL_COMMAND_SYSTEM_PROMPT`
   - On success → transition to `displaying`
   - On error → show error with retry option

3. **User Decision:**
   - If `--yes` flag → skip `displaying`, go straight to `executing`
   - Otherwise → show ActionSelector (execute/copy/edit/cancel)

4. **Execution:**
   - Capture stdout/stderr with 60s timeout
   - On success → show output in green box
   - On error → show error in red box with retry option

5. **Copy to Clipboard:**
   - Copy command to clipboard using `clipboardy`
   - Show success message and auto-exit

6. **Error Recovery:**
   - Retry returns to `displaying` phase (not re-generation)
   - User can edit command before retrying

### Error Handling

| Scenario | Handling |
|----------|----------|
| AI query fails | Show error, allow retry (re-generate) |
| Command execution fails | Show error + output, allow retry/edit |
| Command timeout (60s) | Treat as error with timeout message |
| User presses Escape | Cancel current phase, exit if in idle/generating |
| Empty prompt | Stay in idle phase, don't proceed |

**Escape Key Behavior:**
- `idle` / `generating` → exit immediately
- `editing` → return to `displaying` (discard edits)
- `displaying` / `success` / `error` → exit

**Auto-Exit:**
- `success` with `--yes` flag → exit after 1.5s (show result briefly)
- `success` after copy → exit after 1s
- `cancelled` → exit immediately

### Implementation Notes

- **Use `utils.quickQuery` via MessageBus** - Same pattern as commit.tsx for AI queries
- **Follow commit.tsx patterns** - Same NodeBridge setup, MessageBus usage, render options
- **CommandCard component** - Reusable styled box for displaying shell commands
- **Consistent styling** - Use same color scheme and borders as commit.tsx
- **Keep SHELL_COMMAND_SYSTEM_PROMPT** - Existing system prompt is well-tested
- **Copy to clipboard** - Uses `clipboardy` package (same as commit.tsx)

### Out of Scope (YAGNI)

- Command history/session memory
- External editor integration
- AI-assisted error fixing
- Streaming command output
- Command preview/dry-run mode
