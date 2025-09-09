# Configuration

Takumi's behavior can be customized through a flexible configuration system. You can set options globally (for all projects) or on a per-project basis.

## Configuration Files

Takumi uses JSON files for configuration:

-   **Global Configuration**: `~/.takumi/config.json`
    -   Applies to all Takumi commands you run on your system.
-   **Project Configuration**: `./.takumi/config.json`
    -   Applies only to the specific project directory.
    -   Project settings override global settings.

You can manage these settings easily using the `takumi config` command.

## Managing Configuration via CLI

The `takumi config` command is the recommended way to manage your settings.

### List Current Settings

To see your current project configuration:

```bash
takumi config list
# or
takumi config ls
```

To see your global configuration:

```bash
takumi config list --global
# or
takumi config ls -g
```

### Get a Specific Setting

```bash
# Get the model for the current project
takumi config get model

# Get the global model setting
takumi config get model -g
```

### Set a Setting

```bash
# Set the model to gpt-4o for the current project
takumi config set model gpt-4o

# Set the model to gpt-4o globally
takumi config set -g model gpt-4o
```

### Add to an Array Setting

For settings that accept multiple values, like `plugins`:

```bash
# Add a custom plugin to the project configuration
takumi config add plugins "my-custom-plugin"
```

### Remove a Setting

```bash
# Remove the model setting from the project config
takumi config remove model
# or
takumi config rm model

# Remove a specific plugin from the global config
takumi config rm -g plugins "my-custom-plugin"
```

## Configuration Options

Here are the available configuration options:

### `model`

Specifies the primary large language model to use for generating code, plans, and other complex tasks.

-   **Type**: `string`
-   **Default**: `"flash"`
-   **Example**: `takumi config set model 4o`

### `smallModel`

Specifies a smaller, faster model for less complex tasks, such as summarizing content from the `fetch` tool. If not set, it defaults to the value of `model`.

-   **Type**: `string`
-   **Default**: The value of `model`.
-   **Example**: `takumi config set smallModel flash`

### `planModel`

Specifies the model to use when running in "plan" mode (`takumi --plan`). If not set, it defaults to the value of `model`.

-   **Type**: `string`
-   **Default**: The value of `model`.
-   **Example**: `takumi config set planModel sonnet-3.7`

#### Available Model Aliases

You can use these convenient aliases for the `model`, `smallModel`, and `planModel` options.

| Alias              | Full Model Name                               | Provider    |
| ------------------ | --------------------------------------------- | ----------- |
| `4o`               | `gpt-4o`                                      | OpenAI      |
| `4`                | `gpt-4`                                       | OpenAI      |
| `41`               | `gpt-4.1`                                     | OpenAI      |
| `flash`            | `gemini-2.5-flash`                            | Google      |
| `flash-lite`       | `gemini-2.5-flash-lite-preview-06-17`         | Google      |
| `gemini`           | `gemini-2.5-pro-preview-05-06`                | Google      |
| `sonnet`           | `claude-sonnet-4-20250514`                    | Anthropic   |
| `sonnet-3.5`       | `claude-3-5-sonnet-20241022`                  | Anthropic   |
| `sonnet-3.7`       | `claude-3-7-sonnet-20250219`                  | Anthropic   |
| `sonnet-3.7-thinking`| `claude-3-7-sonnet-20250219-thinking`         | Anthropic   |
| `deepseek`         | `deepseek-chat`                               | DeepSeek    |
| `r1`               | `deepseek-reasoner`                           | DeepSeek    |
| `grok`             | `grok-3-fast-beta`                            | xAI         |
| `openrouter/*`     | e.g., `openrouter/anthropic/claude-3.5-sonnet`| OpenRouter  |
| `aihubmix/*`       | e.g., `aihubmix/claude-3-5-sonnet-20241022`    | AIHubMix    |

### `language`

The language for the agent's responses and generated commit messages.

-   **Type**: `string`
-   **Default**: `"English"`
-   **Example**: `takumi config set language "Japanese"`

### `quiet`

Enables non-interactive mode. When `true`, Takumi will not render the interactive UI and will output results as JSON. This is useful for scripting. It is automatically enabled when piping input/output.

-   **Type**: `boolean`
-   **Default**: `false`
-   **Example**: `takumi config set quiet true`

### `approvalMode`

Determines how the agent applies changes.

-   **Type**: `string`
-   **Values**:
    -   `suggest`: The agent will suggest changes and wait for user confirmation.
    -   `auto-edit`: (Future implementation) The agent will automatically apply edits but may ask for confirmation on other actions.
    -   `full-auto`: (Future implementation) The agent will perform all actions without user confirmation.
-   **Default**: `"suggest"`
-   **Example**: `takumi config set approvalMode auto-edit`

### `plugins`

A list of plugins to extend Takumi's functionality.

-   **Type**: `string[]`
-   **Default**: `[]`
-   **Example**: `takumi config add plugins "my-takumi-plugin"`

### `mcpServers`

Configuration for Model Context Protocol (MCP) servers, which can provide additional tools to the agent. This setting is best managed via the `takumi mcp` command.

-   **Type**: `Record<string, MCPConfig>`
-   **Default**: `{}`

#### MCP Server Configuration

Each MCP server can be configured with the following options:

-   **`command`**: Command to run for stdio-based MCP servers
-   **`args`**: Arguments to pass to the command
-   **`url`**: URL for HTTP/SSE-based MCP servers
-   **`type`**: Transport type, only needed to specify 'sse' for SSE servers (optional)
-   **`env`**: Environment variables to pass to the command
-   **`disable`**: Whether to disable the server
-   **`timeout`**: Timeout for tool calls in milliseconds

#### Adding MCP Servers

Takumi automatically determines the appropriate transport type based on your configuration:

```bash
# Add a stdio-based MCP server
takumi mcp add my-server npx @example/mcp-server

# Add an HTTP-based MCP server (default for URLs)
takumi mcp add my-http http://localhost:3000

# Add an SSE-based MCP server (specify --sse flag)
takumi mcp add --sse my-sse http://localhost:3000

# Add a server with environment variables
takumi mcp add -e '{"API_KEY":"123"}' my-server npx @example/mcp-server
```

#### Managing MCP Servers

```bash
# List all MCP servers
takumi mcp list

# Get configuration for a specific server
takumi mcp get my-server

# Remove an MCP server
takumi mcp remove my-server

# Disable/enable an MCP server
takumi mcp disable my-server
takumi mcp enable my-server
```

For more details, run `takumi mcp help`.
