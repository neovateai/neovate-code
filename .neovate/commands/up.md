Update the dependencies to the latest version.

1. Run `pnpm up --latest` to update the dependencies
2. Fallback and lock the version in `package.json`
  - "@openrouter/ai-sdk-provider": "^0.7.2",
  - "zod": "^3.25.76"
3. Run `pnpm i` to install the dependencies
4. Run `pnpm typecheck` to check the type
5. Run `pnpm build` to build the project
