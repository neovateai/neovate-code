# Sub-Agent 执行进度实时展示

**日期:** 2025-12-10

## 背景

当前 `src/tools/task.ts` 工具只在所有 sub-agent 执行完毕后才展示最终结果，用户体验不佳。用户希望参考 Claude Code 的实现方式，在 sub-agent 执行过程中实时展示：

1. **Task** 的描述（例如："Search for nodeBridge logic"）
2. **每个工具调用**的详细信息（例如：Search 工具的参数和结果摘要）
3. **可展开的详细信息**（类似 "ctrl+o to expand" 和 "+13 more tool uses"）

核心诉求是给用户提供当前的执行过程反馈，而不是等待黑盒执行完成。

## 讨论过程

### Phase 1: 理解需求与架构调研

**关键问题:**
- 如何实时推送 sub-agent 的执行进度？
- 是否复用现有的消息机制还是创建新的事件通道？

**探索的方案:**
- **方案 A（定期轮询）**: 定期查询 sub-agent 状态 → 被否决（复杂度高）
- **方案 B（流式回调）**: 利用现有 `onMessage`/`onToolUse` 回调 → 初步选定
- **方案 C（独立事件通道）**: 新增 `onUIProgress` 回调 → 考虑中

### Phase 2: 上下文隔离的挑战

**关键发现:**
最初设计试图通过 `parentUuid` 分支机制来隔离 sub-agent 消息，但这会导致：
- Sub-agent 的消息混入主 agent 的 history
- LLM 上下文被污染，消耗大量 tokens
- 逻辑混乱，难以区分主线和分支

**正确的隔离机制（参考现有实现）:**
- 每个 sub-agent 拥有独立的会话文件：`agent-{agentId}.jsonl`
- AgentID 通过 8 位十六进制随机生成（类似 `a1b2c3d4`）
- 完全独立的上下文，不与主 agent 混合
- 通过 metadata 建立关联关系

### Phase 3: 数据查询逻辑的位置

**问题:** UI 层直接查询 sub-agent 消息是否合理？

**探讨:**
- ❌ UI 层查询：违反分层原则
- ⚠️ session.ts 工具函数：可行但可能过度设计
- ✅ **NodeBridge RPC 接口**：统一数据访问，支持远程场景

**最终决定:**
- 数据查询逻辑放在 `nodeBridge.ts`
- 通过 RPC 接口 `agent.getMessages` 按需加载
- UI 层只负责渲染，保持简洁

## 最终方案

### 关键决策记录（ADR）

在设计过程中，我们对多个技术方案进行了讨论和选择。以下是关键决策及其理由：

#### 决策 1: 上下文隔离方式

**问题**: Sub-agent 的消息如何与主 agent 隔离？

**候选方案**:
- ❌ **方案 A**: 通过 `parentUuid` 分支机制 - 消息混入主 session，污染 LLM 上下文
- ✅ **方案 B**: 独立 session 文件（`agent-{agentId}.jsonl`） - 完全隔离，上下文清晰

**最终选择**: 方案 B

**理由**:
- 避免 LLM 上下文污染，节省 tokens
- 每个 agent 有独立的日志文件，便于调试
- 符合"一个任务一个会话"的设计理念
- 可扩展到递归 sub-agent

---

#### 决策 2: 实时进度通信方式

**问题**: 如何将 SubAgent 的实时进度传递到 UI 层？

**候选方案**:
- ❌ **方案 A**: 定期轮询 agent session 文件 - 延迟高，I/O 开销大
- ❌ **方案 B**: UI 直接读取 agent log - 违反分层原则，难以支持远程
- ✅ **方案 C**: onProgress 回调 + MessageBus 事件 - 事件驱动，支持跨端

**最终选择**: 方案 C

**理由**:
- 延迟极低（本地模式 < 10ms）
- 复用现有的 MessageBus 架构，无需新增传输层
- 支持本地和 Server 模式
- 符合事件驱动的设计模式

---

#### 决策 3: onProgress 回调注入位置

**问题**: 在哪里为 SubAgent 注入 onProgress 回调？

**候选方案**:
- ❌ **方案 A**: 在 loop.ts 的 toolRunner 处，为所有工具注入 - 影响面大，过度设计
- ✅ **方案 B**: 在 agentManager.executeTask 处，只为 Task tool 提供 - 影响面小，易扩展
- ❌ **方案 C**: 在 task.ts 的 execute 函数内部 - 耦合度高，难以测试

**最终选择**: 方案 B

**理由**:
- 影响范围小，只修改 Task tool 相关代码
- 符合单一职责原则
- 未来可扩展到其他工具（如 bash tool 的实时输出）
- 易于测试和维护

---

#### 决策 4: 实时进度数据存储位置

**问题**: SubAgent 的实时进度数据存储在哪里？

**候选方案**:
- ✅ **方案 A**: 存储在 appStore（内存） - 实时性好，不持久化
- ❌ **方案 B**: 持久化到 session.jsonl - 可回溯，但增加文件大小和 LLM 成本
- ❌ **方案 C**: 混合方式（内存 + 最终结果持久化） - 复杂度高

**最终选择**: 方案 A

**理由**:
- 实时数据不需要持久化（重启后可从 log 恢复）
- 避免频繁 I/O，性能更好
- appStore 按 toolUseID 索引，查询高效
- 简化实现，降低复杂度

---

#### 决策 5: 跨端通信方案

**问题**: 如何支持本地模式和 Server 模式？

**候选方案**:
- ❌ **方案 A**: 分别实现两套逻辑 - 维护成本高
- ❌ **方案 B**: 只通过 RPC 请求加载数据 - 延迟高，无法实时更新
- ✅ **方案 C**: 复用 MessageBus 的 transport 抽象 - 透明支持，统一 API

**最终选择**: 方案 C

**理由**:
- MessageBus 已经支持 DirectTransport 和 WebSocketTransport
- 无需修改核心逻辑，只需添加事件类型
- 统一的 `emitEvent` / `onEvent` API
- 自动处理序列化和传输细节

---

#### 决策 6: UI 渲染触发方式

**问题**: UI 如何感知进度更新并重新渲染？

**候选方案**:
- ❌ **方案 A**: 手动触发 React 的 forceUpdate - 反模式，难以维护
- ✅ **方案 B**: 通过 Zustand 的 setState 自动触发 - 符合 React 最佳实践
- ❌ **方案 C**: 使用 EventEmitter 监听 - 引入额外复杂度

**最终选择**: 方案 B

**理由**:
- Zustand 的 setState 自动触发 React 重新渲染
- 符合现有代码的状态管理模式
- 简洁明了，易于理解
- 支持细粒度订阅（只订阅 agentProgressMap 变化）

---

### 核心设计原则

1. **独立会话隔离**: 每个 sub-agent 创建独立的 `agent-{agentId}.jsonl` 文件
2. **上下文完全隔离**: Sub-agent 消息不进入主 agent 的 LLM 上下文
3. **关联通过 metadata**: 主 agent 的 tool result 记录 `agentId` 建立关联
4. **按需加载**: UI 展开时才通过 RPC 加载 agent messages

### 数据流

```
用户调用 Task Tool
    ↓
[1] task.ts execute()
    - 调用 agentManager.executeTask()
    ↓
[2] executeAgent()
    - 生成 agentId (8位十六进制)
    - 创建独立的 JsonlLogger → agent-{agentId}.jsonl
    - 执行 runLoop()
    - Sub-agent 的所有消息写入独立文件
    ↓
[3] 返回结果
    - AgentExecutionResult 包含 agentId
    - ToolResult.metadata = { agentId, agentType }
    ↓
[4] 主 agent 保存 tool_result
    - ToolResultPart 提升 agentId 字段
    - 写入主 session log
    ↓
[5] UI 渲染
    - 识别 Task tool
    - 点击展开时调用 RPC: agent.getMessages(agentId)
    - 加载并缓存 sub-agent messages
    - 嵌套渲染工具调用
```

