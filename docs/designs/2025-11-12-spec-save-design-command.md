# Spec Save Design Command

**Date:** 2025-11-12

## Context

Add a slash command to save brainstorming session designs to `docs/designs/` with date prefix. The command should be located under `src/slash-commands/builtin/spec/` following the pattern of existing spec commands.

## Discussion

### Capture Strategy
The command should automatically capture the entire conversation history from the current session and save it as the design document. Specifically, only messages after the `/spec:brainstorm` command was invoked (the brainstorming conversation only).

### Filename Format
Format: `YYYY-MM-DD-<descriptive-name>.md` where the descriptive name is auto-generated from the conversation topic (e.g., `2025-11-12-save-design-command.md`).

### Command Type
Use a `PromptCommand` type slash command, which instructs the LLM to handle the saving process rather than implementing direct file manipulation logic.

## Approach

A `PromptCommand` that instructs the LLM to review the brainstorming conversation, format it as a design document, generate an appropriate filename, and save it using the `write` tool.

### Flow
1. User invokes `/spec:save-design`
2. Command generates prompt with instructions to the LLM
3. LLM reviews conversation history since `/spec:brainstorm`
4. LLM formats the content as a structured design document
5. LLM generates filename: `YYYY-MM-DD-<topic>.md`
6. LLM uses `write` tool to save to `docs/designs/`

## Architecture

### File Structure
- New file: `src/slash-commands/builtin/spec/save-design.ts`
- Export and register in `src/slash-commands/builtin/index.ts`
- Follows same pattern as `brainstorm.ts`, `write-plan.ts`, `execute-plan.ts`

### Command Definition
- Name: `spec:save-design`
- Type: `prompt`
- Description: Save the current brainstorming session as a design document
- No arguments needed (auto-generates filename from conversation)

### Prompt Instructions
The prompt will instruct the LLM to:
1. Locate the `/spec:brainstorm` invocation in the conversation history
2. Extract all messages after that point (user + assistant)
3. Format as a cohesive design document with sections
4. Generate a slug from the main topic (lowercase, hyphens, ~3-5 words max)
5. Get current date in YYYY-MM-DD format
6. Use write tool: `docs/designs/{date}-{slug}.md`

### Design Document Format
```markdown
# [Feature Name]

**Date:** YYYY-MM-DD

## Context
[Initial user request/idea]

## Discussion
[Key questions and answers explored]

## Approach
[Final design decisions]

## Architecture
[Technical details if discussed]
```

### Integration
Add to `src/slash-commands/builtin/index.ts`:
- Import: `import { saveDesignCommand } from './spec/save-design';`
- Add to array: `saveDesignCommand(opts.language),`

### Error Handling
- If `/spec:brainstorm` not found in history → inform user no brainstorming session detected
- If file already exists with same name → LLM should append timestamp or increment number
- If `docs/designs/` directory doesn't exist → create it automatically

## Testing

Manual test:
1. Run `/spec:brainstorm` → have a conversation
2. Run `/spec:save-design`
3. Verify file created in `docs/designs/` with correct date prefix
4. Verify content includes conversation from brainstorm onward
5. Check filename generation makes sense

No automated tests needed (follows pattern of other spec commands which are prompt-based).
