# Neovate

[![](https://badgen.net/npm/v/@neovate/code)](https://www.npmjs.com/package/@neovate/code)
[![](https://badgen.net/npm/dm/@neovate/code)](https://www.npmjs.com/package/@neovate/code)
[![](https://github.com/neovateai/neovate-code/actions/workflows/ci.yml/badge.svg)](https://github.com/neovateai/neovate-code/actions/workflows/ci.yml)
[![](https://badgen.net/npm/license/@neovate/code)](https://www.npmjs.com/package/@neovate/code)

A coding agent to enhance your development workflow.

## Getting Started

> Make sure you have Node.js version 18 or higher installed.

1. **Install the CLI globally.** Use npm or other package managers.

```bash
$ npm install -g @neovate/code
```

2. **Set up the API keys.** Configure one or more API keys for the LLMs providers.

```bash
$ export OPENAI_API_KEY="sk-..."
$ export GOOGLE_API_KEY="sk-..."
$ export ANTHROPIC_API_KEY="sk-..."
$ export DEEPSEEK_API_KEY="sk-..."
$ export XAI_API_KEY="sk-..."
$ export AIHUBMIX_API_KEY="sk-..."
$ export OPENROUTER_API_KEY="sk-..."
```

You are now ready to use Neovate.

```bash
$ neovate
> explain this codebase to me
```

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](./CONTRIBUTING.md) file for guidelines on setting up the development environment, running tests, and submitting pull requests.

## License

[MIT](./LICENSE)