### 消息存储结构

**主 Agent Session (`session-abc123.jsonl`)**
```json
{ "role": "user", "content": "帮我审查代码", "uuid": "msg-1", "parentUuid": null }
{ "role": "assistant", "content": [{ "type": "tool_use", "id": "task-1", "name": "Task" }], "uuid": "msg-2", "parentUuid": "msg-1" }
{ "role": "tool", "content": [{ 
    "type": "tool-result", 
    "toolCallId": "task-1",
    "result": { "llmContent": "审查完成...", "metadata": { "agentId": "a1b2c3d4" } },
    "agentId": "a1b2c3d4",
    "agentType": "code-reviewer"
  }], "uuid": "msg-3", "parentUuid": "msg-2" }
{ "role": "assistant", "content": "已完成代码审查", "uuid": "msg-4", "parentUuid": "msg-3" }
```

**Sub-Agent Session (`agent-a1b2c3d4.jsonl`)** - 独立文件
```json
{ "role": "user", "content": "审查以下代码...", "uuid": "agent-msg-1", "parentUuid": null, "metadata": { "agentId": "a1b2c3d4" } }
{ "role": "assistant", "content": [{ "type": "tool_use", "id": "read-1", "name": "read" }], "uuid": "agent-msg-2", "parentUuid": "agent-msg-1", "metadata": { "agentId": "a1b2c3d4" } }
{ "role": "tool", "content": [{ "type": "tool-result", "toolCallId": "read-1", "result": {...} }], "uuid": "agent-msg-3", "parentUuid": "agent-msg-2", "metadata": { "agentId": "a1b2c3d4" } }
{ "role": "assistant", "content": [{ "type": "tool_use", "id": "grep-1", "name": "grep" }], "uuid": "agent-msg-4", "parentUuid": "agent-msg-3", "metadata": { "agentId": "a1b2c3d4" } }
{ "role": "tool", "content": [{ "type": "tool-result", "toolCallId": "grep-1", "result": {...} }], "uuid": "agent-msg-5", "parentUuid": "agent-msg-4", "metadata": { "agentId": "a1b2c3d4" } }
{ "role": "assistant", "content": "发现以下问题...", "uuid": "agent-msg-6", "parentUuid": "agent-msg-5", "metadata": { "agentId": "a1b2c3d4" } }
```

### UI 交互流程

#### 执行中状态

**折叠状态（默认）:**
```
╭─ Agent: code-reviewer (审查代码质量) ─────────────╮
│                                                   │
│  +5 more tool uses                               │
│  Assistant: ↳ write REVIEW.md                    │
│  Tool: ✓ Tool results                            │
│                                                   │
│  In progress... · 8 tool uses · 1.2k tokens      │
╰─────────────────────────────── (ctrl+o to expand)╯
```

**展开状态（ctrl+o）:**
```
╭─ Agent: code-reviewer (审查代码质量) ─────────────╮
│                                                   │
│  User: 审查以下代码...                            │
│  Assistant: ↳ read src/api.ts                    │
│  Tool: ✓ Tool results                            │
│  Assistant: ↳ grep "function"                    │
│  Tool: ✓ Tool results                            │
│  Assistant: ↳ analyze_complexity                 │
│  Tool: ✓ Tool results                            │
│  Assistant: ↳ write REVIEW.md                    │
│  Tool: ✓ Tool results                            │
│                                                   │
│  In progress... · 8 tool uses · 1.2k tokens      │
╰────────────────────────────── (ctrl+o to collapse)╯
```

#### 完成状态

**折叠状态（默认）:**
```
✓ code-reviewer (审查代码质量) (8 tool uses · 1.2k tokens · 3.5s) ▶ Show details
```

**展开状态:**
```
╭─ Done: code-reviewer (审查代码质量) ────────────────╮
│ (8 tool uses · 1.2k tokens · 3.5s)                 │
│                                                     │
│  User: 审查以下代码...                              │
│  Assistant: ↳ read src/api.ts                      │
│  Tool: ✓ Tool results                              │
│  Assistant: ↳ grep "function"                      │
│  Tool: ✓ Tool results                              │
│  ...                                                │
│                                                     │
│  Response:                                          │
│  发现以下问题：                                     │
│  1. 缺少错误处理                                    │
│  2. 函数复杂度过高                                  │
│  建议重构...                                        │
│                                                     │
╰───────────────────────────────────── ▼ Hide details╯
```

#### 并行执行状态

```
Parallel Agents:
├─ Done code-reviewer (审查代码)
├─ Running test-runner (执行测试)
└─ Done documenter (生成文档)
```

**触发流程:**
1. Sub-agent 开始执行 → 创建 `agent-{agentId}.jsonl`
2. 每次工具调用 → 写入独立文件 + 通过 `onSubAgentMessage` 实时通知
3. UI 收到通知 → 更新 `agentMessagesCache` → 重新渲染
4. 用户切换展开/折叠 → 按需加载完整消息历史（如果未缓存）
5. Sub-agent 完成 → 切换到完成状态渲染

## 架构设计

### 1. 核心类型扩展

**src/tool.ts**
```typescript
export type ToolResult = {
  llmContent: string;
  isError: boolean;
  uiContent?: string;
  metadata?: {
    agentId?: string;
    agentType?: string;
    [key: string]: any;
  };
};
```

**src/message.ts**
```typescript
export type ToolResultPart = {
  type: 'tool_result';
  id: string;
  name: string;
  input: Record<string, any>;
  result: ToolResult;
  agentId?: string;      // 提升自 result.metadata
  agentType?: string;
};

export type ToolResultPart2 = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  result: ToolResult;
  agentId?: string;
  agentType?: string;
};
```

### 2. Paths 扩展

**src/paths.ts**
```typescript
export class Paths {
  /**
   * 获取 sub-agent 的独立 log 路径
   * 格式: ~/.neovate/sessions/agent-{agentId}.jsonl
   */
  getAgentLogPath(agentId: string): string {
    return path.join(this.sessionDir, `agent-${agentId}.jsonl`);
  }
  
  /**
   * 获取所有 agent sessions
   */
  getAllAgentSessions(): Array<{ agentId: string; path: string; mtime: number }> {
    // 实现逻辑...
  }
}
```

### 3. Agent Executor 改造

**src/agent/executor.ts**
```typescript
export async function executeAgent(
  options: AgentExecuteOptions,
): Promise<AgentExecutionResult> {
  // 1. 生成 agentId (8位十六进制)
  const agentId = randomUUID().slice(0, 8);
  
  // 2. 创建独立的 session log
  const agentLogPath = context.paths.getAgentLogPath(agentId);
  const agentLogger = new JsonlLogger({ filePath: agentLogPath });
  
  // 3. 执行 runLoop，消息写入独立文件
  const loopResult = await runLoop({
    // ...
    onMessage: async (message) => {
      const normalizedMessage = {
        ...message,
        metadata: {
          ...message.metadata,
          agentId,
          agentType: definition.agentType,
        },
      };
      
      // 写入独立的 agent log
      agentLogger.addMessage({ message: normalizedMessage });
      
      // 可选：实时通知父 agent (用于 UI 实时展示)
      await options.onSubAgentMessage?.(normalizedMessage);
    },
  });
  
  // 4. 返回 agentId
  return {
    status: 'completed',
    agentId,
    content: extractFinalContent(loopResult.data),
    // ...
  };
}
```

### 4. Task Tool 改造

**src/tools/task.ts**
```typescript
execute: async (params) => {
  const result = await agentManager.executeTask(params, { /* ... */ });
  
  if (result.status === 'completed') {
    return {
      llmContent: `Sub-agent completed...`,
      isError: false,
      metadata: {
        agentId: result.agentId,      // 关键：记录 agentId
        agentType: params.subagent_type,
      },
    };
  }
}
```

