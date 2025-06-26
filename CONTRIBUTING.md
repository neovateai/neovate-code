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

## Development

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
$ alias t="/path/to/takumi/node_modules/.bin/tsx /path/to/takumi/src/cli.ts"
$ t
```

## Debug

Choose one of the following methods to debug the CLI:

1. Press `⌘+⇧+D` to open the debug view, then select `Debug cli`.
2. Add `DEBUG=takumi*` prefix to the command to print the debug logs.
3. Add `-q` to the command to print the quiet logs.
4. Open session files under `~/.takumi/sessions/` directory to check the logs.

## Release

```bash
$ pnpm release
```
