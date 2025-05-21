# Plugin

Takumi's functionality can be extended and customized through plugins. Plugins allow you to hook into various stages of the CLI lifecycle and LLM interaction process, enabling you to modify behavior, add logging, integrate external services, or alter the context provided to the AI.

## Writing a Plugin

A Takumi plugin is essentially a JavaScript or TypeScript object that conforms to the `Plugin` interface.

```typescript
import type { Plugin, PluginContext } from 'takumi';

export const myPlugin: Plugin = {
  // Optional: 'pre' or 'post' to influence execution order
  enforce: 'pre',
  // Optional: A name for identification (e.g., in logs)
  name: 'my-custom-plugin',
  // Hook implementations (see below)
  cliStart(this: PluginContext) {
    this.logger.logInfo(`[${this.name}] CLI starting!`);
  },
  // ... other hooks
};
```

## Plugin Hooks

> Note: Inside each hook function, `this` refers to the `PluginContext` object, providing access to configuration, arguments, logger, paths, and session ID.

Plugins interact with Takumi by implementing specific hook functions. Here's a breakdown of the available hooks, when they are called, and their purpose.

### `cliEnd`

-   **Type:** `(opts: { startTime: number, endTime: number, error?: any }) => void`
-   **Arguments:** `[{ startTime, endTime, error }]`

Perform cleanup tasks, log final statistics, or handle errors globally at the very end of the CLI execution. Runs even if errors occurred.

### `cliStart`

-   **Type:** `() => void`
-   **Arguments:** `[]`

Perform initial setup tasks when the CLI starts, right after the intro log.

### `commands`

-   **Type:** `() => Promise<{ name: string, description: string, fn: () => Promise<void> }[]> | { name: string, description: string, fn: () => Promise<void> }[]`
-   **Arguments:** `[]`

Add or modify commands that can be executed by the user.

### `config`

-   **Type:** `() => Promise<Partial<Config> | null> | Partial<Config> | null`
-   **Arguments:** `[]`

Modify the initial configuration object before it's fully resolved. Called early during CLI initialization. Results from multiple plugins are merged.

### `configResolved`

-   **Type:** `(opts: { resolvedConfig: Config }) => void`
-   **Arguments:** `[{ resolvedConfig }]`

Perform actions based on the final, resolved configuration. Called after all `config` hooks have run.

### `context`

-   **Type:** `(opts: { prompt: string }) => Promise<Record<string, any>> | Record<string, any>`
-   **Arguments:** `[{ prompt }]`

Add additional key-value pairs to the context object that will be sent to the LLM. Called after default context is gathered. Results are merged.

### `contextStart`

-   **Type:** `(opts: { prompt: string }) => void`
-   **Arguments:** `[{ prompt }]`

Called before Takumi starts gathering context (like file structure, git status) for an LLM query.

### `editFile`

-   **Type:** `(opts: { filePath: string, oldContent: string, newContent: string, mode?: 'search-replace' | 'whole-file' }) => void`
-   **Arguments:** `[{ filePath, oldContent, newContent, mode }]`

Called when a file is edited. The `mode` parameter indicates the editing mode being used:
- `search-replace`: Traditional mode for targeted changes within a file
- `whole-file`: Complete file replacement mode

### `createFile`

-   **Type:** `(opts: { filePath: string, content: string }) => void`
-   **Arguments:** `[{ filePath, content }]`

Called when a file is created.

### `generalInfo`

-   **Type:** `() => Promise<Record<string, string>> | Record<string, string>`
-   **Arguments:** `[]`

Add or modify key-value pairs displayed in the initial "General Info" log section. Called after configuration is resolved. Results are merged.

### `message`

-   **Type:** `(opts: { messages: CoreMessage[], queryId: string }) => void`
-   **Arguments:** `[{ messages, queryId }]`

Called whenever messages (user, assistant, or tool results formatted as user messages) are added to the conversation history during a query cycle.

### `query`

-   **Type:** `(opts: { prompt: string, text: string, id: string }) => void`
-   **Arguments:** `[{ prompt, text, id }]`

Called after receiving a text response from the LLM within a query cycle, *before* checking if the response contains a tool call.

### `queryEnd`

-   **Type:** `(opts: { prompt: string, systemPrompt: string[], queryContext: Record<string, any>, tools: Record<string, any>, messages: CoreMessage[], startTime: number, endTime: number, id: string, text: string }) => void`
-   **Arguments:** `[{ prompt, systemPrompt, queryContext, tools, messages, startTime, endTime, id, text }]`

Called after the entire query cycle (including any tool calls) is complete and a final text response is ready.

### `queryStart`

-   **Type:** `(opts: { prompt: string, id: string, system: string[] }) => void`
-   **Arguments:** `[{ prompt, id, system }]`

Called just before the main loop for an LLM query begins (which might involve multiple LLM calls if tools are used).

### `toolEnd`

-   **Type:** `(opts: { toolUse: ToolUse, startTime: number, endTime: number, queryId: string }) => void`
-   **Arguments:** `[{ toolUse, startTime, endTime, queryId }]`

Called immediately after a tool finishes execution.

### `toolStart`

-   **Type:** `(opts: { toolUse: ToolUse, queryId: string }) => void`
-   **Arguments:** `[{ toolUse, queryId }]`

Called just before a specific tool is executed during an LLM query cycle.