### 5. Loop 消息保存改造

**src/loop.ts**
```typescript
// 保存 tool result 时，提升 metadata.agentId
await history.addMessage({
  role: 'tool',
  content: toolResults.map((tr) => {
    const resultPart: any = {
      type: 'tool-result',
      toolCallId: tr.toolCallId,
      toolName: tr.toolName,
      input: tr.input,
      result: tr.result,
    };
    
    // 提升 agentId 到 tool-result 层级
    if (tr.result.metadata?.agentId) {
      resultPart.agentId = tr.result.metadata.agentId;
      resultPart.agentType = tr.result.metadata.agentType;
    }
    
    return resultPart;
  }),
});
```

### 6. NodeBridge RPC 接口

**src/nodeBridge.ts**
```typescript
// 获取 agent session 的消息历史
this.messageBus.registerHandler(
  'agent.getMessages',
  async (data: { cwd: string; agentId: string }) => {
    const { cwd, agentId } = data;
    const context = await this.getContext(cwd);
    const agentLogPath = context.paths.getAgentLogPath(agentId);
    
    if (!fs.existsSync(agentLogPath)) {
      return { success: false, error: 'Agent session not found' };
    }
    
    const messages = loadSessionMessages({ logPath: agentLogPath });
    return { success: true, data: { messages, agentId } };
  }
);
```

### 7. UI Store 扩展

**src/ui/store.ts**
```typescript
interface AppState {
  // 缓存已加载的 agent messages（按 agentId 索引）
  agentMessagesCache: Record<string, NormalizedMessage[]>;
}

interface AppActions {
  loadAgentMessages: (agentId: string) => Promise<void>;
}

// 实现
loadAgentMessages: async (agentId: string) => {
  const { bridge, cwd, agentMessagesCache } = get();
  
  if (agentMessagesCache[agentId]) return; // 已缓存
  
  const response = await bridge.request('agent.getMessages', { cwd, agentId });
  
  if (response.success) {
    set({
      agentMessagesCache: {
        ...agentMessagesCache,
        [agentId]: response.data.messages,
      },
    });
  }
}
```

### 8. 实时进度机制

#### 8.1 核心问题

当前设计已经实现了 SubAgent 消息的**独立存储**（`agent-{agentId}.jsonl`），但缺少**实时推送**机制。用户希望在 SubAgent 执行过程中看到实时进度，而不是等执行完毕后再加载。

**关键挑战:**
1. **消息隔离**: SubAgent 的消息写入独立文件，父 Agent 无法直接访问
2. **跨端通信**: 需要支持本地模式和 Server 模式
3. **UI 实时更新**: 如何将 SubAgent 的消息实时传递到 UI 层

#### 8.2 设计方案：onProgress 回调 + MessageBus 事件

我们采用**事件驱动模型**，通过以下机制实现实时进度展示：

```
SubAgent 产生消息
    ↓
executeAgent 捕获消息
    ↓
调用 onProgress 回调
    ↓
MessageBus 发送 agent_progress 事件
    ↓
UI 层接收事件并更新 appStore
    ↓
React 组件重新渲染进度条
```

#### 8.3 详细实现流程

##### Step 1: Task Tool 传递 onProgress 回调

**src/tools/task.ts**
```typescript
export function createTaskTool(opts: {
  context: Context;
  tools: Tool[];
  signal?: AbortSignal;
  onProgress?: (data: AgentProgressData) => void;  // 新增参数
}) {
  const { signal, onProgress } = opts;
  const { cwd, agentManager } = opts.context;

  return createTool({
    name: TOOL_NAMES.TASK,
    // ...
    execute: async (params, executionContext) => {
      const startTime = Date.now();

      if (!agentManager) {
        return { llmContent: 'Agent manager not found', isError: true };
      }

      try {
        const result = await agentManager.executeTask(params, {
          cwd,
          signal,
          tools: opts.tools,
          // 关键：传递 onProgress 回调
          onProgress: (message: NormalizedMessage, agentId: string) => {
            // 构造进度数据包
            const progressData: AgentProgressData = {
              toolUseID: executionContext.toolUseID,  // 关联到哪个 tool use
              agentId,
              message,
              timestamp: Date.now(),
            };
            
            // 调用回调（由 loop.ts 注入）
            onProgress?.(progressData);
          },
        });

        // ...
      } catch (error) {
        // ...
      }
    },
  });
}
```

**关键点:**
- `executionContext.toolUseID` 是当前工具调用的唯一标识（如 `"task-1"`）
- `onProgress` 回调由**上层调用方**（loop.ts）注入
- 进度数据包含 `toolUseID` 用于 UI 层索引

##### Step 2: AgentManager 接受并传递回调

**src/agent/index.ts**
```typescript
export class AgentManager {
  async executeTask(
    input: TaskToolInput,
    context: {
      tools: Tool[];
      cwd: string;
      signal?: AbortSignal;
      forkContextMessages?: NormalizedMessage[];
      onProgress?: (message: NormalizedMessage, agentId: string) => void;  // 新增
    },
  ): Promise<AgentExecutionResult> {
    const definition = this.agents.get(input.subagent_type);
    if (!definition) {
      throw new Error(`Agent type '${input.subagent_type}' not found`);
    }

    const executeOptions: AgentExecuteOptions = {
      definition,
      prompt: input.prompt,
      tools: context.tools,
      context: this.context,
      model: input.model,
      forkContextMessages: definition.forkContext
        ? context.forkContextMessages
        : undefined,
      cwd: context.cwd,
      signal: context.signal,
      onProgress: context.onProgress,  // 传递给 executeAgent
    };

    return executeAgent(executeOptions);
  }
}
```

##### Step 3: ExecuteAgent 捕获消息并调用回调

**src/agent/executor.ts**
```typescript
export async function executeAgent(
  options: AgentExecuteOptions,
): Promise<AgentExecutionResult> {
  const { definition, prompt, context, onProgress } = options;
  
  // 1. 生成 agentId (8位十六进制)
  const agentId = randomUUID().slice(0, 8);
  
  // 2. 创建独立的 session log
  const agentLogPath = context.paths.getAgentLogPath(agentId);
  const agentLogger = new JsonlLogger({ filePath: agentLogPath });
  
  // 3. 执行 runLoop，捕获每条消息
  const loopResult = await runLoop({
    // ...
    onMessage: async (message) => {
      const normalizedMessage = {
        ...message,
        metadata: {
          ...message.metadata,
          agentId,
          agentType: definition.agentType,
        },
      };
      
      // 写入独立的 agent log
      agentLogger.addMessage({ message: normalizedMessage });
      
      // 关键：实时通知父级
      if (onProgress) {
        await onProgress(normalizedMessage, agentId);
      }
    },
  });
  
  // 4. 返回 agentId
  return {
    status: 'completed',
    agentId,
    content: extractFinalContent(loopResult.data),
    // ...
  };
}
```

**关键点:**
- `onMessage` 在 SubAgent 每产生一条消息时触发
- 先写入独立 log 文件（持久化）
- 再调用 `onProgress`（实时通知）
- `onProgress` 是**异步**的，支持跨端通信

##### Step 4: Loop.ts 注入 onProgress 并通过 MessageBus 发送事件

**src/loop.ts (伪代码，核心逻辑)**
```typescript
export async function runLoop(options: RunLoopOptions) {
  // ...
  
  // 工具执行逻辑
  for (const toolUse of toolUses) {
    const tool = tools.get(toolUse.name);
    
    // 为 Task tool 注入 onProgress 回调
    const onProgress = toolUse.name === TOOL_NAMES.TASK
      ? (progressData: AgentProgressData) => {
          // 通过 MessageBus 发送进度事件
          await context.messageBus.emitEvent('agent_progress', {
            sessionId: options.sessionId,
            cwd: options.cwd,
            progressData,
          });
        }
      : undefined;
    
    // 执行工具（传入 onProgress）
    const result = await tool.execute(toolUse.input, {
      context,
      signal,
      toolUseID: toolUse.id,
      onProgress,  // 注入回调
    });
    
    // ...
  }
}
```

