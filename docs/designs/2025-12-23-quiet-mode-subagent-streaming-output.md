# 静默模式子 Agent 流式日志输出

**Date:** 2025-12-23

## Context

在当前实现中，静默模式（quiet mode）下使用 Task tool 启动子 Agent 时，子 Agent 的执行日志不会流式输出。这导致在 `--output-format stream-json` 场景下，用户无法实时看到子 Agent 的执行过程，只能等到 Agent 完成后才能看到最终结果。

参考 `parentToolUseId_analysis.md` 文档，Claude Code 使用 `parentToolUseId` 字段来建立消息之间的父子关系，用于追踪嵌套工具调用和 Agent 执行的上下文。我们需要在子 Agent 的日志输出中也实现类似的机制。

**核心需求：**
- 在 `--output-format stream-json` 模式下，子 Agent 的消息需要实时流式输出
- 子 Agent 的消息需要携带 `parentToolUseId` 字段，指向触发它的 Task tool
- SDK 场景下也需要支持子 Agent 消息的正常流式输出
- 输出内容应包含完整的消息内容（content）、工具调用详情（tool_use）、元数据（metadata）和错误信息（error）

## Discussion

### 方案探索

在设计阶段，我们探索了三种不同的实现方案：

**方案 A: 中心化消息流转方案**
- 通过扩展 `OutputFormat` 类，新增专门处理子 Agent 消息的方法
- 将 `OutputFormat` 实例传递到 Task tool 和 Agent executor
- 优点：实现简单，与现有流程一致，性能优秀
- 缺点：需要传递实例，增加耦合度

**方案 B: 事件驱动完全解耦方案**
- 完全依赖 `MessageBus` 的事件机制
- 由统一的事件处理器决定是否输出
- 优点：完全解耦，扩展性强
- 缺点：复杂度高，事件流向不够直观

**方案 C: 混合方案**
- CLI 和 SDK 使用不同的实现路径
- 优点：两种场景互不干扰
- 缺点：维护两套逻辑，代码冗余

### 关键设计决策

经过讨论，我们选择了**方案 A**，并通过 **MessageBus 事件机制**来实现解耦：

1. **降低耦合度**: Task tool 不直接依赖 `OutputFormat`，而是通过 `messageBus.emitEvent()` 发送事件
2. **统一事件处理**: 在 `Project` 层监听 `agent.progress` 事件，统一调用 `OutputFormat.onAgentProgress()`
3. **实时流式输出**: 每次 `onProgress` 回调触发时立即输出，不做批量缓冲
4. **完整信息输出**: 包含完整的消息内容、工具调用详情、元数据和错误信息
5. **父子关系建立**: 使用 Task tool 的 `tool_use_id` 作为 `parentToolUseId`
6. **SDK 自动支持**: 通过现有的 MessageBus 机制自动传递到 SDK 端

### 用户偏好确认

- ✅ 日志内容：完整的消息内容 + 工具调用详情 + 元数据 + 错误信息
- ✅ 输出时机：实时流式输出（每条消息立即输出）
- ✅ 父子关系：使用 Task 工具的 ID 作为 `parentToolUseId`
- ✅ SDK 支持：通过 MessageBus 事件传递

## Approach

### 核心方案：中心化消息流转 + MessageBus 事件

采用方案 A（中心化消息流转）的架构思路，但通过 MessageBus 事件机制实现解耦，避免直接传递 `OutputFormat` 实例。

**实现路径：**

1. **扩展 OutputFormat 类** (`src/outputFormat.ts`)
   - 新增 `onAgentProgress()` 方法，专门处理子 Agent 消息
   - 在 quiet 模式下才输出（与现有 `onMessage` 一致）
   - 在 `stream-json` 模式下通过 `console.log` 实时输出 JSON
   - 输出格式包含 `parentToolUseId` 字段和 `type: 'agent_progress'` 标识

2. **修改 Task Tool** (`src/tools/task.ts`)
   - 在 `execute` 方法中获取当前 tool use ID（这是 `parentToolUseId` 的值）
   - 在 `onProgress` 回调中通过 `messageBus.emitEvent('agent.progress', ...)` 发送事件
   - 复用现有的错误处理模式（try-catch + console.error）

3. **在 Project 中监听事件** (`src/project.ts`)
   - 在 `sendWithSystemPromptAndTools` 方法中监听 `agent.progress` 事件
   - 过滤会话 ID，确保只处理当前会话的消息
   - 调用 `outputFormat.onAgentProgress()` 进行格式化输出

4. **SDK 自动支持**
   - 不需要额外修改，通过现有的 MessageBus 连接自动传递
   - SDK 的 `receive()` 方法可以直接接收到 `agent_progress` 类型的消息

### 错误处理策略

采用简化的错误处理策略，只关注核心场景：

- **MessageBus 事件发送失败**: 捕获并记录错误，不阻断 Agent 执行
- **其他场景**: 复用现有的错误处理模式，不做额外设计

### 测试策略

聚焦三个核心测试场景：

1. **CLI stream-json 模式**: 验证实时输出和 `parentToolUseId` 字段
2. **SDK 场景**: 验证消息接收和格式正确性
3. **非 quiet 模式**: 验证不输出子 Agent 日志

## Architecture

