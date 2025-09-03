# TAKUMI.md

This file provides guidance to TAKUMI when working with code in this repository.

## Development Commands

### Build/Compilation
- `pnpm build` - Full build process (CLI, index, types, browser, post-build)
- `pnpm build:cli` - Build CLI using Bun
- `pnpm build:index` - Build index using Bun
- `pnpm build:type` - Generate TypeScript declarations
- `pnpm build:dts` - Build declaration files with API extractor
- `pnpm build:browser` - Build browser package
- `pnpm build:post` - Run post-build script

### Testing
- `pnpm test` - Run all tests with Vitest
- `pnpm test:watch` - Run tests in watch mode

### Linting/Formatting
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting with Prettier
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm ci` - Run typecheck, format check, and tests (CI command)

### Development
- `pnpm dev` - Run CLI in development mode with tsx
- `pnpm build:browser` + `pnpm --filter @takumi/browser dev` - Run browser dev server

### Package Management
- `pnpm install` - Install dependencies
- `pnpm prepare` - Setup Husky git hooks

### Release
- `pnpm release` - Release new version (patch)
- `pnpm release:minor` - Release new version (minor)
- `pnpm release:major` - Release new version (major)

## Code Architecture & Patterns

### Project Structure
- Monorepo with main package and `@takumi/browser` package
- Main package is a CLI tool with both terminal and browser interfaces
- Core logic in `src/` directory
- Browser UI in `browser/` directory
- Plugin system for extensibility
- MCP (Model Context Protocol) integration for external tools

### Key Architectural Patterns
- Plugin system with lifecycle hooks (config, context, toolUse, query, etc.)
- Slash commands system with built-in commands (review, status, init, etc.)
- MCP integration for external tool support
- Agent-based architecture with different agent types (code, plan, shell, etc.)
- Context management for codebase awareness

### Data Flow
- User input → CLI/Browser → Context processing → Agent processing → Tool execution → Response
- Plugin hooks at various stages to modify behavior
- MCP tools can be integrated and used by agents

### Configuration
- Configuration in `src/config.ts`
- Environment variables for API keys
- Plugin configuration through plugin system

### Key Abstractions
- `Context` - Codebase context and state management
- `Plugin` - Extensibility system with lifecycle hooks
- `MCPManager` - Model Context Protocol integration
- `Agent` - Different agent types for specific tasks
- `SlashCommand` - Command system for special operations

### Plugin System
- Plugins can hook into various lifecycle events
- Hook types: first, series, seriesMerge, seriesLast, parallel
- Plugins can modify config, context, tools, models, and more

### Build Strategy
- TypeScript compilation with Bun for main package
- Vite + TypeScript for browser package
- API Extractor for declaration file generation
- Separate build processes for CLI and browser components

## Technology Stack & Dependencies

### Core Frameworks/Libraries
- TypeScript (primary language)
- Bun (build tool and runtime for main package)
- Vite (build tool for browser package)
- React (UI framework for browser interface)
- Fastify (HTTP server)
- Ink (Terminal UI for CLI)
- AI SDK providers (OpenAI, Anthropic, Google, etc.)

### Development Dependencies
- Vitest (testing framework)
- Prettier (code formatting)
- TypeScript (type checking)
- API Extractor (declaration file generation)
- Husky (git hooks)
- tsx (TypeScript execution)

### Special Tooling
- Ripgrep (fast text search)
- MCP (Model Context Protocol) integration
- Custom plugin system
- Slash command system
- Built-in AI agents for specific tasks

## IMPORTANT

Ignore `browser` directory unless user ask you to include it.

