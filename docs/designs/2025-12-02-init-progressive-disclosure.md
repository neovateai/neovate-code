# Improve /init Command with Progressive Disclosure

**Date:** 2025-12-02

## Context

The current `/init` command auto-generates a comprehensive `AGENTS.md` file by analyzing the codebase and putting all information into a single file. However, research on LLM context management (from the HumanLayer article "Writing a Good CLAUDE.md") reveals several problems with this approach:

1. **LLMs are stateless** - They only know what's in their context window, making AGENTS.md critical
2. **Instruction overload** - LLMs can reliably follow ~150-200 instructions; Claude Code's system prompt already uses ~50
3. **Less is more** - The more non-universally-applicable content in AGENTS.md, the more likely LLMs will ignore it
4. **Length matters** - Best practice is <60 lines for the root AGENTS.md file
5. **Auto-generation is problematic** - AGENTS.md has the highest leverage point in the framework; it deserves careful manual crafting

The article advocates for:
- Minimal, universally-applicable AGENTS.md (WHY/WHAT/HOW only)
- **Progressive disclosure** - Point to separate documentation files that agents read only when needed
- Never use AGENTS.md as a linter replacement or dumping ground for commands
- Avoid auto-generation entirely

However, completely removing `/init` would leave users without guidance. The goal is to improve `/init` to follow progressive disclosure principles while still providing useful scaffolding.

## Discussion

### Key Design Decisions

**Question 1: Which improvement aspects are most important?**
- **Progressive Disclosure (A)** - Create minimal AGENTS.md that references separate documentation files
- **Reduced Instructions (B)** - Target <60 lines, focus on universally applicable WHY/WHAT/HOW
- **Decision:** Both A and B together - they naturally complement each other

**Question 2: How should documentation file structure be handled?**
- Option A: Reference existing docs only
- Option B: Create both AGENTS.md AND separate documentation files
- Option C: Suggest additional docs but don't create them
- **Decision:** Option B - Analyze codebase and create needed documentation structure

**Question 3: What architectural approach?**
- Option 1: Single-pass generation with templates (simple but inflexible)
- Option 2: Two-phase analysis (adaptive, creates only what's needed)
- Option 3: Hybrid with structured output and programmatic limits
- **Decision:** Option 2 - Two-phase provides intelligence to avoid unnecessary files

### Trade-offs

**Two-phase approach pros:**
- Only creates documentation that's actually needed
- Better adheres to "less is more" principle
- Handles diverse project types intelligently

**Two-phase approach cons:**
- Requires two LLM calls (slower, more expensive)
- More complex implementation
- Risk of misjudging what's needed (mitigated by conservative creation)

## Approach

Transform `/init` into an intelligent two-phase documentation generator that creates minimal AGENTS.md + targeted documentation files using progressive disclosure principles.

**Core Principles:**
1. AGENTS.md stays minimal (<60 lines) with only WHY/WHAT/HOW
2. All detailed information goes into separate `docs/agent/*.md` files
3. Only create documentation files where substantial content exists
4. AGENTS.md includes "Progressive Disclosure" section listing available docs
5. Remind users to review and refine manually after generation

## Architecture

### Phase 1: Discovery & Planning

**Inputs analyzed:**
1. `package.json` / `Cargo.toml` / build configs → Commands, tech stack
2. Existing `AGENTS.md` / `CLAUDE.md` / `.cursorrules` → Preserve valuable content
3. `README.md` → Project purpose, setup instructions
4. `docs/` directory → Check for existing documentation
5. Key source files → Architectural patterns (not exhaustive)

**Structured output (JSON):**
```typescript
{
  agentsContent: {
    why: string,      // <100 words
    what: string,     // <150 words
    how: string       // <100 words, 3-5 commands max
  },
  docsToCreate: [
    {
      path: "docs/agent/development_commands.md",
      purpose: "All build, test, lint commands",
      content: string
    },
    // Only files with substantial content
  ]
}
```

**Size constraints enforced in prompt:**
- WHY: max 100 words (1-3 sentences)
- WHAT: max 150 words (bullet points)
- HOW: max 100 words (3-5 essential commands)
- Target: 40-60 lines total for AGENTS.md

### Phase 2: Generation

**AGENTS.md structure:**
```markdown
# AGENTS.md

Guidance for CODE AGENT when working with this repository.

## WHY: Purpose and Goals
[1-3 sentences, <100 words]

## WHAT: Technical Stack
[Bullet points, <150 words]

## HOW: Core Development Workflow
[3-5 essential commands, <100 words]

## Progressive Disclosure

For detailed information, consult these documents as needed:

- `docs/agent/development_commands.md` - All build, test, lint, release commands
- `docs/agent/architecture.md` - Module structure and architectural patterns
- `docs/agent/testing.md` - Test setup, frameworks, and conventions

**When working on a task, first determine which documentation is relevant, then read only those files.**
```

**Documentation file structure:**
```
docs/agent/
  ├── development_commands.md   (if commands found)
  ├── architecture.md            (if patterns found)
  ├── testing.md                 (if test setup found)
  └── conventions.md             (if strong patterns found)
```

**Content distribution:**
- AGENTS.md: Only universally applicable high-level info
- Commands doc: All build/test/lint/dev/release commands
- Architecture doc: Module structure, patterns, data flow, plugin systems
- Testing doc: Test commands, frameworks, file locations, conventions
- Conventions doc: Only if strong patterns exist (imports, naming, organization)

### Error Handling

**Existing AGENTS.md:**
- Compare with generated version
- Show diff and prompt: "AGENTS.md exists. Replace? [y/n]"
- Preserve custom user content

**Existing docs/agent/ files:**
- Check for conflicts
- Ask for each file: "Replace docs/agent/[filename]? [y/n]"
- Allow selective replacement

**Missing information:**
- If insufficient info for a category, don't create that doc
- AGENTS.md always created with minimum: WHY, WHAT, HOW
- Very minimal projects may not need additional docs

**Validation:**
- Verify AGENTS.md under 60 lines after generation
- If over: Auto-move content to appropriate doc files
- Programmatic failsafe for hard limits

**User feedback:**
- Summary: "Created AGENTS.md (45 lines) + 3 documentation files"
- List created files with purposes
- Reminder: "Review and refine manually for best results"

### Implementation

**Command structure:**
```typescript
// Phase 1: Discovery
const discoveryPrompt = {
  role: 'user',
  content: `Analyze codebase and output JSON:
  {
    agentsContent: { why, what, how },
    docsToCreate: [{ path, purpose, content }]
  }
  Constraints: why <100w, what <150w, how <100w, 3-5 commands`
};

// Phase 2: Parse JSON, create files
// Use write tool for each file
// Validate line count
```

**Key dependencies:**
- Reuse existing tools: read, write, ls, grep
- AI SDK structured output or JSON mode for Phase 1
- No new external dependencies

**File operations:**
1. Create `docs/agent/` directory if missing
2. Write AGENTS.md (always)
3. Write doc files from Phase 1 plan
4. Show creation summary

**Testing:**
- Unit tests: JSON parsing, line counting, path generation
- Integration tests: Mock LLM, verify correct file creation
- Manual tests: Run on diverse projects (monorepo, simple app, library)