**关键点:**
- `onProgress` 只在执行 **Task tool** 时注入
- 通过 `MessageBus.emitEvent` 发送跨端事件
- 事件类型为 `agent_progress`

##### Step 5: NodeBridge 监听并转发事件（跨端支持）

**src/nodeBridge.ts (已有机制，新增事件类型)**
```typescript
// NodeBridge 已经有完整的事件转发机制
// 只需确保 'agent_progress' 事件能够被正确转发

// 在 session.send handler 中，loop 触发的事件会自动通过 messageBus.emitEvent 发送到 UI 层
// 无需修改 nodeBridge.ts，因为 MessageBus 会自动处理所有 emitEvent 调用
```

**说明:**
- NodeBridge 已经实现了完整的 MessageBus 事件转发机制
- 所有通过 `messageBus.emitEvent` 发送的事件都会被转发到 UI 层
- UI 层通过 `bridge.onEvent` 监听事件

##### Step 6: UI 层接收事件并更新 Store

**src/ui/store.ts**
```typescript
interface AppState {
  // 现有字段...
  
  // 新增：按 toolUseID 索引的进度数据
  agentProgressMap: Record<string, {
    agentId: string;
    messages: NormalizedMessage[];
    lastUpdate: number;
  }>;
}

interface AppActions {
  // 现有方法...
  
  // 新增：更新 agent 进度
  updateAgentProgress: (data: {
    toolUseID: string;
    agentId: string;
    message: NormalizedMessage;
  }) => void;
  
  // 新增：清理已完成的 agent 进度（可选）
  clearAgentProgress: (toolUseID: string) => void;
}

// 在 initialize 方法中添加事件监听
initialize: async (opts) => {
  // ...现有逻辑...
  
  // 监听 SubAgent 进度事件
  bridge.onEvent('agent_progress', (data) => {
    const { progressData } = data;
    get().updateAgentProgress({
      toolUseID: progressData.toolUseID,
      agentId: progressData.agentId,
      message: progressData.message,
    });
  });
},

// 实现更新逻辑
updateAgentProgress: (data) => {
  const { toolUseID, agentId, message } = data;
  const { agentProgressMap } = get();
  
  const existing = agentProgressMap[toolUseID];
  
  set({
    agentProgressMap: {
      ...agentProgressMap,
      [toolUseID]: {
        agentId,
        messages: existing 
          ? [...existing.messages, message]
          : [message],
        lastUpdate: Date.now(),
      },
    },
  });
},

clearAgentProgress: (toolUseID) => {
  const { agentProgressMap } = get();
  const newMap = { ...agentProgressMap };
  delete newMap[toolUseID];
  set({ agentProgressMap: newMap });
},
```

**关键点:**
- 进度数据按 `toolUseID` 索引（如 `"task-1"`）
- 每次收到新消息时追加到数组
- `lastUpdate` 用于触发 React 重新渲染

##### Step 7: UI 组件消费进度数据

**src/ui/Messages.tsx**
```typescript
function SubAgentProgress({ 
  toolUse, 
  isVerbose 
}: {
  toolUse: ToolUsePart;
  isVerbose: boolean;
}) {
  const { agentProgressMap } = useAppStore();
  
  // 从 store 中获取实时进度
  const progressData = agentProgressMap[toolUse.id];
  
  if (!progressData) {
    return <Text color="gray">Starting agent...</Text>;
  }
  
  const { messages } = progressData;
  const [expanded, setExpanded] = React.useState(isVerbose);
  
  // 统计信息
  const stats = React.useMemo(() => {
    const toolCalls = messages.filter(
      msg => msg.role === 'assistant' && 
             Array.isArray(msg.content) &&
             msg.content.some(p => p.type === 'tool_use')
    ).length;
    
    const tokens = messages.reduce((sum, msg) => {
      if (msg.role === 'assistant' && 'usage' in msg) {
        const usage = (msg as AssistantMessage).usage;
        return sum + usage.input_tokens + usage.output_tokens;
      }
      return sum;
    }, 0);
    
    return { toolCalls, tokens };
  }, [messages]);
  
  // 智能截断：只显示最后 N 条
  const VISIBLE_LIMIT = 3;
  const visibleMessages = expanded 
    ? messages 
    : messages.slice(-VISIBLE_LIMIT);
  const hiddenCount = messages.length - visibleMessages.length;
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan">
      {/* 标题栏 */}
      <Box>
        <Text color="cyan" bold>╭─ Agent: {toolUse.description}</Text>
      </Box>
      
      {/* 消息列表 */}
      <Box flexDirection="column" paddingLeft={1}>
        {!expanded && hiddenCount > 0 && (
          <Text color="gray" dimColor>
            +{hiddenCount} more tool uses
          </Text>
        )}
        
        {visibleMessages.map((msg, idx) => (
          <NestedAgentMessage key={idx} message={msg} />
        ))}
      </Box>
      
      {/* 状态栏 */}
      <Box>
        <Text color="yellow">
          │  In progress... · {stats.toolCalls} tool uses · {stats.tokens} tokens
        </Text>
      </Box>
      
      <Box>
        <Text color="cyan">╰─────────────────────────────</Text>
        <Text color="gray" dimColor> (ctrl+o to {expanded ? 'collapse' : 'expand'})</Text>
      </Box>
    </Box>
  );
}
```

**关键点:**
- 通过 `toolUse.id` 获取对应的进度数据
- `useMemo` 缓存统计计算，优化性能
- 每当 `messages` 变化时，React 自动重新渲染

#### 8.4 数据流总结

##### 完整序列图

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Layer (Ink)
    participant Store as AppStore (Zustand)
    participant Bridge as UIBridge
    participant Bus as MessageBus
    participant Node as NodeBridge
    participant Loop as Loop.ts
    participant Task as Task Tool
    participant Agent as AgentManager
    participant Exec as ExecuteAgent
    participant SubLoop as SubAgent runLoop
    participant Log as JsonlLogger
    
    User->>UI: 发送消息 "Review code"
    UI->>Bridge: bridge.request('session.send')
    Bridge->>Bus: request via MessageBus
    Bus->>Node: forward to NodeBridge
    Node->>Loop: runLoop(options)
    
    Note over Loop: 识别 Task tool_use
    Loop->>Task: tool.execute(params, { toolUseID, onProgress })
    Task->>Agent: agentManager.executeTask({ onProgress })
    Agent->>Exec: executeAgent({ onProgress })
    
    Note over Exec: 生成 agentId = "a1b2c3d4"
    Note over Exec: 创建 agent-a1b2c3d4.jsonl
    
    Exec->>SubLoop: runLoop({ onMessage })
    
    loop SubAgent 每产生一条消息
        SubLoop->>Exec: onMessage(message)
        Exec->>Log: agentLogger.addMessage(message)
        Note over Log: 写入 agent-a1b2c3d4.jsonl
        
        Exec->>Agent: onProgress(message, agentId)
        Agent->>Task: onProgress(message, agentId)
        Task->>Loop: onProgress({ toolUseID, agentId, message })
        
        Loop->>Bus: emitEvent('agent_progress', data)
        Bus->>Bridge: forward event
        Bridge->>Store: onEvent('agent_progress')
        Store->>Store: updateAgentProgress({ toolUseID, message })
        
        Store-->>UI: state changed (agentProgressMap)
        UI-->>User: 实时更新进度条 🔄
    end
    
    SubLoop-->>Exec: 返回执行结果
    Exec-->>Agent: AgentExecutionResult { agentId }
    Agent-->>Task: 返回结果
    Task-->>Loop: ToolResult { metadata: { agentId } }
    Loop->>Log: 保存 tool_result (含 agentId)
    Loop-->>Node: 完成
    
    Node->>Bus: emitEvent('message', toolResult)
    Bus->>Bridge: forward
    Bridge->>Store: onEvent('message')
    Store->>Store: addMessage(toolResult)
    Store-->>UI: state changed (messages)
    UI-->>User: 显示 "✓ code-reviewer completed" ✅
