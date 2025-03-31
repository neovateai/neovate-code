# Takumi

AI pair programming CLI that enhances your development workflow.

## Features

- 🤖 AI-powered pair programming assistance
- 🔍 Support MCP servers
- 📝 Init the codebase and context for the AI to follow later
- 📝 Plan the steps to complete the task
- 📝 More features coming soon...

## Usage

```bash
$ takumi <command> <prompt> --model=<model> --small-model=<smallModel> --codebase --mcp=<mcp>
```

### Parameters

- **`command`**: `init`, `plan`, `act`, default is `act` when no command is provided
- **`prompt`**: the prompt to the AI
- **`model`**: the model to use
- **`small-model`**: the small model to use, small model is used for the Simple task and should be fast, it will fallback to the model if small model is not specified
- **`codebase`**: analyze the codebase (currently using repomix)
- **`mcp`**: specify the MCP servers to use temporarily, you can specify multiple servers by separating them with spaces, and `.takumi/mcp.json` is also supported and recommended

### Commands

#### init

Analyze the codebase and create the `TAKUMI.md` file for the AI to follow later.

```bash
$ takumi init
```

#### plan

Plan with the codebase and context to create a detailed plan in `PLAN.md`.

```bash
$ takumi plan
```

### Tips

1. You can use `npx -y takumi` to run the command without installation the confirmation.

```bash
$ npx -y takumi
```

2. You can specify the Keys of providers in the environment variables.

```bash
$ DEEPSEEK_API_KEY=sk-xxxx takumi
```

### Support Models

Groq

> Need to set `GROQ_API_KEY` in the environment variables.

- Groq/qwen-qwq-32b

DeepSeek

> Need to set `DEEPSEEK_API_KEY` in the environment variables.

- DeepSeek/deepseek-chat
- DeepSeek/deepseek-reasoner (don't support tools)

Google

> Need to set `GOOGLE_API_KEY` in the environment variables.

- Google/gemini-2.0-flash-001
- Google/gemini-2.0-flash-thinking-exp-01-21 (don't support tools)
- Google/gemini-2.0-pro-exp-02-05
- Google/gemini-2.5-pro-exp-03-25
- Google/gemma-3-27b-it (don't support tools)

SiliconFlow

> Need to set `SILICONFLOW_API_KEY` in the environment variables.

- SiliconFlow/DeepSeek-V3
- SiliconFlow/DeepSeek-R1 (don't support tools)

Aliyun

> Need to set `ALIYUN_API_KEY` in the environment variables.

- Aliyun/deepseek-v3 (don't support tools)
- Aliyun/deepseek-r1 (don't support tools)
- Aliyun/qwq-32b (stream only)
- Aliyun/qwq-plus (stream only)

Doubao (TODO)

> Need to set `DOUBAO_API_KEY` in the environment variables.

Grok

> Need to set `GROK_API_KEY` in the environment variables.

- Grok/grok-2-1212 (don't work)

OpenRouter

> Need to set `OPENROUTER_API_KEY` in the environment variables.

- OpenRouter/qwen/qwq-32b (don't support tools)
- OpenRouter/openai/gpt-4o-2024-11-20 (function.description has 2014 string limit)
- OpenRouter/openai/o1-mini (don't support tools)
- OpenRouter/openai/gpt-4-turbo (function.description has 2014 string limit)
- OpenRouter/openai/gpt-3.5-turbo-0613
- OpenRouter/anthropic/claude-3.5-sonnet
- OpenRouter/anthropic/claude-3.7-sonnet
- OpenRouter/anthropic/claude-3.7-sonnet-thought
- OpenRouter/mistralai/mistral-small-3.1-24b-instruct
- OpenRouter/deepseek/deepseek-chat-v3-0324

### Usage Examples

Basic usage.

```bash
$ GROQ_API_KEY=gsk_xxxx npx -y takumi --model=Groq/qwen-qwq-32b "create a.txt with some romantic text"
```

With MCP.

Create `.takumi/mcp.json` file.

```json
{
  "mcpServers": {
    "Fetch": {
      "command": "uvx",
      "args": [
        "mcp-server-fetch"
      ]
    },
    "Brave Search": {
      "command": "env",
      "args": [
        "BRAVE_API_KEY=YOUR_BRAVE_API_KEY",
        "npx",
        "-y",
        "@modelcontextprotocol/server-brave-search"
      ]
    }
  }
}
```

> Obtain `YOUR_BRAVE_API_KEY` from [modelcontextprotocol.io](modelcontextprotocol.io)

And then try the following commands.

```bash
$ DEEPSEEK_API_KEY=sk-xxxx npx -y takumi --model=DeepSeek/deepseek-chat "fetch https://sorrycc.com/about and tell me who is sorrycc"
$ DEEPSEEK_API_KEY=sk-xxxx npx -y takumi --model=DeepSeek/deepseek-chat "search and tell me how old is zhaobenshan"
```

> Error: spawn uvx ENOENT

```base
brew install uv
```

## License

[MIT](./LICENSE)
