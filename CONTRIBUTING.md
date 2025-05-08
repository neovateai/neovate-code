# CONTRIBUTING

## Prepare

1. Prepare at least one API key of the following services: Groq, Doubao, Google, DeepSeek, OpenRouter. Doubao and OpenRouter is recommended.
2. Copy `.env.example` to `.env` and set the API key.

```zsh
cp .env.example .env
```

## Development

Common commands:

```bash
$ pnpm install
$ pnpm dev
$ pnpm dev "create a.txt with some romantic text" --model=DeepSeek/deepseek-chat
$ pnpm build
```

## Debug

If you want to debug the CLI, press `⌘+⇧+D` to open the debug view, then select `Debug cli`.
