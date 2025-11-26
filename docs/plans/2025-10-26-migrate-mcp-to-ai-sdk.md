# MCP Integration Migration to AI SDK Implementation Plan

**Goal:** Migrate `src/mcp.ts` from `@openai/agents` MCP classes to AI SDK's `experimental_createMCPClient` while maintaining backward compatibility.

**Architecture:** Replace long-lived MCP server connections with a test-once-cache-tools pattern. Test connectivity during initialization, cache tool definitions, and create ephemeral clients for tool execution.

**Tech Stack:** AI SDK (ai package v5.0.59), TypeScript, Zod schemas

---

## Task 1: Update Type Definitions and Imports

**Files:**
- Modify: `src/mcp.ts:1-33`

**Step 1: Update imports**

Replace the `@openai/agents` imports with AI SDK imports:

```typescript
import { experimental_createMCPClient } from 'ai';
import type { LanguageModelV1FunctionTool } from 'ai';
import createDebug from 'debug';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { ImagePart, TextPart } from './message';
import type { Tool } from './tool';
import { safeStringify } from './utils/safeStringify';
```

**Step 2: Update MCPConfig interface**

Keep the existing MCPConfig interface unchanged (lines 17-29) as it already supports all required fields.

**Step 3: Remove old MCP type and update ServerState**

Remove line 33:
```typescript
export type MCP = MCPServerStdio | MCPServerStreamableHttp | MCPServerSSE;
```

Update ServerState interface (lines 42-49):
```typescript
interface ServerState {
  config: MCPConfig;
  status: MCPServerStatus;
  error?: string;
  tools?: Record<string, LanguageModelV1FunctionTool>;
  retryCount: number;
  isTemporaryError?: boolean;
}
```

**Step 4: Verify changes compile**

Run: `pnpm typecheck`
Expected: No errors related to updated imports/types

