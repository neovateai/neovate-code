# Development Commands Reference

This document contains detailed development commands for Neovate Code. Refer to this when you need specific command details.

## Core Development Commands

### Development Mode
```bash
bun ./src/cli.ts
```
Run the CLI in development mode for testing and iteration.

### Building

**Full Build** (requires Bun 1.2.7):
```bash
npm run build
```

This runs:
- CLI build: `bun build src/cli.ts --external react-devtools-core --minify --outfile dist/cli.mjs --target=node`
- Index build: `bun build src/index.ts --external react-devtools-core --minify --outfile dist/index.mjs --target=node`
- Type definitions: `npm run build:dts`

### Testing

```bash
npm test                 # or vitest run - Run all tests
npm run test:watch       # or vitest - Watch mode for test development
```

Tests are located in `src/**/*.test.ts` files.
- Test framework: Vitest
- Test timeout: 30 seconds
- Environment: Node

### Type Checking

```bash
npm run typecheck
```

Runs TypeScript type checking across the entire codebase.

### Code Formatting

```bash
npm run format           # Check formatting without changes
npm run format -- --write # Format all files
```

Formatting handled by Biome (see `biome.json` for configuration).

### CI Pipeline

```bash
npm run ci
```

Runs the complete CI pipeline: typecheck, format check, and tests.

## VSCode Extension Commands

The VSCode extension is maintained in the `vscode-extension/` directory.

```bash
npm run extension:build    # Build the VSCode extension
npm run extension:dev      # Development mode for extension
npm run extension:package  # Package the extension for distribution
```

## Release Process

**Important**: Only use these commands when making official releases.

```bash
npm run release        # Patch release (x.x.X) with git tag and GitHub release
npm run release:minor  # Minor release (x.X.0)
npm run release:major  # Major release (X.0.0)
```

- Uses `utools` for release management
- Automatically generates changelog
- Creates git tags and GitHub releases

## Package Management

- **Package Manager**: pnpm 10.13.1
- **Node.js Version**: 22.11.0 (managed via Volta)
- **Minimum Node.js Requirement**: 18+
- **Build Requirement**: Bun 1.2.7

## TypeScript Configuration

The project uses TypeScript with:
- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- JSX: react-jsx
- Verbatim module syntax

See `tsconfig.json` for complete configuration.
