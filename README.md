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

And then try the following commands.

```bash
$ DEEPSEEK_API_KEY=sk-xxxx npx -y takumi --model=DeepSeek/deepseek-chat "fetch https://sorrycc.com/about and tell me who is sorrycc"
$ DEEPSEEK_API_KEY=sk-xxxx npx -y takumi --model=DeepSeek/deepseek-chat "search and tell me how old is zhaobenshan"
```

## License

[MIT](./LICENSE)
