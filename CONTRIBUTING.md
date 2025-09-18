# CONTRIBUTING

## Prepare

Setup the API keys for the LLMs providers.

```bash
$ export OPENAI_API_KEY="sk-..."
$ export GOOGLE_API_KEY="sk-..."
$ export ANTHROPIC_API_KEY="sk-..."
$ export DEEPSEEK_API_KEY="sk-..."
$ export XAI_API_KEY="sk-..."
$ export AIHUBMIX_API_KEY="sk-..."
$ export OPENROUTER_API_KEY="sk-..."
```

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

Before you commit, you need to run the `ready` script to check if the code is ready to be committed.

```bash
$ pnpm ready
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
