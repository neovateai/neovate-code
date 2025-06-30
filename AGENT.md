# Takumi Development Rules

This file guides AI agents working on this codebase.

## Commands

- **Build:** `npm run build`
- **Format:** `npm run format` (Uses Prettier)
- **Lint/Typecheck:** `npm run typecheck`
- **Test:** `npm run test`

## Code Style & General Guidelines

- **Language:** TypeScript.
- **Formatting:** Prettier (`npm run format`). Imports sorted by plugin.
- **Naming:** camelCase for variables/functions, PascalCase for classes/types/interfaces.
- **Error Handling:** Use `try...catch` or `async/await` with `try...catch`.
- **Dependencies:** Check `package.json` before adding.
- **Comments:** Avoid unless explaining complex logic.
- **Logging:** Use `src/utils/logger.ts`.
- **Practices:** Follow existing patterns. Keep functions small. Verify changes with tests.
