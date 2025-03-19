# Takumi

AI pair programming CLI that enhances your development workflow.

## Features

- 🤖 AI-powered pair programming assistance
- 🔍 Support MCP servers
- 📝 More features coming soon...

## Usage

```bash
$ npx -y takumi <prompt> --model=<model>
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
