# Skills System Implementation

**Date:** 2025-12-12

## Context

The goal is to implement a Skills feature based on the Codex CLI implementation (commit a8d5ad3, PR #7412). Skills are reusable instruction bundles stored on disk as `SKILL.md` files that the agent can discover and use to handle specialized tasks.

Key motivations:
- Allow users to create domain-specific instructions (e.g., PDF processing, linting workflows)
- Keep agent context lean by only loading skill metadata at startup
- Enable both explicit invocation (`$skillName`) and implicit LLM-driven usage

The implementation reference was provided in `skill-impl.md` from another code agent (Codex), requiring adaptation to suit takumi's architecture.

## Discussion

### Key Questions & Decisions

**1. Feature Flag**
- **Question:** Should skills be gated behind a feature flag (disabled by default)?
- **Decision:** Skills will be **enabled by default** with no feature flag needed.

**2. Invocation Methods**
- **Question:** How should users/LLM invoke skills?
- **Options:**
  - A) Only explicit `$skillName` invocation
  - B) Both explicit and implicit (LLM can read skills based on description)
  - C) Only implicit
- **Decision:** **Both A and B** - explicit `$skillName` triggers automatic injection, while LLM can also read skill files on its own based on descriptions.

**3. Implementation Approach**
- **Options explored:**
  1. Standalone Module (new `SkillManager` class, similar to `SlashCommandManager`)
  2. Plugin-based Architecture (built-in plugin with hooks)
  3. Integrated with SlashCommandManager (skills as special commands)
- **Decision:** **Approach 1 - Standalone Module** - follows existing patterns, clean separation, easy to test.

**4. Path Configuration**
- **Requirement:** Use dynamic `productName` from context, not hardcoded "takumi"
- Paths: `~/.${productName}/skills/` (global) and `.${productName}/skills/` (project-local)

## Approach

The Skills system will be implemented as a standalone module following these principles:

1. **Lazy Loading**: Skill bodies stay on disk until explicitly invoked → keeps context small
2. **Progressive Disclosure**: LLM reads only what it needs from SKILL.md
3. **Explicit Invocation**: `$skillName` syntax for unambiguous skill selection
4. **Two Discovery Roots**: Global + project-local for flexibility
5. **Validation at Startup**: Catch errors early, don't block the agent
6. **Context Hygiene**: Only names/descriptions in system prompt, not bodies

## Architecture

### Data Models

```typescript
// Metadata stored in memory (lean)
interface SkillMetadata {
  name: string;        // e.g., "pdf-processing"
  description: string; // e.g., "Extract text from PDFs..."
  path: string;        // Absolute path to SKILL.md
}

interface SkillError {
  path: string;
  message: string;
}

interface SkillLoadOutcome {
  skills: SkillMetadata[];
  errors: SkillError[];
}
```

### SKILL.md File Format

```markdown
---
name: pdf-processing
description: Extract text and tables from PDFs; use when PDFs mentioned.
---

# PDF Processing

## Instructions
- Use pdfplumber to extract text
- For tables, use camelot or tabula-py
```

**Validation Rules:**
- `name`: Required, max 64 characters, single line
- `description`: Required, max 1024 characters, single line
- Frontmatter delimited by `---`
- Extra YAML keys are ignored

### Directory Structure

```
~/.${productName}/
└── skills/
    ├── pdf-processing/
    │   ├── SKILL.md           # Required
    │   └── references/        # Optional helper files
    └── linting/
        └── SKILL.md

# Project-local:
.${productName}/
└── skills/
    └── project-specific/
        └── SKILL.md
```

### SkillManager Class

```typescript
class SkillManager {
  private skills: SkillMetadata[] = [];
  private errors: SkillError[] = [];
  
  constructor(opts: { paths: Paths; productName: string })
  
  getSkills(): SkillMetadata[]
  getErrors(): SkillError[]
  findSkillMentions(text: string): SkillMetadata[]
  async readSkillBody(skill: SkillMetadata): Promise<string>
  formatSkillInjection(name: string, path: string, contents: string): string
}
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/skill.ts` | **Create** | New module with `SkillManager` class, types, loading logic |
| `src/context.ts` | **Modify** | Add `skillManager` to Context, initialize in `create()` |
| `src/systemPrompt.ts` | **Modify** | Add `skills` param, add `renderSkillsSection()` helper |
| `src/nodeBridge.ts` | **Modify** | Inject skill bodies when processing `session.send` |

### Initialization Flow

```
1. Context.create()
   ├── Create Paths (already exists)
   ├── Create SkillManager(paths, productName)
   │   ├── Scan ~/.${productName}/skills/
   │   ├── Scan .${productName}/skills/
   │   └── Collect skills[] and errors[]
   └── Store skillManager in Context

2. System prompt generation
   ├── generateSystemPrompt({ ..., skills })
   └── Append "## Skills" section with metadata only
```

### Runtime Flow

```
1. User sends message: "Process invoice.pdf using $pdf-processing"

2. nodeBridge handles session.send
   ├── skillManager.findSkillMentions(text)
   │   └── Returns [{ name: "pdf-processing", ... }]
   ├── skillManager.readSkillBody(skill)
   │   └── Returns full SKILL.md contents
   └── Append formatted skill injection to message

3. LLM receives:
   ├── System prompt (with ## Skills metadata)
   ├── User message text
   └── <skill>...</skill> injection
```

### Skill Body Injection Format

```xml
<skill>
<name>pdf-processing</name>
<path>/Users/user/.${productName}/skills/pdf-processing/SKILL.md</path>
---
name: pdf-processing
description: Extract text from PDFs...
---

# PDF Processing
... full skill body ...
</skill>
```

### Error Handling

- Loading errors are collected during startup but don't block the agent
- Errors are logged to console with file paths and messages
- Invalid skills are ignored until fixed
- Missing skill files during injection produce a warning, agent continues with best effort
