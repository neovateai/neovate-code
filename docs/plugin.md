# Plugin

Takumi can be extended and customized through plugins. Plugins allow you to hook into various stages of the CLI lifecycle and LLM interaction process, enabling you to modify behavior, add logging, integrate external services, or alter the context provided to the AI.

## Writing a Plugin

A Takumi plugin is essentially a JavaScript or TypeScript object that conforms to the `Plugin` interface.

```ts
import type { Plugin } from 'takumi';

export const myPlugin: Plugin = {
  // Optional: 'pre' or 'post' to influence execution order
  enforce: 'pre',
  // Optional: A name for identification (e.g., in logs)
  name: 'my-custom-plugin',
  cliStart() {
    console.log('cliStart');
  },
  // ... other hooks
};
```

## Plugin Hooks

> Note: Inside each hook function, `this` refers to the `Context` object.

Plugins interact with Takumi by implementing specific hook functions. Here's a breakdown of the available hooks, when they are called, and their purpose.

### `config`

- **Type:** `() => any | Promise<any> | null`
- **Arguments:** None

Provide additional configuration for the plugin. This hook is called during the configuration phase and allows you to return configuration values that will be merged with the overall configuration.

### `configResolved`

- **Type:** `(opts: { resolvedConfig: any }) => void`
- **Arguments:** `[{ resolvedConfig }]`

Called after the configuration has been resolved. This allows your plugin to react to the final configuration values and perform any setup based on the resolved configuration.

### `cliStart`

- **Type:** `() => void`
- **Arguments:** None

Called when the CLI starts execution. Use this hook to perform initialization tasks, set up logging, or prepare resources that your plugin will need throughout the CLI session.

### `cliEnd`

- **Type:** `(opts: { startTime: number, endTime: number, error?: any }) => void`
- **Arguments:** `[{ startTime, endTime, error }]`

Perform cleanup tasks, log final statistics, or handle errors globally at the very end of the CLI execution. Runs even if errors occurred.

### `contextStart`

- **Type:** `(opts: { prompt: string }) => void`
- **Arguments:** `[{ prompt }]`

Called when context processing begins with the initial prompt. This hook allows you to log or react to the start of context processing.

### `context`

- **Type:** `(opts: { prompt: string }) => void`
- **Arguments:** `[{ prompt }]`

Called during context processing. This hook allows you to modify or react to the context being built for the AI interaction.

### `toolUse`

- **Type:** `(opts: { callId: string; name: string; params: any }) => void`
- **Arguments:** `[{ callId, name, params }]`

Called when a tool is about to be used. This hook allows you to log tool usage, modify parameters, or perform side effects before tools are executed.

### `toolUseResult`

- **Type:** `(opts: { callId: string; name: string; params: any; result: any }) => void`
- **Arguments:** `[{ callId, name, params, result }]`

Called after a tool has been executed and produced a result. This hook allows you to log results, perform post-processing, or trigger additional actions based on tool outcomes.

### `query`

- **Type:** `(opts: { text: string; parsed: any; input: any }) => void`
- **Arguments:** `[{ text, parsed, input }]`

Called when processing user queries. This hook allows you to log queries, modify query processing, or perform analytics on user input.

### `env`

- **Type:** `() => Record<string, string>`
- **Arguments:** None

Provide additional environment variables that should be available during execution. Return an object with key-value pairs representing environment variables.

### `model`

- **Type:** `(opts: { modelName: string; aisdk: any; createOpenAI: any; createDeepSeek: any; createAnthropic: any }) => Promise<any>`
- **Arguments:** `[{ modelName, aisdk, createOpenAI, createDeepSeek, createAnthropic }]`

Customize or provide alternative model configurations. This hook allows you to modify how AI models are initialized and configured.

### `tool`

- **Type:** `(opts: { agentType: AgentType }) => Promise<any>`
- **Arguments:** `[{ agentType }]`

Provide additional tools for the specified agent type (`'code'` or `'plan'`). Return tool definitions that will be available to the AI agent.

### `serverAppData`

- **Type:** `(opts: { context: any; cwd: string }) => Promise<any>`
- **Arguments:** `[{ context, cwd }]`

Provide additional data for the server application. This hook is called in server mode to supply extra application data or context.

### `serverRoutes`

- **Type:** `(opts: { app: any; prefix: string; opts: any }) => void`
- **Arguments:** `[{ app, prefix, opts }]`

Register additional server routes. This hook allows you to add custom API endpoints to the Takumi server.

### `serverRouteCompletions`

- **Type:** `(opts: { message: { role: 'user'; content: string; attachedContexts: any[]; contextContent: string; }; attachedContexts: any[]; }) => void`
- **Arguments:** `[{ message, attachedContexts }]`

Handle completions for server routes. This hook allows you to modify or react to completions for server routes.

### `command`

- **Type:** `() => SlashCommand[] | Promise<SlashCommand[]>`
- **Arguments:** None

Register custom slash commands that users can execute directly from the chat interface. Slash commands provide a way to execute predefined actions by typing commands that start with `/`.

**Returns:** An array of slash command objects. Each command must have:
- `type`: Command type (`'local'`, `'local-jsx'`, or `'prompt'`)
- `name`: Command name (used as `/name`)
- `description`: Help text for the command
- `call` or `getPromptForCommand`: Command implementation

**Example:**
```ts
command() {
  return [
    {
      type: 'local',
      name: 'hello',
      description: 'Say hello with optional name',
      async call(args, context) {
        const name = args.trim() || 'World';
        return `Hello, ${name}!`;
      }
    },
    {
      type: 'prompt',
      name: 'explain',
      description: 'Explain a concept using AI',
      progressMessage: 'Generating explanation...',
      async getPromptForCommand(args) {
        return [
          {
            role: 'user',
            content: `Please explain: ${args}`
          }
        ];
      }
    }
  ];
}
```

## Plugin Execution Order

Plugins can influence their execution order using the `enforce` property:

- `enforce: 'pre'` - Plugin runs before others
- `enforce: 'post'` - Plugin runs after others  
- No `enforce` - Plugin runs in the middle

Within each group, plugins execute in the order they were registered.

## Example Plugin

Here's a complete example of a logging plugin:

```ts
import type { Plugin } from 'takumi';

export const loggingPlugin: Plugin = {
  name: 'logging-plugin',
  enforce: 'pre',
  
  cliStart() {
    console.log('🚀 Takumi CLI started');
  },
  
  cliEnd({ startTime, endTime, error }) {
    const duration = endTime - startTime;
    if (error) {
      console.log(`❌ CLI failed after ${duration}ms:`, error.message);
    } else {
      console.log(`✅ CLI completed successfully in ${duration}ms`);
    }
  },
  
  toolUse({ name, params }) {
    console.log(`🔧 Using tool: ${name}`, params);
  },
  
  toolUseResult({ name, result }) {
    console.log(`📝 Tool ${name} result:`, result);
  }
};
```

## Slash Commands

Slash commands allow users to execute specific actions directly from the chat interface by typing commands that start with `/`. Plugins can register custom slash commands using the `command` hook.

For detailed documentation on creating and using slash commands, see the dedicated [Slash Commands Guide](./slash-commands.md).

### Quick Example

```ts
command() {
  return [
    {
      type: 'local',
      name: 'hello',
      description: 'Say hello',
      async call(args, context) {
        return `Hello, ${args || 'World'}!`;
      }
    }
  ];
}
```

### Built-in Commands

- `/help` - Show all available commands
- `/clear` - Clear chat history