```

##### 文字描述

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据流图                                   │
└─────────────────────────────────────────────────────────────────┘

[1] SubAgent 产生消息
    executeAgent → onMessage 回调
    ↓ (写入独立 log)
    agentLogger.addMessage(message)
    ↓ (实时通知)
    onProgress(message, agentId)

[2] 回调链传递
    executeAgent.onProgress
    → agentManager.onProgress
    → task.ts.onProgress
    → loop.ts 注入的回调

[3] MessageBus 事件发送
    loop.ts:
    messageBus.emitEvent('agent_progress', {
      sessionId,
      cwd,
      progressData: {
        toolUseID: "task-1",
        agentId: "a1b2c3d4",
        message: { role: 'assistant', ... },
        timestamp: 1234567890
      }
    })

[4] 跨端传输（自动）
    MessageBus → Transport → WebSocket/Direct → UI

[5] UI 层接收
    bridge.onEvent('agent_progress', (data) => {
      updateAgentProgress(data.progressData)
    })

[6] Store 更新
    agentProgressMap["task-1"] = {
      agentId: "a1b2c3d4",
      messages: [msg1, msg2, msg3, ...],
      lastUpdate: 1234567890
    }

[7] React 重新渲染
    useAppStore() → agentProgressMap 变化 → 组件更新
```

#### 8.5 跨端支持

**本地模式（DirectTransport）:**
- MessageBus 通过 `DirectTransport` 直接传递事件
- 延迟极低（setImmediate）
- 适合开发和调试

**Server 模式（WebSocketTransport）:**
- MessageBus 通过 WebSocket 传递事件
- 支持远程场景
- 事件自动序列化/反序列化

**关键优势:**
- 无需修改 MessageBus 核心逻辑
- 透明支持本地和远程模式
- 统一的 API (`emitEvent` / `onEvent`)

#### 8.6 类型定义

**src/agent/types.ts**
```typescript
export type AgentProgressData = {
  toolUseID: string;           // 关联的 tool use ID（如 "task-1"）
  agentId: string;             // SubAgent 的 ID（如 "a1b2c3d4"）
  message: NormalizedMessage;  // SubAgent 产生的消息
  timestamp: number;           // 时间戳
};

export type AgentExecuteOptions = {
  // ...现有字段...
  onProgress?: (message: NormalizedMessage, agentId: string) => void | Promise<void>;
};
```

**src/ui/store.ts**
```typescript
type AgentProgressState = {
  agentId: string;
  messages: NormalizedMessage[];
  lastUpdate: number;
};

interface AppState {
  agentProgressMap: Record<string, AgentProgressState>;
}
```

#### 8.7 性能优化

**1. 智能截断**
```typescript
const VISIBLE_LIMIT = 3; // 默认只显示最后 3 条
const visibleMessages = expanded ? messages : messages.slice(-VISIBLE_LIMIT);
```

**2. useMemo 缓存计算**
```typescript
const stats = React.useMemo(() => calculateStats(messages), [messages]);
```

**3. 按需清理**
```typescript
// SubAgent 完成后，可选择性清理进度数据
if (toolResult && !isVerbose) {
  get().clearAgentProgress(toolUse.id);
}
```

**4. 事件节流（可选）**
```typescript
// 如果消息产生速度过快，可以在 loop.ts 中添加节流
const throttledProgress = throttle(onProgress, 100); // 每 100ms 最多发送一次
```

#### 8.8 错误处理

**1. 回调执行失败**
```typescript
try {
  await onProgress(message, agentId);
} catch (error) {
  // 记录错误但不中断 SubAgent 执行
  console.error('Failed to send progress:', error);
}
```

**2. MessageBus 断开连接**
```typescript
if (!messageBus.isConnected()) {
  // 降级：只写入 log，不发送实时进度
  agentLogger.addMessage({ message });
  return;
}
```

**3. UI 层接收失败**
```typescript
bridge.onEvent('agent_progress', (data) => {
  try {
    get().updateAgentProgress(data.progressData);
  } catch (error) {
    console.error('Failed to update progress:', error);
  }
});
```

### 9. UI 渲染设计

#### 核心渲染机制

SubAgent 的消息作为父 Agent 界面中的**特殊工具调用（Tool Use）**来处理，而不是像普通文本消息那样直接追加。它嵌套在调用该 SubAgent 的工具块中，形成层级关系。

**关键设计原则:**
1. **嵌套渲染**: SubAgent 作为 Task tool 的子块渲染
2. **折叠/展开**: 默认折叠，避免刷屏，支持 `ctrl+o` 切换
3. **智能截断**: 非 verbose 模式下只显示最后 N 条记录
4. **实时更新**: 执行过程中动态更新统计信息

#### 视觉层级结构

```
╭─ Agent: code-reviewer (审查代码质量) ─────────────╮
│                                                   │
│  User: 审查以下代码...                            │
│  Assistant: ↳ read src/api.ts                    │
│  Tool: ✓ Tool results                            │
│  Assistant: ↳ grep "function"                    │
│  Tool: ✓ Tool results                            │
│  ...                                              │
│  +5 more tool uses                               │ ← 折叠的消息
│  Assistant: ↳ write REVIEW.md                    │
│  Tool: ✓ Tool results                            │
│                                                   │
│  In progress... · 8 tool uses · 1.2k tokens      │ ← 实时状态栏
╰───────────────────────────────────────────────────╯
```

#### 渲染状态机

SubAgent 有三种渲染状态，对应不同的 UI 组件：

**1. 进行中 (In Progress) - `renderToolUseProgressMessage`**

当 SubAgent 正在执行时：

```typescript
// 实时进度渲染组件
function SubAgentProgress({ 
  toolUse, 
  agentMessages,
  isVerbose 
}: {
  toolUse: ToolUsePart;
  agentMessages: NormalizedMessage[];
  isVerbose: boolean;
}) {
  const [expanded, setExpanded] = React.useState(isVerbose);
  
  // 统计信息
  const stats = React.useMemo(() => {
    const toolCalls = agentMessages.filter(
      msg => msg.role === 'assistant' && 
             Array.isArray(msg.content) &&
             msg.content.some(p => p.type === 'tool_use')
    ).length;
    
    const tokens = agentMessages.reduce((sum, msg) => {
      if (msg.role === 'assistant' && 'usage' in msg) {
        const usage = (msg as AssistantMessage).usage;
        return sum + usage.input_tokens + usage.output_tokens;
      }
      return sum;
    }, 0);
    
    return { toolCalls, tokens };
  }, [agentMessages]);
  
  // 智能截断：只显示最后 N 条
  const VISIBLE_LIMIT = 3;
  const visibleMessages = expanded 
    ? agentMessages 
    : agentMessages.slice(-VISIBLE_LIMIT);
  const hiddenCount = agentMessages.length - visibleMessages.length;
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan">
      {/* 标题栏 */}
      <Box>
        <Text color="cyan" bold>╭─ Agent: {toolUse.description}</Text>
      </Box>
      
      {/* 消息列表 */}
      <Box flexDirection="column" paddingLeft={1}>
        {!expanded && hiddenCount > 0 && (
          <Text color="gray" dimColor>
            +{hiddenCount} more tool uses
          </Text>
        )}
        
        {visibleMessages.map((msg, idx) => (
          <NestedAgentMessage key={idx} message={msg} />
        ))}
      </Box>
      
      {/* 状态栏 */}
      <Box>
        <Text color="yellow">
          │  In progress... · {stats.toolCalls} tool uses · {stats.tokens} tokens
        </Text>
      </Box>
      
      <Box>
        <Text color="cyan">╰─────────────────────────────</Text>
        <Text color="gray" dimColor> (ctrl+o to {expanded ? 'collapse' : 'expand'})</Text>
      </Box>
    </Box>
  );
}
```