### 数据流设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Project.send()                            │
│  1. resolveTools() → createTaskTool({ context })            │
│  2. new OutputFormat({ format, quiet })                      │
│  3. 监听 messageBus.onEvent('agent.progress', ...)          │
│  4. runLoop({ onMessage })                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Task Tool Execute (task.ts)                     │
│  1. 获取当前 tool use ID (parentToolUseId)                  │
│  2. 调用 executeAgent({                                      │
│       onProgress: (message, agentId) => {                    │
│         messageBus.emitEvent('agent.progress', {             │
│           message,                                            │
│           parentToolUseId,  // 关键！                        │
│           agentId,                                            │
│           agentType,                                          │
│           sessionId,                                          │
│           status: 'running',                                  │
│           timestamp: Date.now()                               │
│         })                                                    │
│       }                                                       │
│    })                                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Agent Executor (executor.ts)                       │
│  在 onMessage 回调中，每条消息触发：                         │
│    onProgress(message, agentId)                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│        MessageBus Event: agent.progress                      │
│  事件数据格式：                                               │
│  {                                                            │
│    message: NormalizedMessage,                               │
│    parentToolUseId: string,                                  │
│    agentId: string,                                          │
│    agentType: string,                                        │
│    sessionId: string,                                        │
│    status: 'running' | 'completed' | 'failed',              │
│    timestamp: number                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│      Project 中的事件监听器                                  │
│  messageBus.onEvent('agent.progress', (data) => {           │
│    if (data.sessionId !== this.session.id) return;          │
│    outputFormat.onAgentProgress({                            │
│      message: data.message,                                  │
│      parentToolUseId: data.parentToolUseId,                 │
│      agentId: data.agentId,                                  │
│      agentType: data.agentType                               │
│    });                                                       │
│  });                                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         OutputFormat.onAgentProgress()                       │
│  if (!this.quiet) return;                                    │
│                                                              │
│  const data = {                                              │
│    ...message,                                               │
│    parentToolUseId: parentToolUseId,                     │
│    type: 'agent_progress'                                    │
│  };                                                          │
│                                                              │
│  if (format === 'stream-json') {                            │
│    console.log(JSON.stringify(data));  // 实时输出！         │
│  } else if (format === 'json') {                            │
│    this.dataArr.push(data);                                  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. OutputFormat 类扩展

**新增方法签名：**
```typescript
onAgentProgress(opts: {
  message: NormalizedMessage;
  parentToolUseId: string;
  agentId: string;
  agentType: string;
})
```

**输出消息格式：**
```typescript
{
  ...message,  // 完整的 NormalizedMessage
  parentToolUseId: string,
  type: 'agent_progress'
}
```

#### 2. MessageBus 事件数据结构

```typescript
{
  sessionId: string;
  message: NormalizedMessage;
  parentToolUseId: string;  // Task tool 的 ID
  agentId: string;
  agentType: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: number;
}
```

### 修改文件清单

| 文件 | 修改内容 | 复杂度 |
|------|---------|--------|
| `src/outputFormat.ts` | 新增 `onAgentProgress()` 方法 | ⭐ 简单 |
| `src/tools/task.ts` | 在 `onProgress` 中发送事件，传递 `parentToolUseId` | ⭐ 简单 |
| `src/project.ts` | 监听 `agent.progress` 事件，调用 OutputFormat | ⭐⭐ 中等 |
| `src/message.ts` | (可选) 新增 `agent_progress` 类型定义 | ⭐ 简单 |

**预估总修改行数:** ~100 行

### 预期输出示例

**CLI 输出 (--quiet --output-format stream-json):**
```json
{"type":"system","subtype":"init","sessionId":"xxx",...}
{"role":"assistant","content":[{"type":"text","text":"我将使用 task tool..."},{"type":"tool_use","id":"toolu_123","name":"task",...}],"type":"message",...}
{"role":"user","content":"分析代码...","type":"agent_progress","parentToolUseId":"toolu_123","metadata":{"agentId":"agent_456","agentType":"code-reviewer"},...}
{"role":"assistant","content":"我发现...","type":"agent_progress","parentToolUseId":"toolu_123",...}
{"role":"user","content":"...","type":"message",...}
{"type":"result","subtype":"success",...}
```

### 关键技术决策

1. **Tool Use ID 的获取**: 在 `task.ts` 的 `execute` 方法中，工具执行时会接收到 `toolUseId` 参数，这就是 `parentToolUseId` 的值

2. **事件 vs 直接调用**: 使用 MessageBus 事件而不是直接传递 `OutputFormat` 实例，降低耦合度

3. **输出时机**: 每次 `onProgress` 回调触发时立即输出，不做批量缓冲，确保实时性

4. **会话过滤**: 在事件监听器中提前过滤会话 ID，避免处理其他会话的消息

5. **错误处理**: 复用现有的 try-catch 模式，日志输出失败不阻断 Agent 执行

6. **向后兼容**: 非 quiet 模式下的行为保持不变，子 Agent 仍然在后台静默执行

### 实现注意事项

- MessageBus 可能为 `undefined`（非 quiet 模式），需要检查
- 现有代码已有 `agent.progress` 事件的发送逻辑，需要确保新增的 `parentToolUseId` 字段不破坏现有流程
- SDK 场景下 MessageBus 已连接，无需额外配置即可自动支持
- 输出格式与现有的 `onMessage` 保持一致，便于客户端统一处理
