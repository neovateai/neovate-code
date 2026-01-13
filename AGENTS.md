# AGENTS.md

This file provides guidance to CODE AGENT when working with code in this repository.

## Project Overview

### WHY: Purpose and Goals

Neovate Code is an AI-powered coding agent CLI that transforms development workflow through conversational programming. It enables developers to interact with their codebase using natural language, providing intelligent code assistance, refactoring, and automation.

**Core Value**: Bridge the gap between developer intent and code execution through natural language interaction, making complex codebase operations accessible and efficient.

### WHAT: Technical Stack

- **Runtime**: TypeScript/Node.js (requires Node.js 18+, built with Bun 1.2.7)
- **Package Manager**: pnpm
- **UI Framework**: Ink (React for terminal interfaces)
- **AI Integration**: AI SDK with multiple LLM provider support
- **MCP Support**: Model Context Protocol for extensible tool capabilities
- **Testing**: Vitest
- **Code Quality**: Biome (formatting + linting, config in `biome.json`)

### HOW: Core Development Workflow

```bash
bun ./src/cli.ts          # Run CLI in development mode
npm run build             # Build the project
npm test                  # Run tests
npm run typecheck         # Type checking
npm run format -- --write # Format code
npm run ci                # Full CI pipeline (typecheck + format + test)
```

For detailed commands including VSCode extension and release processes, see separate documentation files in the repository

## Architecture

### Core Structure

The codebase follows a modular architecture with clear separation of concerns:

```
src/
├── cli.ts              # Entry point, initializes product with configuration
├── index.ts            # Core app logic: argument parsing, session management, UI rendering
├── context.ts          # Dependency injection and central context management
├── plugin.ts           # Extensible plugin architecture for custom functionality
├── tools/              # Agent tools: bash, edit, read, write, grep, glob, fetch, todo
├── ui/                 # React-based terminal UI components (Ink framework)
├── mcp.ts              # Model Context Protocol integration for external AI services
├── slash-commands/     # Built-in commands accessible via slash notation
├── session.ts          # Session persistence and resumption
├── messageBus.ts       # Event-driven communication between components
└── server/             # HTTP server mode for browser-based UI
```

### Key Concepts

**Tool System**: Tools are resolved dynamically based on context and permissions

- Read-only: `read`, `ls`, `glob`, `grep`, `fetch`
- Write: `write`, `edit`, `bash` (conditionally enabled)
- Todo: `todo read/write` (session-specific storage)

**Plugin Architecture**: Extensible system for adding custom functionality without modifying core code

**Session Management**: Sessions persist and can be resumed, storing conversation history and todos in global config directory

## Essential Coding Patterns

- Use `pathe` instead of `path` for cross-platform compatibility
- Use `zod` for runtime type validation
- Suffix tool classes with 'Tool'
- Prefer async/await for asynchronous operations
- Use subagent to run typecheck

Code style is enforced by Biome (see `biome.json`) - don't manually enforce style rules.

## Important Context

- Session data and todos stored in global config directory
- CLI supports both interactive and quiet (non-interactive) modes
