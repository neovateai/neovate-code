# Takumi Development Guidelines

This file provides guidelines for AI agents working on this codebase.

## Commands

- **Build:** `npm run build`
- **Format:** `npm run format` (Uses Prettier)
- **Test:** `npm run test`
- **Test Watch:** `npm run test:watch`
- **Run Single Test:** `npm run test -- <test_file_path>` or `npm run test -- -t "<test_name>"`

## Code Style

- **Language:** TypeScript
- **Formatting:** Use Prettier (`npm run format`). Adhere to existing code style.
- **Imports:** Sorted automatically by `@trivago/prettier-plugin-sort-imports` via Prettier.
- **Types:** Use TypeScript types. Aim for strict typing where possible.
- **Naming:** Use camelCase for variables/functions, PascalCase for classes/types/interfaces.
- **Error Handling:** Use `try...catch` for synchronous errors and `.catch()` or `async/await` with `try...catch` for promises. Prefer specific error types when appropriate.
- **Dependencies:** Check `package.json` before adding new dependencies.
- **Comments:** Avoid adding comments unless explaining complex logic.
- **Logging:** Use the logger utility in `src/utils/logger.ts`.

## General

- Follow existing patterns and conventions in the codebase.
- Keep functions small and focused.
- Verify changes with tests before concluding.
- Don't run typecheck script, it's broken by dependencies!!!
