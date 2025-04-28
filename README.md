# Takumi

[![](https://badgen.net/npm/v/takumi)](https://www.npmjs.com/package/takumi)
[![](https://badgen.net/npm/dm/takumi)](https://www.npmjs.com/package/takumi)
[![](https://github.com/umijs/takumi/actions/workflows/ci.yml/badge.svg)](https://github.com/umijs/takumi/actions/workflows/ci.yml)
[![](https://badgen.net/npm/license/takumi)](https://www.npmjs.com/package/takumi)

AI pair programming CLI to enhance your development workflow.

> Please consider following this project's author, [sorrycc](https://github.com/sorrycc), and consider starring the project to show your ❤️ and support.

## Key Features

- **LLMs Providers** to use various LLMs from providers.
- **File Operations** to read, write, and edit files directly through AI commands.
- **Codebase Navigation & Search** to explore and search your project.
- **Command Execution** to run shell commands safely.
- **Plan Mode** to break down complex tasks into manageable steps, and execute the plan step by step.
- **Automated Commit Messages** to generate concise and conventional commit messages.
- **Project Initialization** to generate a `TAKUMI.md` guidelines file for the AI to follow later.
- **File Watching** to monitor files for specific AI instructions in comments.
- **Model Aliases** to use aliases for models.
- **MCP Support** to integrate external tools and services.
- **Extensible Plugins** to extend the functionality of Takumi.

## Installation

```bash
$ npm install -g takumi
$ takumi -v
takumi@0.0.1
```

## Usage

It's recommended to set API keys for the LLMs providers first. GOOGLE、OPENAI、GROQ、DEEPSEEK、OPENROUTER and others are supported, checkout [llms.md](./docs/llms.md) for more details.

```bash
$ export OPENAI_API_KEY="sk-..."
```

Generate a `TAKUMI.md` file to guide the AI to follow later.

```bash
$ takumi init -m <model>
```

Let the AI to act on the codebase.

```bash
$ takumi "<your_request>" -m <model> -q
```

Let the AI to plan the steps before act to the codebase.

```bash
$ takumi "<your_request>" -m <model> --plan -q
```

After the modification, use `takumi commit` to generate the commit message.

```bash
$ takumi commit -m <model> --stage --commit
```

Checkout [commands.md](./docs/commands.md) for more details.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](./CONTRIBUTING.md) file for guidelines on setting up the development environment, running tests, and submitting pull requests.

## License

[MIT](./LICENSE)
