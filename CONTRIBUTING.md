# CONTRIBUTING

## Prepare

Setup the API keys for the LLMs providers, use the env variables in your bashrc/zshrc/fishrc files or use `/login` the select a provider and enter the API Key.

If you are using VSCode or Cursor, install [Biome extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) to format the code.

## Development

It's recommended to use [Volta](https://volta.sh/) to manage the node and pnpm version. And you need to set the `VOLTA_FEATURE_PNPM` environment variable to enable pnpm support.

```bash
export VOLTA_FEATURE_PNPM=1
```

Install and build the CLI.

```bash
$ pnpm install
$ pnpm build
```

Run the CLI.

```bash
$ pnpm dev
```

Tips: Add `t` alias to the `src/cli.ts` file to make it easier to run the CLI.

```bash
$ alias t="bun /path/to/neovate/src/cli.ts"
$ t
```

Note: After installation, you can use either `neovate` or the shorter alias `neo` to run the CLI.

Before you commit, you need to run the `ready` script to check if the code is ready to be committed.

```bash
$ pnpm ready
# Or include e2e tests
$ pnpm ready --e2e
```

## How to run e2e tests

The e2e tests validate the CLI functionality end-to-end using real model interactions.

Before running the e2e tests, you need to configure the model. Set the `E2E_MODEL` environment variable in your `.env` file and ensure you have the appropriate API keys configured for your chosen model.

```bash
# .env
E2E_MODEL=provider_id/model_id
```

Then you can run the e2e tests.

```bash
$ pnpm test:e2e
# Run tests for a specific fixture
$ pnpm test:e2e --only normal
# Run tests for a specific test
$ pnpm test:e2e --only normal/basic
```

## Debug

Choose one of the following methods to debug the CLI:

1. Press `⌘+⇧+D` to open the debug view, then select `Debug cli`.
2. Add `DEBUG=neovate*` prefix to the command to print the debug logs.
3. Add `-q` to the command to print the quiet logs.
4. Open session files under `~/.neovate/projects/` directory to check the logs.

## Release

```bash
$ pnpm release
$ pnpm release:minor
$ pnpm release:major
```