**2. 已完成 (Done) - `renderToolResultMessage`**

当 SubAgent 执行完成后：

```typescript
// 完成结果渲染组件
function SubAgentCompleted({
  toolUse,
  toolResult,
  agentMessages,
}: {
  toolUse: ToolUsePart;
  toolResult: ToolResultPart;
  agentMessages: NormalizedMessage[];
}) {
  const [expanded, setExpanded] = React.useState(false);
  
  // 统计信息（同上）
  const stats = React.useMemo(() => { /* ... */ }, [agentMessages]);
  
  // 提取最终响应文本
  const finalResponse = React.useMemo(() => {
    const lastAssistant = [...agentMessages]
      .reverse()
      .find(msg => msg.role === 'assistant' && typeof msg.content === 'string');
    
    if (lastAssistant) {
      return (lastAssistant as AssistantMessage).text;
    }
    return null;
  }, [agentMessages]);
  
  return (
    <Box flexDirection="column">
      {/* 折叠状态：只显示摘要 */}
      {!expanded && (
        <Box>
          <Text color="green">✓</Text>
          <Text color={UI_COLORS.TOOL} bold> {toolUse.description}</Text>
          <Text color="gray" dimColor>
            {' '}({stats.toolCalls} tool uses · {stats.tokens} tokens · {toolResult.duration}ms)
          </Text>
          <Text color="gray" onClick={() => setExpanded(true)}>
            {' '}▶ Show details
          </Text>
        </Box>
      )}
      
      {/* 展开状态：显示详细内容 */}
      {expanded && (
        <Box flexDirection="column" borderStyle="round" borderColor="green">
          <Box>
            <Text color="green" bold>
              ╭─ Done: {toolUse.description}
            </Text>
            <Text color="gray" dimColor>
              {' '}({stats.toolCalls} tool uses · {stats.tokens} tokens · {toolResult.duration}ms)
            </Text>
          </Box>
          
          {/* 工具调用历史 */}
          <Box flexDirection="column" paddingLeft={1}>
            {agentMessages.map((msg, idx) => (
              <NestedAgentMessage key={idx} message={msg} />
            ))}
          </Box>
          
          {/* 最终响应 */}
          {finalResponse && (
            <Box flexDirection="column" paddingLeft={1} marginTop={1}>
              <Text color="cyan">Response:</Text>
              <Markdown content={finalResponse} />
            </Box>
          )}
          
          <Box>
            <Text color="green">╰─────────────────────────────</Text>
            <Text color="gray" onClick={() => setExpanded(false)}>
              {' '}▼ Hide details
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
```

**3. 后台运行 (Backgrounded) - 未来扩展**

当 SubAgent 被转入后台时：

```typescript
function SubAgentBackgrounded({ toolUse }: { toolUse: ToolUsePart }) {
  return (
    <Box>
      <Text color="blue">↓</Text>
      <Text color={UI_COLORS.MUTED}>
        {' '}Backgrounded agent: {toolUse.description}
      </Text>
      <Text color="gray" dimColor>
        {' '}(↓ to manage)
      </Text>
    </Box>
  );
}
```

#### 并行 SubAgent 渲染 - `renderGroupedToolUse`

当同时启动多个 SubAgent 时，使用树状结构渲染：

```typescript
function ParallelSubAgents({ 
  toolUses, 
  results 
}: { 
  toolUses: ToolUsePart[]; 
  results: Map<string, ToolResultPart>;
}) {
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>Parallel Agents:</Text>
      {toolUses.map((toolUse, idx) => {
        const isLast = idx === toolUses.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const result = results.get(toolUse.id);
        const status = result 
          ? (result.isError ? 'Failed' : 'Done')
          : 'Running';
        const color = status === 'Done' ? 'green' : status === 'Failed' ? 'red' : 'yellow';
        
        return (
          <Box key={toolUse.id}>
            <Text color="gray">{prefix} </Text>
            <Text color={color}>{status}</Text>
            <Text> {toolUse.description}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
```

渲染效果：
```
Parallel Agents:
├─ Done code-reviewer (审查代码)
├─ Running test-runner (执行测试)
└─ Done documenter (生成文档)
```

#### 嵌套消息渲染组件

```typescript
function NestedAgentMessage({ message }: { message: NormalizedMessage }) {
  if (message.role === 'user') {
    return (
      <Box paddingLeft={1}>
        <Text color="blue">User: </Text>
        <Text>{typeof message.content === 'string' ? message.content : '...'}</Text>
      </Box>
    );
  }
  
  if (message.role === 'assistant') {
    const assistantMsg = message as AssistantMessage;
    
    // 文本响应
    if (typeof assistantMsg.content === 'string') {
      return (
        <Box paddingLeft={1}>
          <Text color="white">Assistant: </Text>
          <Text>{assistantMsg.content}</Text>
        </Box>
      );
    }
    
    // 工具调用
    const toolUses = assistantMsg.content.filter(p => p.type === 'tool_use') as ToolUsePart[];
    const textParts = assistantMsg.content.filter(p => p.type === 'text') as TextPart[];
    
    return (
      <Box flexDirection="column" paddingLeft={1}>
        {textParts.map((part, idx) => (
          <Box key={`text-${idx}`}>
            <Text color="white">Assistant: </Text>
            <Text>{part.text}</Text>
          </Box>
        ))}
        {toolUses.map((toolUse, idx) => (
          <Box key={`tool-${idx}`}>
            <Text color="cyan">Assistant: ↳ </Text>
            <Text color={UI_COLORS.TOOL}>{toolUse.displayName || toolUse.name}</Text>
            {toolUse.description && (
              <Text color="gray" dimColor> ({toolUse.description})</Text>
            )}
          </Box>
        ))}
      </Box>
    );
  }
  
  if (message.role === 'tool') {
    return (
      <Box paddingLeft={1}>
        <Text color="green">Tool: ✓ </Text>
        <Text color={UI_COLORS.TOOL_RESULT}>Tool results</Text>
      </Box>
    );
  }
  
  return null;
}
```

#### 主 ToolUse 组件集成

```typescript
function ToolUse({ pair, allMessages }: { 
  pair: ToolPair; 
  allMessages: NormalizedMessage[];
}) {
  const { toolUse, toolResult } = pair;
  const { agentMessagesCache, loadAgentMessages } = useAppStore();
  
  // 如果是 Task tool，使用特殊渲染
  if (toolUse.name === TOOL_NAMES.TASK) {
    const agentId = toolResult?.agentId;
    const agentMessages = agentId ? agentMessagesCache[agentId] : undefined;
    
    // 加载 agent messages（如果未加载）
    React.useEffect(() => {
      if (agentId && !agentMessages) {
        loadAgentMessages(agentId);
      }
    }, [agentId]);
    
    // 进行中
    if (!toolResult && agentMessages) {
      return (
        <SubAgentProgress 
          toolUse={toolUse} 
          agentMessages={agentMessages}
          isVerbose={false}
        />
      );
    }
    
    // 已完成
    if (toolResult && agentMessages) {
      return (
        <SubAgentCompleted
          toolUse={toolUse}
          toolResult={toolResult}
          agentMessages={agentMessages}
        />
      );
    }
    
    // 加载中
    return (
      <Box>
        <Text color="gray">Loading agent messages...</Text>
      </Box>
    );
  }
  
  // 其他工具的正常渲染
  return <NormalToolUse toolUse={toolUse} toolResult={toolResult} />;
}
```

