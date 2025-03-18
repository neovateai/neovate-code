# Takumi

AI pair programming CLI that enhances your development workflow.

## Features

- 🤖 AI-powered pair programming assistance
- 🔍 Support MCP servers
- 📝 More features coming soon...

## Installation

```bash
$ pnpm add takumi -g
```

## Usage

```bash
$ takumi --model=<model> <prompt>
```

More detailed usage instructions coming soon.

### Usage Examples

Basic usage.

```bash
$ takumi --model=Groq/qwen-qwq-32b "create a.txt with some romantic text"
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
        "BRAVE_API_KEY=BSANaFDlxI_3p9e0Q_Vkto1p2OPKxK7",
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
$ takumi --model=DeepSeek/deepseek-chat "fetch https://sorrycc.com/about and generate a svg as a.svg for this"
$ takumi --model=DeepSeek/deepseek-chat "search and tell me how old is zhaobenshan"
```

## Prompt Examples

```
"create a.txt with some romantic text"
"fetch https://sorrycc.com/about and generate a svg as a.svg for this"
"search and tell me how old is zhaobenshan"
```

## License

[MIT](./LICENSE)
