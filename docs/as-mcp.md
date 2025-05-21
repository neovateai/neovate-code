# Takumi as MCP

> WIP, not ready for use.

This document provides information on how to use Takumi as a Model Control Protocol (MCP) server. This allows you to integrate Takumi with other tools and services that support the MCP protocol.

## General Usage

```bash
$ npx -y takumi <root>
```

### Usage with Cursor

Add the following to your `<root>/.cursor/mcp.json`:

#### NPX

```json
{
  "mcpServers": {
    "takumi": {
      "command": "npx",
      "args": ["-y", "takumi", "<root>"]
    }
  }
}
```

This exposes the following tools:

### Tools

- `takumi-help`: Display help information for the Takumi CLI.
- `takumi-version`: Display the current version of Takumi CLI.
- `takumi-ask`: Ask questions about your codebase without modifying files.
- `takumi-commit`: Generate conventional commit messages from staged changes.
- `takumi-init`: Analyze your project and create a TAKUMI.md file with project conventions.
- `takumi-test`: Run tests with automatic AI-powered fixing of failures.
- `takumi-lint`: Run linter with automatic AI-powered fixing of errors.
- `takumi-run`: Execute shell commands using natural language.