**Step 5: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): update imports and types for AI SDK migration"
```

---

## Task 2: Implement Client Factory Method

**Files:**
- Modify: `src/mcp.ts:~330` (add new method before `getAllMcpTools`)

**Step 1: Add _createClient method**

Add this private method after the `retryConnection` method (around line 328):

```typescript
  private async _createClient(config: MCPConfig) {
    if (config.command) {
      // Stdio transport
      const env = config.env ? { ...config.env, PATH: process.env.PATH || '' } : undefined;

      return experimental_createMCPClient({
        transport: {
          type: 'stdio',
          command: config.command,
          args: config.args,
          env,
        },
        timeout: config.timeout,
      });
    } else if (config.url) {
      // HTTP or SSE transport
      const requestInit = config.headers ? { headers: config.headers } : undefined;

      if (config.type === 'sse') {
        return experimental_createMCPClient({
          transport: {
            type: 'sse',
            url: config.url,
          },
          timeout: config.timeout,
          requestInit,
        });
      } else {
        // Default to HTTP
        return experimental_createMCPClient({
          transport: {
            type: 'http',
            url: config.url,
          },
          timeout: config.timeout,
          requestInit,
        });
      }
    } else {
      throw new Error('MCP config must have either command or url configured');
    }
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "feat(mcp): add AI SDK client factory method"
```

---

## Task 3: Implement Connection Test and Tool Fetch Method

**Files:**
- Modify: `src/mcp.ts:~365` (add new method after `_createClient`)

**Step 1: Add _testConnectionAndFetchTools method**

Add this private method after `_createClient`:

```typescript
  private async _testConnectionAndFetchTools(
    config: MCPConfig,
  ): Promise<Record<string, LanguageModelV1FunctionTool>> {
    const client = await this._createClient(config);
    try {
      const tools = await client.tools();
      return tools;
    } catch (error) {
      throw error;
    } finally {
      // Always close client, ignore cleanup errors
      await client.close().catch((err) => {
        debug('Error closing client during connection test:', err);
      });
    }
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "feat(mcp): add connection test and tool fetch method"
```

---

## Task 4: Update MCPManager.create Static Method

**Files:**
- Modify: `src/mcp.ts:58-76`

**Step 1: Update create method to store config in ServerState**

Replace the existing `create` method (lines 58-76):

```typescript
  static create(mcpServers: Record<string, MCPConfig>): MCPManager {
    debug('create MCPManager', mcpServers);
    const manager = new MCPManager();
    manager.configs = mcpServers || {};

    // Initialize servers state without connecting
    for (const [key, config] of Object.entries(mcpServers || {})) {
      if (config.disable) {
        debug(`Skipping disabled MCP server: ${key}`);
        continue;
      }
      manager.servers.set(key, {
        config,
        status: 'pending',
        retryCount: 0,
      });
    }

    return manager;
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): store config in ServerState during creation"
```

---

## Task 5: Refactor _connectServer Method

**Files:**
- Modify: `src/mcp.ts:127-214`

**Step 1: Replace _connectServer implementation**

Replace the entire `_connectServer` method (lines 127-214):

```typescript
  private async _connectServer(key: string, config: MCPConfig): Promise<void> {
    const serverState = this.servers.get(key);
    if (!serverState) return;

    try {
      debug(`Connecting MCP server: ${key}`);
      serverState.status = 'connecting';

      // Test connection and fetch tools
      const tools = await this._testConnectionAndFetchTools(config);

      serverState.status = 'connected';
      serverState.tools = tools;
      serverState.error = undefined;

      debug(
        `MCP server connected successfully: ${key}, tools: ${Object.keys(tools).length}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debug(`Failed to connect MCP server ${key}: ${errorMessage}`);

      // Classify error types for better handling
      const isTemporaryError = this._isTemporaryError(error);

      serverState.status = 'failed';
      serverState.error = errorMessage;
      serverState.retryCount += 1;
      serverState.isTemporaryError = isTemporaryError;
    }
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): update _connectServer to use AI SDK client"
```

---

## Task 6: Update getAllTools and getTools Methods

**Files:**
- Modify: `src/mcp.ts:216-230`

**Step 1: Simplify getAllTools method**

Replace the `getAllTools` method (lines 216-222):

```typescript
  async getAllTools(): Promise<Tool[]> {
    const allTools: Tool[] = [];
    const toolNames = new Set<string>();

    for (const [serverName, serverState] of this.servers.entries()) {
      if (serverState.status !== 'connected' || !serverState.tools) {
        continue;
      }

      for (const [toolName, toolDef] of Object.entries(serverState.tools)) {
        const fullToolName = `mcp__${serverName}__${toolName}`;

        if (toolNames.has(fullToolName)) {
          throw new Error(
            `Duplicate tool name found: ${fullToolName}`,
          );
        }

        toolNames.add(fullToolName);
        allTools.push(this.#convertAiSdkToolToLocal(toolName, toolDef, serverName, serverState.config));
      }
    }

    return allTools;
  }
```

**Step 2: Simplify getTools method**

Replace the `getTools` method (lines 224-230):

```typescript
  async getTools(keys: string[]): Promise<Tool[]> {
    const allTools: Tool[] = [];
    const toolNames = new Set<string>();

    for (const key of keys) {
      const serverState = this.servers.get(key);
      if (!serverState || serverState.status !== 'connected' || !serverState.tools) {
        continue;
      }

      for (const [toolName, toolDef] of Object.entries(serverState.tools)) {
        const fullToolName = `mcp__${key}__${toolName}`;

        if (toolNames.has(fullToolName)) {
          throw new Error(
            `Duplicate tool name found: ${fullToolName}`,
          );
        }

        toolNames.add(fullToolName);
        allTools.push(this.#convertAiSdkToolToLocal(toolName, toolDef, key, serverState.config));
      }
    }

    return allTools;
  }
```

**Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: Errors about missing `#convertAiSdkToolToLocal` method (expected, will fix in next task)

**Step 4: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): update getAllTools and getTools to use cached tools"
```

---

## Task 7: Update destroy Method

**Files:**
- Modify: `src/mcp.ts:232-241`

**Step 1: Simplify destroy method**

Replace the `destroy` method (lines 232-241):

```typescript
  async destroy() {
    // No live connections to close, just clear state
    this.servers.clear();
    this.isInitialized = false;
    this.initPromise = undefined;
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: Errors about missing conversion method (expected)

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): simplify destroy method for AI SDK"
```

---

## Task 8: Update retryConnection Method

**Files:**
- Modify: `src/mcp.ts:289-327`

**Step 1: Update retryConnection to use new pattern**

Replace the `retryConnection` method (lines 289-327):

```typescript
  async retryConnection(serverName: string): Promise<void> {
    const config = this.configs[serverName];
    if (!config) {
      throw new Error(`Server ${serverName} not found in configuration`);
    }

    const serverState = this.servers.get(serverName);
    if (!serverState) {
      throw new Error(`Server ${serverName} state not found`);
    }

    // Log reconnection attempt
    debug(`Attempting to reconnect MCP server: ${serverName}`);

    // Reset state and retry
    serverState.tools = undefined;
    serverState.error = undefined;
    serverState.status = 'connecting';

    await this._connectServer(serverName, config);

    // Verify reconnection result
    const newState = this.servers.get(serverName);
    if (newState?.status !== 'connected') {
      throw new Error(newState?.error || 'Reconnection failed');
    }

    debug(`Successfully reconnected MCP server: ${serverName}`);
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: Errors about missing conversion method (expected)

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): update retryConnection for AI SDK pattern"
```

---

## Task 9: Remove getAllMcpTools and getFunctionToolsFromServer Methods

**Files:**
- Modify: `src/mcp.ts:329-364`

**Step 1: Delete obsolete methods**

Remove the following methods entirely:
- `getAllMcpTools` (lines 329-353)
- `getFunctionToolsFromServer` (lines 355-364)

These methods are no longer needed since we're caching tools directly from AI SDK's `client.tools()`.

**Step 2: Verify removal**

Run: `pnpm typecheck`
Expected: Errors about missing `#convertAiSdkToolToLocal` method (expected, will add in next task)

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): remove obsolete tool conversion methods"
```

---

## Task 10: Implement AI SDK Tool to Local Tool Conversion

**Files:**
- Modify: `src/mcp.ts:416-451` (replace `#convertMcpToolToLocal`)

**Step 1: Replace #convertMcpToolToLocal with #convertAiSdkToolToLocal**

Replace the existing `#convertMcpToolToLocal` method (lines 416-451):

```typescript
  #convertAiSdkToolToLocal(
    toolName: string,
    toolDef: LanguageModelV1FunctionTool,
    serverName: string,
    config: MCPConfig,
  ): Tool {
    return {
      name: `mcp__${serverName}__${toolName}`,
      description: toolDef.description,
      getDescription: ({ params }) => {
        return formatParamsDescription(params);
      },
      parameters: toolDef.parameters,
      execute: async (params) => {
        const client = await this._createClient(config);
        try {
          const result = await client.callTool(toolName, params || {});

          const returnDisplay = `Tool ${toolName} executed successfully${params ? `, parameters: ${JSON.stringify(params)}` : ''}`;
          const llmContent = convertMcpResultToLlmContent(result);

          return {
            llmContent,
            returnDisplay,
          };
        } catch (error) {
          return {
            isError: true,
            llmContent: error instanceof Error ? error.message : String(error),
          };
        } finally {
          await client.close().catch((err) => {
            debug(`Error closing client after tool execution: ${err}`);
          });
        }
      },
      approval: {
        category: 'network',
      },
    };
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "feat(mcp): implement AI SDK tool to local tool conversion"
```

---

## Task 11: Update getAllServerStatus Return Type

**Files:**
- Modify: `src/mcp.ts:259-279`

**Step 1: Update getAllServerStatus to use cached tools**

Replace the method (lines 259-279):

```typescript
  async getAllServerStatus(): Promise<
    Record<
      string,
      { status: MCPServerStatus; error?: string; toolCount: number }
    >
  > {
    await this.initAsync();

    const result: Record<
      string,
      { status: MCPServerStatus; error?: string; toolCount: number }
    > = {};
    for (const [name, state] of this.servers.entries()) {
      result[name] = {
        status: state.status,
        error: state.error,
        toolCount: state.tools ? Object.keys(state.tools).length : 0,
      };
    }
    return result;
  }
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): update getAllServerStatus for cached tools"
```

---

## Task 12: Remove UnknownContext Type

**Files:**
- Modify: `src/mcp.ts:454`

**Step 1: Delete obsolete type**

Remove line 454:
```typescript
type UnknownContext = unknown;
```

This type was only used by `@openai/agents` FunctionTool and is no longer needed.

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): remove obsolete UnknownContext type"
```

---

## Task 13: Final Verification and Build

**Files:**
- All modified: `src/mcp.ts`

**Step 1: Run full type check**

Run: `pnpm typecheck`
Expected: No errors across the entire project

**Step 2: Run build**

Run: `pnpm build`
Expected: Successful build with no errors

**Step 3: Review the changes**

Run: `git diff master src/mcp.ts`
Expected: Review shows:
- Removed `@openai/agents` imports
- Added `ai` SDK imports
- Updated ServerState to cache tools and config
- Replaced long-lived connections with ephemeral clients
- All public APIs unchanged

**Step 4: Final commit**

```bash
git add src/mcp.ts
git commit -m "refactor(mcp): complete migration to AI SDK

- Replace @openai/agents MCP classes with experimental_createMCPClient
- Maintain backward-compatible public API
- Cache tool definitions after connection test
- Use ephemeral clients for tool execution
- Preserve retry logic and error classification"
```

---

## Post-Migration Checklist

**Manual verification steps:**

1. **Test stdio transport**: Verify local MCP server connection works
2. **Test HTTP transport**: Verify remote HTTP MCP server connection works
3. **Test SSE transport**: Verify SSE MCP server connection works (if available)
4. **Test tool execution**: Execute a tool and verify it works correctly
5. **Test error handling**: Trigger connection failure and verify error classification
6. **Test retry logic**: Use `retryConnection()` method on failed server
7. **Test concurrent execution**: Execute multiple tools simultaneously
8. **Test status monitoring**: Call `getAllServerStatus()` and verify output

**Optional dependency cleanup:**

If `@openai/agents` is only used for MCP (verify with grep), consider removing:

```bash
# Verify no other usage
rg "@openai/agents" --type ts

# If safe to remove:
pnpm remove @openai/agents @openai/agents-core @openai/agents-extensions
```

Note: Based on the grep results from brainstorming, other files use `@openai/agents` for Agent, Runner, etc., so **do not remove** the dependency unless migrating the entire project.

---

## Notes

**Key differences from @openai/agents:**

1. **Client lifecycle**: AI SDK clients are ephemeral (create → use → close), not long-lived
2. **Tool format**: AI SDK returns `Record<string, LanguageModelV1FunctionTool>` vs AgentTool arrays
3. **Transport config**: AI SDK uses transport object with type field vs separate class constructors
4. **No session management**: AI SDK lightweight client doesn't support full MCP features

**Preserved features:**

- Retry logic and error classification
- Async initialization with proper locking
- Connection status tracking
- Tool name deduplication
- All public API methods and return types

**Trade-offs:**

- ✅ Smaller dependency footprint (if agents removed later)
- ✅ Better alignment with AI SDK ecosystem
- ⚠️ More client creation/destruction (mitigated by caching tools)
- ⚠️ Tool execution slightly slower due to client lifecycle (likely negligible)
