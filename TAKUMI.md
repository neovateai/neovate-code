# Takumi Development Guidelines

This file guides AI agents working on this codebase.

## Commands

- **Build:** `npm run build`
- **Format:** `npm run format` (Uses Prettier)
- **Lint/Typecheck:** `npm run typecheck`
- **Test:** `npm run test`
- **Test Watch:** `npm run test:watch`
- **Run Single Test:** `npm run test -- <test_file_path>` or `npm run test -- -t "<test_name>"`

## Code Style & General Guidelines

- **Language:** TypeScript. Use strict types.
- **Formatting:** Prettier (`npm run format`). Imports sorted by plugin.
- **Naming:** camelCase for variables/functions, PascalCase for classes/types/interfaces.
- **Error Handling:** Use `try...catch` or `async/await` with `try...catch`.
- **Dependencies:** Check `package.json` before adding.
- **Comments:** Avoid unless explaining complex logic.
- **Logging:** Use `src/utils/logger.ts`.
- **Practices:** Follow existing patterns. Keep functions small. Verify changes with tests.
