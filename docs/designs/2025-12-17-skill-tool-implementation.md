# Skill Tool Implementation

**Date:** 2025-12-17

## Context

The goal is to add a Skill tool to `src/tools/` that allows Claude to execute skills (specialized prompt-based commands) within the main conversation. Skills provide specialized capabilities and domain knowledge loaded from SKILL.md files.

The implementation should follow the patterns documented in `skill-tool.md` but with a simplified approach:
- No input validation or permission checking
- No telemetry
- No context modifier
- No permission system

## Discussion

### Key Questions Addressed

1. **Dependency Injection Pattern**: How should the Skill tool access SkillManager?
   - **Decision**: Pass via `createSkillTool({ skillManager })` - follows existing patterns like `createTodoTool`, `createBashTool`

2. **Output Format**: What should llmContent contain?
   - **Decision**: Follow section 8 of skill-tool.md ("Prompt Processing via dtB()")
   - Return a messages array with command metadata XML and prompt content
   - Use `safeStringify()` to convert to string

### Message Structure

Following the original implementation pattern:
- **Message 1**: Command metadata with `<command-message>` and `<command-name>` XML tags
- **Message 2**: Skill prompt content with base directory prefix, marked as `isMeta: true`

## Approach

Create a simple, focused Skill tool that:
1. Receives skill name as input
2. Looks up skill in SkillManager
3. Reads skill body content
4. Formats response as messages array following dtB() pattern
5. Returns stringified messages as llmContent

Error handling is minimal - just check if skill exists.

## Architecture

### File Location
`src/tools/skill.ts`

### Interface

```typescript
createSkillTool(opts: { skillManager: SkillManager }): Tool
```

### Input Schema

```typescript
z.object({
  skill: z.string().describe('The skill name to execute'),
})
```

### Output Format

```typescript
// Success case
{
  llmContent: safeStringify([
    {
      type: 'text',
      text: '<command-message>${skillName} is running…</command-message>\n<command-name>${skillName}</command-name>',
    },
    {
      type: 'text',
      text: 'Base directory for this skill: ${baseDir}\n\n${skillBody}',
      isMeta: true,
    },
  ]),
  returnDisplay: 'Loaded skill: ${skillName}',
}

// Error case
{
  isError: true,
  llmContent: 'Skill "${skillName}" not found',
}
```

### Implementation

```typescript
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../tool';
import type { SkillManager } from '../skillManager';
import { safeStringify } from '../utils/safeStringify';

export function createSkillTool(opts: { skillManager: SkillManager }) {
  return createTool({
    name: 'skill',
    description: 'Execute a skill within the conversation',
    parameters: z.object({
      skill: z.string().describe('The skill name to execute'),
    }),
    async execute({ skill }) {
      const skillName = skill.trim();
      const foundSkill = opts.skillManager.getSkills().find(s => s.name === skillName);

      if (!foundSkill) {
        return {
          isError: true,
          llmContent: `Skill "${skillName}" not found`,
        };
      }

      const body = await opts.skillManager.readSkillBody(foundSkill);
      const baseDir = path.dirname(foundSkill.path);

      const messages = [
        {
          type: 'text',
          text: `<command-message>${skillName} is running…</command-message>\n<command-name>${skillName}</command-name>`,
        },
        {
          type: 'text',
          text: `Base directory for this skill: ${baseDir}\n\n${body}`,
          isMeta: true,
        },
      ];

      return {
        llmContent: safeStringify(messages),
        returnDisplay: `Loaded skill: ${foundSkill.name}`,
      };
    },
    approval: { category: 'read' },
  });
}
```

### Summary Table

| Aspect | Implementation |
|--------|----------------|
| Input | `{ skill: string }` |
| DI | `createSkillTool({ skillManager })` |
| Output | Messages array → safeStringify |
| Message 1 | `<command-message>` + `<command-name>` XML |
| Message 2 | Base directory + skill body, `isMeta: true` |
| Error | `{ isError: true, llmContent: "Skill not found" }` |
| Approval | `{ category: 'read' }` |
| Excluded | Validation, permissions, telemetry, context modifier |
