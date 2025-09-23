import type { PromptCommand } from '../types';

export function createInitCommand(opts: { productName: string }) {
  const productName = opts.productName;
  const ruleFile = 'AGENTS.md';
  return {
    type: 'prompt',
    name: 'init',
    description: `Create or improve the ${ruleFile} file`,
    progressMessage: `Analyzing codebase to create ${ruleFile}...`,
    async getPromptForCommand() {
      return [
        {
          role: 'user',
          content: `
Please analyze this codebase and create a comprehensive ${ruleFile} file that will guide future instances of ${productName} working in this repository.

## ESSENTIAL CONTENT TO INCLUDE

### 1. Development Commands
Identify and document ALL essential commands for development workflow:
- **Build/compilation commands** (npm run build, cargo build, etc.)
- **Testing commands** (run all tests, single test, watch mode, coverage)
- **Linting/formatting** (eslint, prettier, clippy, etc.)
- **Development server** (dev mode, hot reload commands)
- **Package management** (install, update, audit commands)
- **Database/migration commands** (if applicable)
- **Deployment/release commands** (if present in scripts)

### 2. Code Architecture & Patterns
Document the "big picture" that requires understanding multiple files:
- **Project structure philosophy** (monorepo, modules, layers)
- **Key architectural patterns** (MVC, microservices, plugin system, etc.)
- **Data flow patterns** (state management, event handling, request flow)
- **Configuration management** (how settings/env vars are handled)
- **Key abstractions and interfaces** that other components depend on
- **Plugin/extension system** (if present)
- **Build/bundling strategy** (webpack config, build pipeline)

### 3. Technology Stack & Dependencies
- **Core frameworks/libraries** and their usage patterns
- **Development dependencies** and their purposes
- **Special tooling** or custom build processes

## ANALYSIS GUIDELINES

### If ${ruleFile} Already Exists:
- Compare with existing content and suggest specific improvements
- Identify missing essential information
- Point out outdated or incorrect information
- Preserve valuable existing content

### Source Material to Examine:
- **package.json/Cargo.toml**: Extract npm scripts, dependencies, project metadata
- **README.md**: Include setup instructions, project overview, important notes
- **.cursor/rules/ or .cursorrules**: Merge relevant coding guidelines
- **.github/copilot-instructions.md**: Include important development practices
- **Configuration files**: Build tools, linters, test configs for important patterns
- **Source code**: Look for architectural patterns, not exhaustive file listings

### What NOT to Include:
- Generic development advice ("write good code", "test your changes")
- Obvious security reminders (don't commit secrets, etc.)
- Exhaustive file/directory listings that can be discovered with ls/find
- Made-up sections like "Tips for Development" unless actually found in source
- Boilerplate advice that applies to any codebase

## OUTPUT REQUIREMENTS

### Structure:
- Start with the required header format
- Use clear sections with markdown headers
- Be concise but comprehensive
- Focus on repository-specific information

### Required Header:
\`\`\`
# ${ruleFile}

This file provides guidance to ${productName} when working with code in this repository.
\`\`\`

### Tone:
- Direct and actionable
- Assume the reader is a competent developer
- Focus on what's unique or non-obvious about this codebase
- Use bullet points and clear formatting for scannability

Analyze the codebase thoroughly and create a rule file that will genuinely help future AI agents be productive from day one.
          `,
        },
      ];
    },
  } as PromptCommand;
}
