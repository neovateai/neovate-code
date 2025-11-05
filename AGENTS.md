# AGENTS.md

This file provides guidance to CODE AGENT when working with code in this repository.

## Project Overview

Takumi is a coding agent CLI to enhance development workflow. It's a TypeScript-based tool that provides AI-powered coding assistance through a command-line interface with support for multiple LLM providers and Model Context Protocol (MCP) servers.

## Development Commandst

### Core Commands

- **Development**: `bun ./src/cli.ts` - Run the CLI in development mode
- **Build**: `npm run build` - Full build (requires Bun 1.2.7)
  - CLI build: `bun build src/cli.ts --external react-devtools-core --minify --outfile dist/cli.mjs --target=node`
  - Index build: `bun build src/index.ts --external react-devtools-core --minify --outfile dist/index.mjs --target=node`
  - Type definitions: `npm run build:dts`
- **Testing**:
  - `npm test` or `vitest run` - Run all tests
  - `npm run test:watch` or `vitest` - Watch mode for test development
  - Tests are located in `src/**/*.test.ts` files
- **Type Checking**: `npm run typecheck` - Run TypeScript type checking
- **Formatting**:
  - `npm run format` - Check formatting without changes
  - `npm run format -- --write` - Format all files
- **CI Pipeline**: `npm run ci` - Runs typecheck, format, and tests

### VSCode Extension

- `npm run extension:build` - Build the VSCode extension
- `npm run extension:dev` - Development mode for extension
- `npm run extension:package` - Package the extension

## Architecture

### Core Structure

The codebase follows a modular architecture with clear separation of concerns:

1. **CLI Entry Point** (`src/cli.ts`): Main entry point that initializes the product with configuration
2. **Main App** (`src/index.ts`): Core application logic, handles argument parsing, session management, and UI rendering
3. **Context System** (`src/context.ts`): Central context management for dependency injection across the application
4. **Plugin System** (`src/plugin.ts`): Extensible plugin architecture for adding custom functionality
5. **UI Layer** (`src/ui/`): React-based terminal UI components using Ink framework

### Key Components

- **Tools** (`src/tools/`): Implementation of various tools (bash, edit, read, write, grep, glob, fetch, todo) that the agent can use
- **MCP Support** (`src/mcp.ts`): Model Context Protocol integration for connecting to external AI services
- **Slash Commands** (`src/slash-commands/`): Built-in commands accessible via slash notation
- **Session Management** (`src/session.ts`): Handles session persistence and resumption
- **Message Bus** (`src/messageBus.ts`): Event-driven communication between components
- **Server Mode** (`src/server/`): HTTP server mode for browser-based UI

### Tool System

Tools are resolved dynamically based on context and permissions:

- Read-only tools: read, ls, glob, grep, fetch
- Write tools: write, edit, bash (conditionally enabled)
- Todo tools: todo read/write (session-specific storage)

### Configuration

- Uses environment variables for API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
- Supports multiple LLM providers through AI SDK
- MCP servers can be configured with stdio, SSE, or HTTP transports
- Global config stored in platform-specific directories

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- JSX: react-jsx
- Verbatim module syntax

### Formatting (Biome)

- Print width: 80 characters
- Single quotes for strings
- Trailing commas: all
- Import organization enabled
- Linting and formatting in one tool
- Configuration in `biome.json`

### Best Practices

- Use `pathe` instead of `path` for Windows compatibility
- Files must end with a newline
- PascalCase for types/interfaces/classes
- camelCase for variables/functions
- Use `type` over `interface` where possible
- Suffix tool classes with 'Tool'
- Use zod for runtime type validation
- Prefer throwing errors over returning null/undefined
- Use async/await for promises

## Package Management

- Uses pnpm as package manager (10.13.1)
- Node.js version: 22.11.0 (managed via Volta)
- Minimum Node.js requirement: 18+

## Testing

- Test framework: Vitest
- Test timeout: 30 seconds
- Tests use Node environment
- Test files pattern: `src/**/*.test.ts`

## Release Process

- `npm run release` - Patch release with git tag and GitHub release
- `npm run release:minor` - Minor version release
- `npm run release:major` - Major version release
- Uses utools for release management
- Automatic changelog generation

## Important Notes

- The project requires Bun 1.2.7 specifically for building
- MCP servers provide extensible tool capabilities
- Session data and todos are stored in the global config directory
- The CLI supports both interactive and quiet (non-interactive) modes
- VSCode extension is maintained in `vscode-extension/` directory

## IMPORTANT

Ignore `browser` directory unless user ask you to include it.
