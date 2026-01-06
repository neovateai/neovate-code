import type { PromptCommand } from '../types';

export function createInitCommand(opts: { productName: string }) {
  const productName = opts.productName;
  const ruleFile = 'AGENTS.md';
  return {
    type: 'prompt',
    name: 'init',
    description: `Create or improve the ${ruleFile} file with progressive disclosure`,
    progressMessage: `Analyzing codebase to create minimal ${ruleFile} with progressive disclosure...`,
    async getPromptForCommand() {
      return [
        {
          role: 'user',
          content: `
# Progressive Disclosure Documentation Generator

You are creating documentation for this codebase using **progressive disclosure principles**. This means:
- The root ${ruleFile} stays minimal (<60 lines) with only high-level guidance
- Detailed information goes into separate \`docs/agent/*.md\` files
- Only create additional docs where substantial content exists

## TWO-PHASE APPROACH

### Phase 1: Discovery & Analysis

**IMPORTANT: Use the Explore subagent to analyze the codebase thoroughly.**

Launch the Explore subagent with "very thorough" level to understand:

1. **Package/Build Configuration**
   - Find and read \`package.json\`, \`Cargo.toml\`, \`pyproject.toml\`, or similar
   - Extract: scripts/commands, dependencies, project metadata

2. **Existing Documentation**
   - Search for existing \`${ruleFile}\`, \`CLAUDE.md\`, \`.cursorrules\`
   - Read \`README.md\` for project overview
   - Check \`docs/\` directory for existing documentation

3. **Source Code Patterns**
   - Identify key architectural patterns (not exhaustive file listings)
   - Look for plugin systems, configuration patterns, data flow
   - Understand the project structure and module organization

4. **Test Infrastructure**
   - Identify test framework, test locations, testing patterns

### Phase 2: Create Documentation Structure

Based on your analysis, create the following:

## 1. MINIMAL ${ruleFile} (REQUIRED)

**CRITICAL: Must be under 60 lines total**

Structure:
\`\`\`markdown
# ${ruleFile}

This file provides guidance to ${productName} when working with code in this repository.

## WHY: Purpose and Goals
[1-3 sentences explaining what this project does and its core value. MAX 100 WORDS]

## WHAT: Technical Stack
[Bullet points listing key technologies. MAX 150 WORDS]
- Runtime/Language: ...
- Framework: ...
- Key dependencies: ...

## HOW: Core Development Workflow
[3-5 ESSENTIAL commands only. MAX 100 WORDS]
\`\`\`bash
# Development
npm run dev

# Testing
npm test

# Build
npm run build
\`\`\`

## Progressive Disclosure

For detailed information, consult these documents as needed:

- \`docs/agent/development_commands.md\` - All build, test, lint, release commands
- \`docs/agent/architecture.md\` - Module structure and architectural patterns
- \`docs/agent/testing.md\` - Test setup, frameworks, and conventions

**When working on a task, first determine which documentation is relevant, then read only those files.**
\`\`\`

## 2. DOCUMENTATION FILES (CREATE ONLY IF SUBSTANTIAL CONTENT EXISTS)

Create \`docs/agent/\` directory and add files ONLY where you have substantial, specific information:

### docs/agent/development_commands.md
Create if you found multiple commands. Include:
- All npm scripts / build commands with descriptions
- Development server commands
- Linting and formatting commands
- Database/migration commands (if applicable)
- Release/deployment commands (if present)
- CI/CD related commands

### docs/agent/architecture.md
Create if you found clear architectural patterns. Include:
- Project structure philosophy
- Key architectural patterns (MVC, microservices, plugin system, etc.)
- Data flow patterns
- Configuration management approach
- Key abstractions and interfaces
- Build/bundling strategy

### docs/agent/testing.md
Create if you found test infrastructure. Include:
- Test framework and setup
- Test file locations and naming conventions
- How to run tests (all, single, watch mode, coverage)
- Testing patterns and best practices for this codebase
- Mock/fixture conventions

### docs/agent/conventions.md
Create ONLY if strong, unique patterns exist. Include:
- Import organization patterns
- Naming conventions specific to this project
- File organization rules
- Code style beyond what linters enforce

## ERROR HANDLING

### Existing Files
- If \`${ruleFile}\` exists: Show a summary of what would change, then ask "AGENTS.md exists. Replace? [y/n]"
- If \`docs/agent/*.md\` files exist: Ask for each file "Replace docs/agent/[filename]? [y/n]"
- Preserve any valuable custom content from existing files

### Missing Information
- If insufficient info for a category, DO NOT create that doc file
- ${ruleFile} is always created with minimum: WHY, WHAT, HOW
- Very minimal projects may only need ${ruleFile} without additional docs

## VALIDATION

After generation:
1. Count lines in ${ruleFile} - if over 60, move content to appropriate docs/agent/ files
2. Verify each docs/agent/ file has substantial, specific content (not generic advice)

## OUTPUT

After creating all files, provide a summary:
- "Created ${ruleFile} (XX lines) + N documentation files"
- List each created file with its purpose
- Remind: "Review and refine manually for best results - auto-generated content should be validated"

## WHAT NOT TO INCLUDE

In ${ruleFile}:
- Exhaustive file listings (can be discovered with ls)
- Generic development advice ("write good code")
- Obvious security reminders
- Boilerplate that applies to any codebase

In docs/agent/ files:
- Information that's already obvious from file/directory names
- Generic framework documentation (link to official docs instead)
- Made-up sections without actual source material

---

Now analyze this codebase and create the progressive disclosure documentation structure.
          `,
        },
      ];
    },
  } as PromptCommand;
}
