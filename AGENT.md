# Takumi Development Rules

This file guides AI agents working on this codebase.

## Commands

- **Build:** `npm run build`
- **Format:** `npm run format` (Uses Prettier)
- **Lint/Typecheck:** `npm run typecheck`
- **Test:** `npm run test`

## Code Style & General Guidelines

- **Language:** TypeScript.
- **Formatting:** Prettier (`npm run format`). Imports sorted by plugin.
- **Naming:** camelCase for variables/functions, PascalCase for classes/types/interfaces.
- **Error Handling:** Use `try...catch` or `async/await` with `try...catch`.
- **Dependencies:** Check `package.json` before adding.
- **Comments:** Avoid unless explaining complex logic.
- **Logging:** Use `src/utils/logger.ts`.
- **Practices:** Follow existing patterns. Keep functions small. Verify changes with tests.

## Approval Modes

Takumi now supports granular tool approval controls via the `approvalMode` configuration:

- **`default`**: Requires approval for write operations and commands (auto-approves read operations)
- **`autoEdit`**: Only requires approval for command execution (auto-approves read and write operations)
- **`yolo`**: Never requires approval (all tools execute automatically)

### Configuration Examples

```bash
# Set approval mode globally
takumi config set approvalMode default

# Set approval mode for current project
takumi config set approvalMode autoEdit --project
```

### Tool Categories

Tools are categorized for approval logic:
- **Read tools** (ls, read, glob, grep): Low risk, usually auto-approved
- **Write tools** (write, edit): Medium risk, require approval in default mode  
- **Command tools** (bash): High risk, require approval in default and autoEdit modes
- **Network tools** (fetch): Medium risk, configurable approval
