# SubAgent 差异模型显示

## 概述

当 SubAgent 使用的模型与主模型不同时，在 AgentProgress 标题中显示差异模型名称。

例如：`Explore (Analyze changes with claude-3-haiku)`

## 动机

用户需要清楚知道 SubAgent 正在使用哪个模型执行任务，尤其是当通过配置覆盖了默认模型时。

## 设计

### 显示条件

- 仅当 SubAgent 使用的模型与主模型 (`store.model.modelId`) 不同时显示
- 模型相同时不显示额外信息，保持简洁

### 显示格式

```
{agentType} ({description} with {modelName})
```

示例：
- `Explore (Analyze repository changes with claude-3-haiku)`
- `Explore (Find API endpoints with gpt-4o-mini)`

### 数据流

```
executor.ts (resolveAgentModel 返回 modelName)
    ↓
agentManager.executeTask() 
    ↓ 在 onMessage 回调中传递 model
task.ts (onMessage callback)
    ↓ agent.progress 事件包含 model 字段
    ↓ returnDisplay 包含 model 字段
store.ts (updateAgentProgress)
    ↓ AgentProgressState.model
AgentProgressOverlay.tsx
    ↓ 对比 store.model.modelId vs progressData.model / returnDisplay.model
    ↓ 不同时显示 "with {modelName}"
```

### 场景覆盖

| 场景 | 数据来源 |
|------|----------|
| 运行中 (Starting/Running) | `agentProgressMap[toolUseId].model` |
| 完成后 (Completed) | `toolResult.returnDisplay.model` |
| Session Resume 后 | `toolResult.returnDisplay.model` (从日志恢复) |

## 实现

### 类型定义

#### `src/agent/types.ts`

```typescript
export interface AgentExecutionResult {
  status: 'completed' | 'failed';
  agentId: string;
  content: string;
  totalToolCalls: number;
  totalDuration: number;
  model: string;  // 新增
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

### Agent 执行层

#### `src/agent/executor.ts`

在 `executeAgent` 返回结果中包含 `modelName`：

```typescript
return {
  status: AgentStatus.Completed,
  agentId,
  content: extractFinalContent(result.data),
  totalToolCalls: result.metadata?.toolCallsCount || 0,
  totalDuration: Date.now() - startTime,
  model: modelName,  // 新增
  usage: { ... },
};
```

在 `onMessage` 回调签名中添加 model 参数：

```typescript
onMessage?: (
  message: NormalizedMessage,
  agentId: string,
  model: string,  // 新增
) => void | Promise<void>;
```

### Task Tool

#### `src/tools/task.ts`

1. `onMessage` 回调传递 model：

```typescript
async onMessage(message: NormalizedMessage, agentId: string, model: string) {
  await messageBus.emitEvent('agent.progress', {
    sessionId,
    cwd,
    agentId,
    agentType: params.subagent_type,
    prompt: params.prompt,
    message,
    parentToolUseId,
    status: 'running',
    model,  // 新增
    timestamp: Date.now(),
  });
}
```

2. `returnDisplay` 添加 model：

```typescript
returnDisplay: {
  type: 'agent_result',
  agentId: result.agentId,
  agentType: params.subagent_type,
  description: params.description,
  prompt: params.prompt,
  content: result.content,
  model: result.model,  // 新增
  stats: { ... },
  status: 'completed',
}
```

### UI Store

#### `src/ui/store.ts`

```typescript
export interface AgentProgressState {
  agentId: string;
  agentType: string;
  prompt: string;
  messages: NormalizedMessage[];
  status: 'running' | 'completed' | 'failed';
  lastUpdate: number;
  model?: string;  // 新增
}

// updateAgentProgress action
updateAgentProgress: (data) => {
  const { parentToolUseId, agentId, agentType, prompt, message, status, model } = data;
  // ...
  set({
    agentProgressMap: {
      ...agentProgressMap,
      [parentToolUseId]: {
        agentId,
        agentType,
        prompt,
        messages: existing ? [...existing.messages, message] : [message],
        status,
        lastUpdate: Date.now(),
        model,  // 新增
      },
    },
  });
}
```

### UI 组件

#### `src/ui/AgentProgress/AgentProgressOverlay.tsx`

```typescript
interface AgentResultDisplay {
  type: 'agent_result';
  agentId: string;
  agentType: string;
  description: string;
  prompt: string;
  content: string;
  model?: string;  // 新增
  stats: { ... };
  status: 'completed' | 'failed';
}

function AgentToolUse({
  toolUse,
  status,
  model,
}: {
  toolUse: ToolUsePart;
  status: 'starting' | 'running' | 'completed' | 'failed';
  model?: string;
}) {
  const { model: mainModel } = useAppStore();
  const agentType = toolUse.input?.subagent_type || toolUse.name;
  const description = toolUse.input?.description;

  const showModel = model && mainModel?.modelId !== model;

  const descText = useMemo(() => {
    if (!description && !showModel) return null;
    const parts: string[] = [];
    if (description) parts.push(description);
    if (showModel) parts.push(`with ${model}`);
    return parts.join(' ');
  }, [description, showModel, model]);

  return (
    <Box marginTop={SPACING.MESSAGE_MARGIN_TOP}>
      <Text bold color={color}>{agentType}</Text>
      {descText && <Text color={descColor}> ({descText})</Text>}
    </Box>
  );
}

export function AgentInProgress({ toolUse, progressData }: AgentInProgressProps) {
  return (
    <>
      <AgentToolUse 
        toolUse={toolUse} 
        status="running" 
        model={progressData.model} 
      />
      {/* ... rest of component */}
    </>
  );
}

export function AgentCompletedResult({ toolUse, toolResult }: AgentResultProps) {
  const returnDisplay = toolResult.result.returnDisplay as AgentResultDisplay | undefined;
  
  return (
    <>
      <AgentToolUse
        toolUse={toolUse}
        status={isError ? 'failed' : 'completed'}
        model={returnDisplay?.model}
      />
      {/* ... rest of component */}
    </>
  );
}
```

## 测试用例

1. **主模型与 SubAgent 模型相同** - 不显示 model 信息
2. **主模型与 SubAgent 模型不同** - 显示 `with {modelName}`
3. **运行中状态** - 从 `agentProgressMap` 获取 model 并显示
4. **完成状态** - 从 `returnDisplay` 获取 model 并显示
5. **Session Resume** - 从持久化的 `returnDisplay` 恢复 model 并正确显示
