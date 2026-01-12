# Stop and SubagentStop Plugin Hooks

**Date:** 2026-01-12

## Context

The project needs plugin hooks that trigger when the main agent or subagents finish responding, similar to Claude Code's `Stop` and `SubagentStop` hooks. These hooks enable plugins to:
- Observe completion events
- Collect analytics/telemetry
- Perform post-completion actions
- Support prompt-based continuation decisions (future capability)

## Discussion

### Hook Trigger Locations

**`stop` hook:**
- Triggers in `src/project.ts` within `sendWithSystemPromptAndTools()` after `runLoop()` completes
- Should fire before `outputFormat.onEnd()`
- Only fires for main agent, NOT for subagents (controlled via `skipStopHook` option)

**`subagentStop` hook:**
- Triggers in `src/agent/executor.ts` within `executeAgent()` after task completion
- Requires passing `context` to `executeAgent()` (Option A chosen over callback or caller-side invocation)
- Needs `parentSessionId` to link subagent to parent session

### Hook Type

Both hooks use `PluginHookType.Series` - plugins observe the event but cannot modify the result or block completion.

### Payload Design

Both hooks should receive comprehensive information:
- Session/agent identifiers
- Execution result
- Usage statistics (tokens)
- Performance metrics (duration, tool calls)
- Model information

## Approach

Add two new hooks to the plugin system that fire upon agent/subagent completion, passing all relevant execution context to registered plugins.

## Architecture

### 1. Plugin Type Additions (`src/plugin.ts`)

```typescript
stop?: (
  this: PluginContext,
  opts: {
    sessionId: string;
    result: LoopResult;
    usage: Usage;
    turnsCount: number;
    toolCallsCount: number;
    duration: number;
    model: string;
  },
) => Promise<void> | void;

subagentStop?: (
  this: PluginContext,
  opts: {
    parentSessionId: string;
    agentId: string;
    agentType: string;
    result: AgentExecutionResult;
    usage: { inputTokens: number; outputTokens: number };
    totalToolCalls: number;
    totalDuration: number;
    model: string;
  },
) => Promise<void> | void;
```

### 2. Stop Hook Integration (`src/project.ts`)

Location: After `runLoop()` returns, before `outputFormat.onEnd()`

Add `skipStopHook?: boolean` option to `sendWithSystemPromptAndTools()`:

```typescript
async sendWithSystemPromptAndTools(
  message: string | null,
  opts: {
    // ... existing options
    skipStopHook?: boolean;
  } = {},
) {
  // ... after runLoop() and conversation hook

  if (!opts.skipStopHook) {
    await this.context.apply({
      hook: 'stop',
      args: [{
        sessionId: this.session.id,
        result,
        usage: result.success ? result.data.usage : Usage.empty(),
        turnsCount: result.success ? result.metadata.turnsCount : 0,
        toolCallsCount: result.success ? result.metadata.toolCallsCount : 0,
        duration: result.success ? result.metadata.duration : 0,
        model: `${resolvedModel.provider.id}/${resolvedModel.model.id}`,
      }],
      type: PluginHookType.Series,
    });
  }
}
```

### 3. Agent Types Update (`src/agent/types.ts`)

Add `parentSessionId` to `AgentExecuteOptions`:

```typescript
export interface AgentExecuteOptions {
  // ... existing fields
  parentSessionId?: string;
}
```

### 4. SubagentStop Hook Integration (`src/agent/executor.ts`)

Location: After `project.sendWithSystemPromptAndTools()` completes, before returning result

Subagent calls pass `skipStopHook: true` to prevent the stop hook from firing:

```typescript
const result = await project.sendWithSystemPromptAndTools(prompt, {
  // ... existing options
  skipStopHook: true,
  // ...
});

// After execution completes
await context.apply({
  hook: 'subagentStop',
  args: [{
    parentSessionId: options.parentSessionId || '',
    agentId,
    agentType: definition.agentType,
    result: executionResult,
    usage: executionResult.usage,
    totalToolCalls: executionResult.totalToolCalls,
    totalDuration: executionResult.totalDuration,
    model: modelName,
  }],
  type: PluginHookType.Series,
});
```

### 5. Task Tool Update (`src/tools/task.ts`)

Pass `parentSessionId` when calling `agentManager.executeTask()`:

```typescript
const result = await agentManager.executeTask(params, {
  // ... existing options
  parentSessionId: sessionId,
});
```

### 6. Agent Manager Update (`src/agent/agentManager.ts`)

Add `parentSessionId` to context parameter and pass through to `executeAgent()`:

```typescript
async executeTask(
  input: TaskToolInput,
  context: {
    // ... existing fields
    parentSessionId?: string;
  },
): Promise<AgentExecutionResult> {
  // ...
  const executeOptions: AgentExecuteOptions = {
    // ... existing fields
    parentSessionId: context.parentSessionId,
  };
}
```

### Data Flow

```
User Request
    ↓
project.send() / sendWithSystemPromptAndTools()
    ↓
runLoop() executes
    ↓
[If task tool used] → agentManager.executeTask()
                           ↓
                      executeAgent()
                           ↓
                      project.sendWithSystemPromptAndTools(skipStopHook: true)
                           ↓
                      ✅ subagentStop hook fires (stop hook skipped)
    ↓
✅ stop hook fires (main agent only)
    ↓
outputFormat.onEnd()
```