#### 快捷键支持

```typescript
// 在 App.tsx 或 TextInput 中添加全局快捷键
function useSubAgentHotkeys() {
  const { input } = useInput((input, key) => {
    // ctrl+o: 切换展开/折叠
    if (key.ctrl && input === 'o') {
      // 触发最近的 SubAgent 组件的 toggle
      // 可以通过 context 或 store 实现
      toggleNearestSubAgent();
    }
  });
}
```

#### 性能优化策略

**1. 智能截断**
```typescript
const VISIBLE_LIMIT = 3; // 默认只显示最后 3 条
const MAX_MESSAGES_BEFORE_VIRTUALIZE = 50; // 超过 50 条启用虚拟滚动
```

**2. 按需渲染**
```typescript
// 只渲染可见区域的消息
{isExpanded && agentMessages.length > MAX_MESSAGES_BEFORE_VIRTUALIZE ? (
  <VirtualizedMessageList messages={agentMessages} />
) : (
  agentMessages.map(msg => <NestedAgentMessage message={msg} />)
)}
```

**3. 缓存计算**
```typescript
// 使用 useMemo 缓存统计信息
const stats = React.useMemo(() => calculateStats(agentMessages), [agentMessages]);
```

## 实现步骤

### Phase 1: 核心隔离机制（P0）

- [ ] **Step 1.1**: 修改 `src/paths.ts`
  - 添加 `getAgentLogPath(agentId: string): string`
  - 添加 `getAllAgentSessions(): Array<{ agentId, path, mtime }>`
  
- [ ] **Step 1.2**: 扩展类型定义
  - 修改 `src/tool.ts` 扩展 `ToolResult` 添加 `metadata` 字段
  - 修改 `src/message.ts` 扩展 `ToolResultPart` 添加 `agentId` 和 `agentType` 字段
  
- [ ] **Step 1.3**: 修改 `src/agent/executor.ts`
  - 生成 8 位 agentId (`randomUUID().slice(0, 8)`)
  - 创建独立的 JsonlLogger 写入 `agent-{agentId}.jsonl`
  - 在 `onMessage` 回调中写入独立 log 文件
  - **不包含实时回调**（留到 Phase 2）
  
- [ ] **Step 1.4**: 修改 `src/tools/task.ts`
  - 返回 `metadata: { agentId, agentType }` 在 ToolResult 中
  
- [ ] **Step 1.5**: 修改 `src/loop.ts`
  - 保存 tool result 时提升 `agentId` 到 `ToolResultPart` 层级
  
- [ ] **测试**: 验证 sub-agent 消息写入独立文件，不进入主 agent 上下文

---

### Phase 2: 实时进度机制（P0）⭐ **核心功能**

- [ ] **Step 2.1**: 定义类型
  - 在 `src/agent/types.ts` 添加 `AgentProgressData` 类型
  - 扩展 `AgentExecuteOptions` 添加 `onProgress` 回调字段
  
- [ ] **Step 2.2**: 修改 `src/agent/executor.ts`
  - 接受 `onProgress` 参数
  - 在 `onMessage` 回调中调用 `onProgress(message, agentId)`
  - 添加错误处理（try-catch 包裹 onProgress 调用）
  
- [ ] **Step 2.3**: 修改 `src/agent/index.ts` (AgentManager)
  - `executeTask` 方法接受 `onProgress` 参数
  - 传递给 `executeAgent`
  
- [ ] **Step 2.4**: 修改 `src/tools/task.ts`
  - `createTaskTool` 接受 `onProgress` 参数
  - 在 `execute` 方法中构造进度数据包
  - 调用传入的 `onProgress` 回调（包含 toolUseID）
  
- [ ] **Step 2.5**: 修改 `src/loop.ts`
  - 为 Task tool 注入 `onProgress` 回调
  - 回调内部调用 `messageBus.emitEvent('agent_progress', ...)`
  - 添加 MessageBus 连接检查（降级处理）
  
- [ ] **Step 2.6**: 修改 `src/ui/store.ts`
  - 添加 `agentProgressMap: Record<string, AgentProgressState>` 状态
  - 添加 `updateAgentProgress()` 方法
  - 添加 `clearAgentProgress()` 方法
  - 在 `initialize` 中监听 `bridge.onEvent('agent_progress')`
  
- [ ] **测试**: 
  - 启动 SubAgent 后立即在 UI 看到 "Starting agent..."
  - SubAgent 执行过程中实时更新消息列表
  - 统计信息（tool calls、tokens）动态增加

---

### Phase 3: 数据访问层（P1）

- [ ] **Step 3.1**: 修改 `src/nodeBridge.ts` 添加 RPC handlers
  - `agent.getMessages(cwd, agentId)` - 读取 agent session 历史
  - `agent.listSessions(cwd)` - 列出所有 agent sessions
  - `agent.deleteSession(cwd, agentId)` - 清理 agent session（可选）
  
- [ ] **测试**: 
  - 通过 RPC 正确读取 agent session
  - 返回的消息包含完整的 metadata

---

### Phase 4: UI 展示层（P1）

- [ ] **Step 4.1**: 修改 `src/ui/Messages.tsx`
  - 实现 `SubAgentProgress` 组件（进行中状态）
    - 从 `agentProgressMap[toolUse.id]` 获取实时数据
    - 智能截断（默认显示最后 3 条）
    - 统计信息（tool calls、tokens）
    - 支持展开/折叠
  - 实现 `SubAgentCompleted` 组件（完成状态）
    - 折叠时显示摘要
    - 展开时显示完整历史
  - 实现 `ParallelSubAgents` 组件（并行状态）
    - 树状符号（├─ └─）
    - 状态颜色（Running=黄色、Done=绿色、Failed=红色）
  - 实现 `NestedAgentMessage` 组件（嵌套消息）
    - 支持 user、assistant、tool 三种消息类型
    - 适配 SubAgent 的消息格式
  - 修改 `ToolUse` 组件
    - 识别 Task tool (`toolUse.name === TOOL_NAMES.TASK`)
    - 根据 `toolResult` 是否存在路由到对应组件
    - 进行中 → `SubAgentProgress`
    - 已完成 → `SubAgentCompleted`
  
- [ ] **Step 4.2**: 添加 `src/ui/constants.ts`
  - `VISIBLE_LIMIT = 3`（折叠时显示的消息数）
  - `MAX_MESSAGES_BEFORE_VIRTUALIZE = 50`（虚拟滚动阈值）
  
- [ ] **测试**: 
  - 进行中状态：实时更新、统计正确、截断生效
  - 完成状态：正确显示摘要和最终响应
  - 并行状态：树状结构清晰，状态颜色正确

---

### Phase 5: 优化与完善（P2）


- [ ] **Step 5.1**: 快捷键支持
  - 在 `App.tsx` 或 `TextInput` 中添加全局监听
  - `ctrl+o`: 切换当前 SubAgent 的展开/折叠
  - 通过 context 或 store 传递切换信号
  
- [ ] **Step 5.2**: 样式美化
  - 使用 Box 组件的 `borderStyle="round"` 绘制边框
  - 使用树状符号 `├─`、`└─` 渲染并行 agent
  - 根据状态使用不同颜色（进行中=黄色、完成=绿色、失败=红色）
  - 添加动画效果（可选，如 spinner）
  
- [ ] **Step 5.3**: 统计信息优化
  - 使用 `useMemo` 缓存计算结果
  - 显示 tokens、duration、tool calls 统计
  - 显示执行进度百分比（可选）
  
- [ ] **Step 5.4**: 虚拟滚动优化
  - 当消息超过 50 条时启用虚拟列表
  - 使用 `react-window` 或 Ink 的虚拟滚动方案
  - 优化滚动性能
  
