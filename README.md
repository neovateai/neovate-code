# Takumi - AI-Powered Development Assistant

[![npm version](https://badgen.net/npm/v/takumi)](https://www.npmjs.com/package/takumi)
[![npm downloads](https://badgen.net/npm/dm/takumi)](https://www.npmjs.com/package/takumi)
[![CI Status](https://github.com/umijs/takumi/actions/workflows/ci.yml/badge.svg)](https://github.com/umijs/takumi/actions/workflows/ci.yml)
[![License](https://badgen.net/npm/license/takumi)](https://www.npmjs.com/package/takumi)

Pronounced `/tɑːˈkuːmi/`, Takumi is an intelligent CLI tool that enhances developer productivity through AI-assisted coding.

## Core Features

### AI Integration
- **Multi-LLM Support**: OpenAI, Google, Groq, DeepSeek and more
- **Model Management**: Aliases and configuration for different LLMs
- **Context Awareness**: Maintains project context for better suggestions

### Code Operations
- **File Management**: Read/write/edit files with AI commands
- **Code Navigation**: Intelligent search and exploration
- **Safe Execution**: Sandboxed command execution

### Workflow Automation
- **Task Planning**: Break down complex tasks into steps
- **Auto Commit**: Generate conventional commit messages
- **File Watching**: React to code changes with AI instructions

### Extensibility
- **Plugin System**: Extend functionality with custom plugins
- **MCP Integration**: Connect with external tools and services
- **Customizable**: Configure through TAKUMI.md guidelines

## Installation

Install with your preferred package manager:

```bash
npm install -g takumi  # npm
pnpm add -g takumi    # pnpm
bun add -g takumi     # bun
yarn global add takumi # yarn
```

## Getting Started

1. **Set API Keys** (required for LLM providers):
```bash
export OPENAI_API_KEY="your-api-key"  # or other provider keys
```

2. **Initialize Project** (creates TAKUMI.md guidelines):
```bash
takumi init -m <model>  # or use alias: ta init
```

3. **Basic Commands**:
- Execute AI commands:
```bash
takumi "<your_request>" -m <model>
```
- Plan and execute tasks:
```bash
takumi "<your_request>" -m <model> --plan
```
- Generate commit messages:
```bash
takumi commit -m <model> --stage --commit
```

For advanced usage, see [commands.md](./docs/commands.md) and [llms.md](./docs/llms.md).

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](./CONTRIBUTING.md) file for guidelines on setting up the development environment, running tests, and submitting pull requests.

## License

[MIT](./LICENSE)