- [ ] **Step 5.5**: 事件节流（可选）
  - 在 `loop.ts` 中添加节流逻辑
  - 每 100ms 最多发送一次进度事件
  - 避免高频消息导致的性能问题
  
- [ ] **Step 5.6**: 后台运行支持（未来）
  - 实现 `SubAgentBackgrounded` 组件
  - 支持将长时间运行的 agent 转入后台
  - 提供后台任务管理界面
  
- [ ] **Step 5.7**: 递归支持
  - Sub-agent 调用 sub-agent（嵌套 Task）
  - 多层级的树状渲染
  - 每层都有独立的进度跟踪
  
- [ ] **测试**:
  - 快捷键响应正确
  - 样式美观，状态颜色准确
  - 虚拟滚动在大量消息时生效
  - 统计信息准确且性能良好

---

### Phase 6: 集成测试与文档（P2）

- [ ] **Step 6.1**: 端到端测试
  - 测试本地模式（DirectTransport）
  - 测试 Server 模式（WebSocketTransport）
  - 测试并发多个 SubAgent
  - 测试嵌套 SubAgent（递归）
  
- [ ] **Step 6.2**: 性能测试
  - 测试大量消息时的性能（>100 条）
  - 测试快速产生消息时的事件处理
  - 测试内存占用（长时间运行）
  
- [ ] **Step 6.3**: 错误场景测试
  - MessageBus 断开连接时的降级
  - onProgress 回调抛出异常
  - UI 层更新失败的容错
  
- [ ] **Step 6.4**: 用户文档
  - 更新用户手册，说明 SubAgent 进度展示功能
  - 添加 GIF 演示图
  - 说明快捷键和交互方式
  
- [ ] **Step 6.5**: 开发者文档
  - 更新架构文档，说明实时进度机制
  - 添加序列图和数据流图
  - 提供扩展指南（如何为其他工具添加进度支持）


## 关键技术要点

### 1. AgentID 生成

```typescript
const agentId = randomUUID().slice(0, 8);  // 例如: "a1b2c3d4"
```

### 2. 上下文隔离验证

**主 agent 的 history 应该只包含:**
- User 消息
- Assistant 消息（含 `tool_use: Task`）
- Tool 消息（含 `tool_result`，metadata 有 agentId）
- Assistant 最终响应

**不应该包含:**
- ❌ Sub-agent 的任何 `tool_use`
- ❌ Sub-agent 的任何 `tool_result`
- ❌ Sub-agent 的任何 assistant 消息

### 3. Metadata 传递链

```
ToolResult.metadata.agentId 
  → loop.ts 保存时提升
    → ToolResultPart.agentId
      → UI 读取 agentId
        → RPC: agent.getMessages(agentId)
          → 渲染 sub-agent 消息
```

### 4. 性能考虑

- **按需加载**: 只在展开时加载 agent messages
- **缓存机制**: `agentMessagesCache` 避免重复加载
- **虚拟滚动**: 大量消息时使用虚拟列表（Phase 4）

### 5. 扩展性

支持递归 sub-agent:
- Sub-agent 可以再调用 Task tool
- 嵌套渲染多层 agent
- 每层都有独立的 `agent-{agentId}.jsonl`

## 总结

本设计通过**独立会话隔离 + 实时进度回调**的方式，彻底解决了 sub-agent 上下文污染问题，同时实现了用户友好的实时进度展示。核心优势：

### 架构优势

1. ✅ **完全隔离**: Sub-agent 消息不影响主 agent 的 LLM 上下文
2. ✅ **统一架构**: 复用现有的 session、message、jsonl logger 机制
3. ✅ **实时反馈**: onProgress 回调 + MessageBus 事件驱动实现毫秒级更新
4. ✅ **跨端支持**: 透明支持本地模式和 Server 模式，无需修改 MessageBus 核心
5. ✅ **按需加载**: 性能友好，实时数据在内存，历史数据按需从磁盘加载
6. ✅ **可扩展**: 支持递归 sub-agent、清理、导出等功能
7. ✅ **易于调试**: 每个 agent 有独立的日志文件，便于排查问题

### UI 设计亮点

**1. 层级化渲染**
- SubAgent 作为嵌套块，不是独立消息
- 清晰的视觉边界（圆角边框）
- 树状符号表示并行关系

**2. 智能截断**
- 默认只显示最后 N 条，避免刷屏
- "+N more tool uses" 提示隐藏内容
- `ctrl+o` 快速切换展开/折叠

**3. 实时反馈**
- 进行中状态：动态更新统计栏（tool calls、tokens）
- 完成状态：显示摘要和最终响应
- 后台状态：压缩显示，不占空间

**4. 性能优化**
- 实时数据：存储在 appStore，避免频繁 I/O
- 按需加载：展开完成的 SubAgent 时才请求历史数据
- 缓存机制：避免重复请求
- 虚拟滚动：大量消息时启用

### 实时进度机制亮点

**1. 事件驱动模型**
```
SubAgent 产生消息 → onProgress 回调 → MessageBus 事件 → UI 更新
```
- 延迟极低（本地模式 < 10ms）
- 支持跨端场景
- 统一的 API 接口

**2. 数据流清晰**
- 消息持久化：写入 `agent-{agentId}.jsonl`
- 实时通知：通过 onProgress 回调
- 状态管理：appStore 按 toolUseID 索引
- UI 渲染：React 自动响应状态变化

**3. 错误容忍**
- onProgress 失败不影响 SubAgent 执行
- MessageBus 断开时降级为只写 log
- UI 更新失败时记录错误但不崩溃

**4. 可扩展性**
- 回调注入点在 `agentManager.executeTask`，影响范围小
- 未来可为其他工具（如 bash、fetch）添加类似机制
- 支持多层嵌套（SubAgent 调用 SubAgent）

### 实现复杂度评估

| Phase | 工作量 | 风险 | 依赖 |
|-------|--------|------|------|
| Phase 1: 核心隔离 | 中等（2-3天） | 低 | 无 |
| Phase 2: 实时进度 | 中等（3-4天） | **中** | Phase 1 |
| Phase 3: 数据访问 | 低（1天） | 低 | Phase 1 |
| Phase 4: UI 展示 | 高（4-5天） | 中 | Phase 2, 3 |
| Phase 5: 优化完善 | 中等（2-3天） | 低 | Phase 4 |
| Phase 6: 测试文档 | 中等（2-3天） | 低 | All |

**总计**: 约 14-21 天（单人全职开发）

**关键风险点**:
- Phase 2 的回调链路较长，需要仔细测试跨端场景
- Phase 4 的 UI 组件较多，需要确保渲染性能
- MessageBus 事件频率控制（可能需要节流）

### 技术债务

**已知限制**:
1. 实时进度数据不持久化（重启后丢失，但可从 log 恢复）
2. 暂不支持暂停/恢复 SubAgent
3. 虚拟滚动在 Ink 中实现较复杂（Phase 5）

**未来改进**:
1. 支持 SubAgent 的中断和恢复
2. 支持进度持久化到 session config
3. 支持实时编辑 SubAgent 的 prompt
4. 支持进度数据的流式导出（用于调试）

---

### 与现有架构的兼容性

设计遵循了项目现有的架构模式：

✅ **MessageBus 事件机制**: 复用 `emitEvent` / `onEvent`，无需新增 transport 逻辑  
✅ **NodeBridge RPC**: 复用 `registerHandler` / `request` 模式  
✅ **Zustand Store**: 按照现有模式添加状态和 actions  
✅ **Ink 组件**: 沿用 Box、Text、useMemo 等惯用法  
✅ **JsonlLogger**: 复用独立文件隔离模式  

修改点集中且清晰，实现复杂度可控。UI 设计参考了 Claude Code 的最佳实践，提供了流畅的用户体验。

